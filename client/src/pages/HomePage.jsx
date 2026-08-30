import { Link } from 'react-router-dom';

const STATS = [
  { value: '12,000+', label: 'Students enrolled' },
  { value: '80+', label: 'Academic programs' },
  { value: '95%', label: 'Graduate employment' },
  { value: '40+', label: 'Partner institutions' },
];

const PILLARS = [
  {
    icon: '📚',
    title: 'Quality teaching',
    text: 'Learn from experienced faculty using modern, student-centred methods.',
  },
  {
    icon: '🔬',
    title: 'Research & innovation',
    text: 'Explore labs, projects, and partnerships that prepare you for the future.',
  },
  {
    icon: '🌍',
    title: 'Global community',
    text: 'Join a diverse campus with international exchange and career support.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">NexGen University</p>
            <h1>Building tomorrow&apos;s leaders through education</h1>
            <p className="hero-text">
              A modern university focused on academic excellence, practical learning,
              and student success — from your first lecture to your first career step.
            </p>
            <div className="hero-actions">
              <Link to="/apply" className="btn btn-secondary">
                Apply Now
              </Link>
              <Link to="/about" className="btn btn-secondary">
                About Us
              </Link>
              <Link to="/login" className="btn btn-outline">
                Login
              </Link>
            </div>
          </div>

          <div className="hero-panel">
            <img src="/logo.png" alt="" className="hero-logo" aria-hidden="true" />
            <p className="hero-panel-title">Your journey starts here</p>
            <ul className="hero-list">
              <li>Undergraduate &amp; postgraduate degrees</li>
              <li>Flexible online and on-campus study</li>
              <li>Scholarships and student support services</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="stats-bar">
        <div className="container stats-grid">
          {STATS.map((stat) => (
            <div key={stat.label} className="stat-item">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Why study with us</p>
            <h2>An education experience designed for you</h2>
          </div>
          <div className="pillars-grid">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="pillar-card">
                <span className="pillar-icon" aria-hidden="true">
                  {pillar.icon}
                </span>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block section-alt">
        <div className="container features-grid">
          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              ℹ️
            </span>
            <h2>About Us</h2>
            <p>
              Discover our history, values, campus facilities, and the academic
              community that makes NexGen University home for thousands of students.
            </p>
            <Link to="/about" className="card-link">
              Learn more →
            </Link>
          </article>

          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              📝
            </span>
            <h2>Apply Now</h2>
            <p>
              Submit your application for undergraduate, postgraduate, or research
              programs. Our admissions team guides you every step of the way.
            </p>
            <Link to="/apply" className="card-link">
              Start application →
            </Link>
          </article>

          <article className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              🔐
            </span>
            <h2>Log in</h2>
            <p>
              Access course materials, timetables, grades, and campus services through
              the NexGen student portal.
            </p>
            <Link to="/login" className="card-link">
              Sign in →
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
