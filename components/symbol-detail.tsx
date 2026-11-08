'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import clsx from 'clsx'
import { changeOf, formatPrice, formatSigned, type Ticker } from '@/lib/market'

export function SymbolDetail({ ticker }: { ticker: Ticker }) {
  const { change, percent } = changeOf(ticker)
  const up = change >= 0
  const color = up ? 'var(--gain)' : 'var(--loss)'
  const data = ticker.history.map((price, i) => ({ day: i - ticker.history.length + 1, price }))
  const high = Math.max(...ticker.history)
  const low = Math.min(...ticker.history)

  return (
    <section aria-labelledby="detail-heading" className="flex flex-col gap-6 rounded-lg border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            {ticker.sector} · <span className="font-mono">{ticker.symbol}</span>
          </p>
          <h1 id="detail-heading" className="text-2xl font-semibold text-balance md:text-3xl">
            {ticker.name}
          </h1>
        </div>
        <div className="flex flex-col items-end font-mono tabular">
          <span className="text-3xl font-medium">${formatPrice(ticker.price)}</span>
          <span className={clsx('text-sm', up ? 'text-gain' : 'text-loss')}>
            {formatSigned(change)} ({formatSigned(percent)}%) today
          </span>
        </div>
      </div>

      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
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
              labelFormatter={(d) => (Number(d) === 0 ? 'Today' : `${Math.abs(Number(d))}d ago`)}
              formatter={(v) => [`$${formatPrice(Number(v))}`, 'Close']}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill="url(#fill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t pt-4 font-mono text-sm tabular md:grid-cols-4">
        {[
          ['Prev close', formatPrice(ticker.previousClose)],
          ['60d high', formatPrice(high)],
          ['60d low', formatPrice(low)],
          ['60d range', `${(((high - low) / low) * 100).toFixed(1)}%`],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="font-sans text-xs text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
