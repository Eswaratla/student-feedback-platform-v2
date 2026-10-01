import { useState } from 'react';
import { api } from '../api';

function showText(value) {
  if (value == null) return 'Not specified';
  const text = String(value).trim();
  if (!text || text === 'undefined' || text === 'null') return 'Not specified';
  return text;
}

function showRating(value) {
  return value == null || value === '' ? 'Not specified' : showText(value);
}

function ThemeList({ items, empty }) {
  if (!items?.length) return <p>{empty}</p>;
  return (
    <ul className="ai-insights-list">
      {items.map((item) => (
        <li key={`${item.name}-${item.count}`}>
          <strong>{showText(item.name)}</strong>
          {' — '}
          {item.count} {item.count === 1 ? 'response' : 'responses'}
          {item.explanation ? `. ${showText(item.explanation)}` : ''}
        </li>
      ))}
    </ul>
  );
}

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

  const rating = insights?.ratingAnalysis;
  const written = insights?.writtenFeedbackAnalysis;

  return (
    <section className="portal-card ai-insights-card">
      <div className="portal-section-header">
        <div>
          <h3>AI insights</h3>
          <p className="portal-meta">
            Themes, rating patterns, and recommended actions from the stored written feedback.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={generateInsights} disabled={loading}>
          {loading ? 'Analysing…' : insights ? 'Refresh insights' : 'Generate insights'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {!insights && !loading && !error && (
        <p className="portal-empty-text">
          Click generate to summarise the feedback stored in the database.
        </p>
      )}

      {insights && (
        <div className="ai-insights-grid">
          <article className="ai-insights-block ai-insights-summary">
            <h4>Overall AI summary</h4>
            <p>{showText(insights.summary)}</p>
          </article>

          <article className="ai-insights-block">
            <h4>Key themes</h4>
            <ThemeList items={insights.themes} empty="Not enough written feedback to identify a theme." />
          </article>

          <article className="ai-insights-block">
            <h4>Theme frequency</h4>
            {insights.themeFrequency?.length ? (
              <table className="ai-insights-table">
                <thead>
                  <tr>
                    <th>Theme</th>
                    <th>Responses</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.themeFrequency.map((theme) => (
                    <tr key={theme.name}>
                      <td>{showText(theme.name)}</td>
                      <td>{theme.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Not enough written feedback to identify a theme.</p>
            )}
          </article>

          <article className="ai-insights-block">
            <h4>Positive feedback</h4>
            <ThemeList items={insights.positiveFeedback} empty="No recurring positive topic was found in the written responses." />
          </article>

          <article className="ai-insights-block">
            <h4>Areas for improvement</h4>
            <ThemeList items={insights.areasForImprovement} empty="No recurring concern was found in the written responses." />
          </article>

          <article className="ai-insights-block">
            <h4>Recommended actions</h4>
            <ul className="ai-insights-list">
              {(insights.recommendations || []).map((item) => (
                <li key={item}>{showText(item)}</li>
              ))}
            </ul>
          </article>

          <article className="ai-insights-block ai-insights-departments">
            <h4>Department / program insights</h4>
            <div className="ai-insights-highlights">
              {(insights.departmentInsights || []).map((item) => (
                <div key={item.name} className="ai-insights-highlight">
                  <strong>{showText(item.name)}</strong>
                  <span>
                    {`${item.responseCount} responses · average rating ${showRating(item.averageRating)}`}
                  </span>
                  <span>{showText(item.insight)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="ai-insights-block">
            <h4>Rating analysis</h4>
            <p>
              {rating?.averageRating == null
                ? 'No rating answers are available.'
                : `Average rating ${showRating(rating.averageRating)} out of 5 from ${rating.responseCount} rating answers.`}
            </p>
            <table className="ai-insights-table">
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Responses</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {(rating?.distribution || []).map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.count}</td>
                    <td>{row.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="ai-insights-block">
            <h4>Written feedback analysis</h4>
            <p>{`${written?.totalWritten || 0} written responses.`} </p>
            <ThemeList
              items={written?.themes}
              empty="Not enough written feedback to identify a theme."
            />
          </article>

          <p className="portal-meta ai-insights-provider">
            Generated {new Date(insights.generatedAt).toLocaleString()} · {showText(insights.provider)}
          </p>
        </div>
      )}
    </section>
  );
}
