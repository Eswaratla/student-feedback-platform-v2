function formatDayLabel(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString('en-AU', { weekday: 'short' });
}

export default function ResponseTrendChart({ data = [] }) {
  const width = 520;
  const height = 180;
  const padding = { top: 18, right: 18, bottom: 36, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxCount = Math.max(...data.map((point) => point.count), 1);

  const points = data.map((point, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - (point.count / maxCount) * chartHeight;
    return { ...point, x, y, label: formatDayLabel(point.date) };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];

  return (
    <div className="response-trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Response trend for the last 7 days">
        <defs>
          <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(30, 58, 138, 0.22)" />
            <stop offset="100%" stopColor="rgba(30, 58, 138, 0.02)" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = padding.top + chartHeight - (tick / maxCount) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                className="response-trend-grid-line"
              />
              <text x={padding.left - 8} y={y + 4} className="response-trend-axis-label">
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#trendAreaFill)" />
        <path d={linePath} className="response-trend-line" fill="none" />

        {points.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="4.5" className="response-trend-point" />
            <text x={point.x} y={height - 10} className="response-trend-day-label">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
