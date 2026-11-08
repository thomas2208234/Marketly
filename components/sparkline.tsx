type SparklineProps = {
  values: number[]
  positive: boolean
  baseline?: number
  width?: number
  height?: number
}

export function Sparkline({ values, positive, baseline, width = 64, height = 24 }: SparklineProps) {
  const bounds = baseline === undefined ? values : [...values, baseline]
  const min = Math.min(...bounds)
  const max = Math.max(...bounds)
  const range = max - min || 1
  const step = width / Math.max(values.length - 1, 1)
  const yOf = (v: number) => height - ((v - min) / range) * (height - 2) - 1
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={positive ? 'text-gain' : 'text-loss'}
    >
      {baseline !== undefined && (
        <line
          x1={0}
          x2={width}
          y1={yOf(baseline)}
          y2={yOf(baseline)}
          className="stroke-muted-foreground/50"
          strokeWidth={1}
          strokeDasharray="1.5 2.5"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
