'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPrice } from '@/lib/market'

type Point = { date: string; close: number }

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function StockPriceChart({ points, up, label }: { points: Point[]; up: boolean; label: string }) {
  const color = up ? 'var(--gain)' : 'var(--loss)'

  return (
    <figure className="h-64 md:h-80" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="stock-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tickFormatter={shortDate}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          />
          <YAxis
            domain={['auto', 'auto']}
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
            labelFormatter={(d) => shortDate(String(d))}
            formatter={(v) => [`$${formatPrice(Number(v))}`, 'Close']}
          />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#stock-fill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  )
}
