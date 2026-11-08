'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import clsx from 'clsx'
import { formatPrice, formatSigned } from '@/lib/market'

export type PricePoint = { date: string; close: number }

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function BuzzChart({ symbol, points }: { symbol: string; points?: PricePoint[] }) {
  if (!points) {
    return <div className="h-32 animate-pulse rounded-md bg-muted" aria-label={`Loading ${symbol} chart`} />
  }
  if (points.length < 2) {
    return (
      <p className="flex h-32 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
        No price history for {symbol}
      </p>
    )
  }

  const first = points[0].close
  const last = points[points.length - 1].close
  const percent = ((last - first) / first) * 100
  const up = percent >= 0
  const color = up ? 'var(--gain)' : 'var(--loss)'
  const gradientId = `buzz-fill-${symbol}`

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{points.length}-day price</span>
        <span className={clsx('font-mono tabular', up ? 'text-gain' : 'text-loss')}>
          {formatSigned(percent)}%
        </span>
      </figcaption>
      <div
        className="h-32"
        role="img"
        aria-label={`${symbol} closed at $${formatPrice(last)}, ${formatSigned(percent)}% over ${points.length} trading days`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis
              domain={['auto', 'auto']}
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={44}
              tickCount={3}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
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
            <Area
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
