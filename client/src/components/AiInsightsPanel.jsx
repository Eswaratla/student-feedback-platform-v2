import { useState } from 'react';
import { api } from '../api';

export default function AiInsightsPanel() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generateInsights() {
    setLoading(true);
    setError('');

    try {
      setInsights(await api.getAiInsights());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="portal-card ai-insights-card">
      <div className="portal-section-header">
        <div>
          <h3>AI insights</h3>
          <p className="portal-meta">
            Analyse feedback trends, themes, and recommended actions for staff.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={generateInsights} disabled={loading}>
          {loading ? 'Analysing…' : insights ? 'Refresh insights' : 'Generate insights'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {!insights && !loading && !error && (
        <p className="portal-empty-text">
          Click generate to summarise university feedback with AI-powered recommendations.
        </p>
      )}

      {insights && (
        <div className="ai-insights-grid">
          <article className="ai-insights-block ai-insights-summary">
            <h4>Summary</h4>
            <p>{insights.summary}</p>
          </article>

          <article className="ai-insights-block">
            <h4>Key themes</h4>
            <ul className="ai-insights-list">
              {insights.themes.map((theme) => (
                <li key={theme}>{theme}</li>
              ))}
            </ul>
          </article>

          <article className="ai-insights-block">
            <h4>Recommended actions</h4>
            <ul className="ai-insights-list">
              {insights.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="ai-insights-block ai-insights-departments">
            <h4>Department highlights</h4>
            <div className="ai-insights-highlights">
              {insights.departmentHighlights.map((item) => (
                <div key={item.department} className="ai-insights-highlight">
                  <strong>{item.department}</strong>
                  <span>{item.note}</span>
                </div>
              ))}
            </div>
          </article>

          <p className="portal-meta ai-insights-provider">
            Generated {new Date(insights.generatedAt).toLocaleString()} · {insights.provider}
          </p>
        </div>
      )}
    </section>
  );
}
