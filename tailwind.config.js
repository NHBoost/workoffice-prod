const path = require('path')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    path.join(__dirname, 'pages/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'components/**/*.{js,ts,jsx,tsx,mdx}'),
    path.join(__dirname, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // Tokens sémantiques (mappés via CSS vars dans globals.css)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        'text-subtle': 'rgb(var(--text-subtle) / <alpha-value>)',

        // Couleurs identitaires (constantes, ne change pas selon le thème)
        ink: {
          50:  '#F0F2F8',
          100: '#D9DDED',
          200: '#B3BBDB',
          300: '#8C99C9',
          400: '#5C6CA6',
          500: '#36447D',
          600: '#1F2A55',
          700: '#0F1729',
          800: '#080D1A',
          900: '#04060F',
          DEFAULT: '#0F1729',
        },
        electric: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          DEFAULT: '#3B82F6',
        },
        gold: {
          50:  '#FBF8E9',
          100: '#F7F0CC',
          200: '#EFE099',
          300: '#E7D066',
          400: '#DFBF33',
          500: '#C9A227',
          600: '#A1801F',
          700: '#785F17',
          800: '#503F0F',
          900: '#282008',
          DEFAULT: '#C9A227',
        },

        // Couleur primary remappée sur la palette gold Prestigia
        // (toutes les classes bg-primary-*, text-primary-* etc. existantes
        //  utilisent désormais le doré officiel de la marque, plus de rouge.)
        primary: {
          50:  '#FBF8E9',
          100: '#F7F0CC',
          200: '#EFE099',
          300: '#E7D066',
          400: '#DFBF33',
          500: '#C9A227',
          600: '#A1801F',
          700: '#785F17',
          800: '#503F0F',
          900: '#282008',
          DEFAULT: '#C9A227',
        },

        // Status sémantique
        success: { DEFAULT: 'rgb(var(--success) / <alpha-value>)', soft: 'rgb(var(--success-soft) / <alpha-value>)' },
        warning: { DEFAULT: 'rgb(var(--warning) / <alpha-value>)', soft: 'rgb(var(--warning-soft) / <alpha-value>)' },
        danger:  { DEFAULT: 'rgb(var(--danger) / <alpha-value>)',  soft: 'rgb(var(--danger-soft) / <alpha-value>)'  },
        info:    { DEFAULT: 'rgb(var(--info) / <alpha-value>)',    soft: 'rgb(var(--info-soft) / <alpha-value>)'    },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        serif: ['var(--font-serif)', 'Georgia', 'Times New Roman', 'serif'],
        display: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      fontSize: {
        // Scale typographique premium
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],   // 11px
        xs:   ['0.75rem',   { lineHeight: '1.125rem' }],// 12px
        sm:   ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        base: ['0.875rem',  { lineHeight: '1.375rem' }],// 14px (UI default)
        md:   ['0.9375rem', { lineHeight: '1.5rem' }],  // 15px
        lg:   ['1rem',      { lineHeight: '1.5rem' }],  // 16px
        xl:   ['1.125rem',  { lineHeight: '1.75rem' }], // 18px
        '2xl': ['1.375rem', { lineHeight: '1.875rem' }],// 22px
        '3xl': ['1.75rem',  { lineHeight: '2.125rem' }],// 28px
        '4xl': ['2.25rem',  { lineHeight: '2.5rem' }],  // 36px
        '5xl': ['3rem',     { lineHeight: '3.25rem' }], // 48px
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter:  '-0.02em',
        tight:    '-0.01em',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        // 3 niveaux d'ombres soft, premium
        soft:        '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.05)',
        'soft-md':   '0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.05)',
        'soft-lg':   '0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.06)',
        'soft-xl':   '0 20px 25px -5px rgb(15 23 42 / 0.10), 0 8px 10px -6px rgb(15 23 42 / 0.08)',
        glow:        '0 0 0 1px rgb(59 130 246 / 0.10), 0 4px 12px rgb(59 130 246 / 0.15)',
        'glow-gold': '0 0 0 1px rgb(201 162 39 / 0.15), 0 4px 16px rgb(201 162 39 / 0.20)',
        'inner-soft':'inset 0 1px 2px rgb(15 23 42 / 0.05)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out',
        'slide-up':  'slideUp 0.4s ease-out',
        'slide-down':'slideDown 0.4s ease-out',
        'scale-in':  'scaleIn 0.2s ease-out',
        'shimmer':   'shimmer 2s linear infinite',
        'pulse-soft':'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:  { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown:{ '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:  { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseSoft:{ '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
