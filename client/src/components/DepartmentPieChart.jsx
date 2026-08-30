const DEPARTMENT_COLORS = {
  'Information Systems': '#1e3a8a',
  Business: '#b8860b',
  Medicine: '#0d9488',
};

const FALLBACK_COLORS = ['#1e3a8a', '#b8860b', '#0d9488'];

function buildConicGradient(segments) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) return 'conic-gradient(#e5e7eb 0deg 360deg)';

  let angle = 0;
  const stops = segments.map((segment, index) => {
    const slice = (segment.value / total) * 360;
    const start = angle;
    angle += slice;
    const color = segment.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    return `${color} ${start}deg ${angle}deg`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}

export default function DepartmentPieChart({ departments = [], centerLabel = '—' }) {
  const segments = departments.map((dept, index) => ({
    name: dept.name,
    value: dept.value ?? dept.responseCount ?? 0,
    color: DEPARTMENT_COLORS[dept.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));

  const totalResponses = segments.reduce((sum, segment) => sum + segment.value, 0);
  const gradient = buildConicGradient(segments);
  const description = totalResponses
    ? segments.map((segment) => `${segment.name}: ${segment.value} responses`).join(', ')
    : 'No responses yet';

  return (
    <div className="department-pie-chart">
      <div
        className="department-pie-chart-ring"
        style={{ background: gradient }}
        role="img"
        aria-label={`Responses by department. ${description}`}
      >
        <div className="department-pie-chart-center">
          <strong>{centerLabel}</strong>
        </div>
      </div>

      <ul className="department-pie-legend">
        {segments.map((segment) => (
          <li key={segment.name}>
            <span className="department-pie-swatch" style={{ background: segment.color }} aria-hidden="true" />
            <span className="department-pie-label">{segment.name}</span>
            <span className="department-pie-value">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
