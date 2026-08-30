import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <section className="page-section">
      <div className="container narrow">
        <p className="eyebrow">Who we are</p>
        <h1>About NexGen University</h1>
        <p className="page-intro">
          NexGen University is a modern institution dedicated to practical learning,
          research excellence, and preparing students for real-world challenges.
        </p>

        <div className="about-grid">
          <article className="info-block">
            <h2>Our mission</h2>
            <p>
              To provide accessible, high-quality education that blends academic
              rigour with hands-on experience, helping every student reach their full
              potential.
            </p>
          </article>

          <article className="info-block">
            <h2>What we offer</h2>
            <ul>
              <li>Undergraduate and postgraduate degrees</li>
              <li>Industry-linked research programs</li>
              <li>Modern campus facilities and student support</li>
              <li>Global partnerships and exchange opportunities</li>
            </ul>
          </article>

          <article className="info-block">
            <h2>Why NexGen?</h2>
            <p>
              We put students at the centre of everything we do — from flexible
              learning paths to career services that connect graduates with
              employers worldwide.
            </p>
          </article>
        </div>

        <div className="page-actions">
          <Link to="/apply" className="btn btn-primary">
            Apply Now
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}
