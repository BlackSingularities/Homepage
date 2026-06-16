const ITEMS = [
  'React', 'Python', 'FastAPI', 'Node.js', 'Docker',
  'Figma', 'Photoshop', 'Illustrator', 'TypeScript',
  'PostgreSQL', 'SQLite', 'Nginx', 'GitHub Actions',
  'Leaflet', 'GSAP', 'Tailwind CSS', 'REST API',
]

const Row = ({ reverse }) => {
  const items = reverse ? [...ITEMS].reverse() : ITEMS
  return (
    <div className={`marquee-track ${reverse ? 'marquee-reverse' : ''}`}>
      {[...items, ...items].map((item, i) => (
        <span key={i} className="marquee-item">
          <span className="marquee-dot" />
          {item}
        </span>
      ))}
    </div>
  )
}

export default function Marquee() {
  return (
    <div className="marquee-section">
      <div className="marquee-wrapper">
        <Row />
        <Row reverse />
      </div>
    </div>
  )
}
