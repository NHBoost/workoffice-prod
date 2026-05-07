'use client'

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueChartProps {
  data: { month: string; value: number }[]
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
        <XAxis dataKey="month" stroke="rgb(var(--text-subtle))" fontSize={11} axisLine={false} tickLine={false} />
        <YAxis stroke="rgb(var(--text-subtle))" fontSize={11} axisLine={false} tickLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
        <Tooltip
          contentStyle={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border))',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            fontSize: 12,
          }}
          formatter={(v: number) => [formatCurrency(v), 'Revenus']}
          cursor={{ stroke: '#C9A227', strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Area type="monotone" dataKey="value" stroke="#C9A227" strokeWidth={2.5} fill="url(#revenue-grad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
