import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { audit } from '@/lib/audit'
import { decrypt } from '@/lib/crypto'
import { renderHtmlToPdf, mergePdfs } from '@/lib/pdf'
import { uploadPdf, signedUrl as makeSignedUrl } from '@/lib/storage'
import { sendEmail, contractEmail } from '@/lib/email'
import { renderAllContractTemplates, clientToVariables } from '@/lib/contract-templates'
import { FORMULE_LABELS } from '@/lib/client-schemas'

// PDF generation is slow → request body cap and longer timeout
export const maxDuration = 60 // Vercel : 60s max sur Hobby

/**
 * POST /api/clients/[id]/contrat
 *
 * Genere le PDF du contrat (Contrat + CGV + RGPD concatenés),
 * upload sur Supabase Storage et envoie par email au client.
 *
 * Statut contrat passe à 'ENVOYE'.
 * Crée une nouvelle entrée ContratClient (historique multi-contrats).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await checkRateLimit(request, 'generate_contract', { max: 5, window: 60_000 })
  if (rl) return rl

  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { center: true },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    // Scope par centre pour MANAGER
    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      client.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Dechiffre les donnees sensibles UNIQUEMENT pour la generation
    const numeroCarteClair = decrypt(client.numeroCiEnc)
    const registreNationalClair = decrypt(client.registreNationalEnc)

    // Construit les variables et remplit les templates
    const variables = clientToVariables({
      client,
      center: client.center,
      numeroCarteClair,
      registreNationalClair,
    })

    const { contrat, cgv, rgpd, missing } = renderAllContractTemplates(variables)

    // Si des variables manquent dans les templates, on logge mais on continue
    // (le CDC dit "Aucune variable {{...}} non remplacée dans le PDF" → on signale)
    if (missing.length > 0) {
      console.warn('[contrat] Variables non remplies:', missing)
    }

    // Render les 3 documents en PDF + concatene
    const [pdfContrat, pdfCgv, pdfRgpd] = await Promise.all([
      renderHtmlToPdf(contrat),
      renderHtmlToPdf(cgv),
      renderHtmlToPdf(rgpd),
    ])
    const pdfFinal = await mergePdfs([pdfContrat, pdfCgv, pdfRgpd])

    // Cree l'entree ContratClient en BDD AVANT l'upload
    // (pour avoir l'ID dans le chemin du fichier)
    const contractRow = await prisma.contratClient.create({
      data: {
        clientId: client.id,
        type: client.formule,
        pdfPath: '__pending__', // remplace apres upload
        status: 'ENVOYE',
        variables: JSON.stringify(variables),
      },
    })

    const pdfPath = `clients/${client.id}/${contractRow.id}.pdf`

    try {
      await uploadPdf(pdfPath, pdfFinal)
    } catch (uploadErr: any) {
      // Si l'upload echoue, on supprime l'entree pour rester coherent
      await prisma.contratClient.delete({ where: { id: contractRow.id } })
      console.error('[contrat] upload failed:', uploadErr)
      return NextResponse.json(
        { error: `Upload PDF échoué : ${uploadErr.message ?? 'inconnu'}` },
        { status: 500 }
      )
    }

    // Mise a jour des chemins + statut client
    await prisma.$transaction([
      prisma.contratClient.update({
        where: { id: contractRow.id },
        data: { pdfPath },
      }),
      prisma.client.update({
        where: { id: client.id },
        data: { contratStatut: 'ENVOYE' },
      }),
    ])

    // Envoi de l'email avec PDF en piece jointe
    const emailTpl = contractEmail({
      prenom: client.prenom,
      societe: client.societeDenomination,
      formule: FORMULE_LABELS[client.formule as keyof typeof FORMULE_LABELS] ?? client.formule,
    })
    const emailResult = await sendEmail({
      to: client.emailPerso,
      subject: emailTpl.subject,
      html: emailTpl.html,
      text: emailTpl.text,
      attachments: [
        {
          filename: `Contrat-${client.societeDenomination.replace(/[^a-zA-Z0-9-_ ]/g, '')}-${contractRow.id.slice(0, 8)}.pdf`,
          content: pdfFinal,
        },
      ],
    })

    await audit('campaign.send', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'ContratClient',
      resourceId: contractRow.id,
      metadata: {
        clientId: client.id,
        formule: client.formule,
        pdfSize: pdfFinal.length,
        emailSent: emailResult.ok,
        missing,
      },
      request,
    })

    // Si l'email n'a pas pu partir, on renvoie une URL signee (1h) pour que
    // l'admin puisse telecharger le PDF et le transmettre manuellement.
    const emailFailedOrSkipped = !emailResult.ok || emailResult.id === 'dev-mode'
    let downloadUrl: string | null = null
    if (emailFailedOrSkipped) {
      try {
        downloadUrl = await makeSignedUrl(pdfPath, 3600)
      } catch (e) {
        console.error('[contrat] could not generate signed download URL', e)
      }
    }

    return NextResponse.json({
      ok: true,
      contractId: contractRow.id,
      pdfPath,
      emailSent: emailResult.ok && emailResult.id !== 'dev-mode',
      emailError: emailResult.error,
      missing,
      ...(downloadUrl && { downloadUrl }),
    })
  } catch (err: any) {
    console.error('[api/clients/[id]/contrat POST]', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate contract' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/clients/[id]/contrat
 * Liste les contrats d'un client + URLs signees pour download.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const contracts = await prisma.contratClient.findMany({
      where: { clientId: params.id },
      orderBy: { sentAt: 'desc' },
    })

    const enriched = await Promise.all(
      contracts.map(async c => {
        let url: string | null = null
        let urlSigne: string | null = null
        try {
          if (c.pdfPath && c.pdfPath !== '__pending__') {
            url = await makeSignedUrl(c.pdfPath, 3600)
          }
          if (c.pdfPathSigne) {
            urlSigne = await makeSignedUrl(c.pdfPathSigne, 3600)
          }
        } catch (e) {
          console.error('[contrat GET] sign url failed', e)
        }
        return {
          id: c.id,
          type: c.type,
          status: c.status,
          sentAt: c.sentAt,
          signedAt: c.signedAt,
          url,
          urlSigne,
        }
      })
    )

    return NextResponse.json({ contracts: enriched })
  } catch (err: any) {
    console.error('[api/clients/[id]/contrat GET]', err)
    return NextResponse.json({ error: 'Failed to list contracts' }, { status: 500 })
  }
}
