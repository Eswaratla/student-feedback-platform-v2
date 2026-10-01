import { useState } from 'react';
import { api } from '../api';

const GENERIC_THEME_NAMES = new Set(['would', 'help', 'week', 'before']);

function showText(value) {
  if (value == null || typeof value === 'object') return 'Not specified';
  const text = String(value).trim();
  if (!text || text === 'undefined' || text === 'null' || text === '[object Object]') return 'Not specified';
  return text;
}

function showCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return String(Number(value));
  return null;
}

function showPercent(value) {
  if (value == null || typeof value === 'object') return 'Not specified';
  const text = String(value).trim();
  if (!text || text === 'undefined' || text === 'null') return 'Not specified';
  if (text.endsWith('%')) return text;
  if (!Number.isFinite(Number(text))) return 'Not specified';
  return `${text}%`;
}

function showRating(value) {
  return value == null || value === '' ? 'Not specified' : showText(value);
}

function showGeneratedAt(value) {
  if (value == null || value === '') return 'Not specified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not specified';
  return date.toLocaleString();
}

function isGenericTheme(name) {
  return GENERIC_THEME_NAMES.has(String(name ?? '').trim().toLowerCase());
}

function visibleItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && typeof item === 'object' && !isGenericTheme(item.name));
}

function explanationText(explanation) {
  const text = showText(explanation);
  if (text === 'Not specified') return text;
  const [analysis] = text.split(/\s+Examples:\s*/i);
  const cleaned = analysis.trim();
  return cleaned || 'Not specified';
}

function exampleTexts(item) {
  if (!Array.isArray(item?.examples)) return [];
  return item.examples
    .filter((example) => example != null && typeof example !== 'object')
    .map((example) => String(example).trim())
    .filter((example) => example && example !== 'undefined' && example !== 'null' && example !== '[object Object]');
}

function responseLabel(count) {
  const shown = showCount(count);
  if (shown == null) return 'Responses not specified';
  return `${shown} ${shown === '1' ? 'response' : 'responses'}`;
}

function collectComments(insights) {
  const sources = [
    ['Key themes', insights?.themes],
    ['Positive feedback', insights?.positiveFeedback],
    ['Areas for improvement', insights?.areasForImprovement],
    ['Priority areas', insights?.priorityAreas],
  ];
  const seen = new Set();
  const comments = [];

  sources.forEach(([section, items]) => {
    visibleItems(items).forEach((item) => {
      exampleTexts(item).forEach((text) => {
        if (seen.has(text)) return;
        seen.add(text);
        comments.push({ section, theme: showText(item.name), text });
      });
    });
  });

  return comments;
}

function TopicList({ items, empty, withExamples = false }) {
  const topics = visibleItems(items);
  if (!topics.length) return <p>{empty}</p>;

  return (
    <div className="ai-insights-topics">
      {topics.map((item, index) => {
        const examples = exampleTexts(item);
        return (
          <article key={`${showText(item.name)}-${index}`} className="ai-insights-topic">
            <h5>{showText(item.name)}</h5>
            <p className="ai-insights-meta">
              {responseLabel(item.count)}
              {' · '}
              {showPercent(item.percentage)} of written responses
            </p>
            <p>{explanationText(item.explanation)}</p>
            {withExamples && examples.length > 0 && (
              <>
                <p className="ai-insights-meta">Representative examples from submitted feedback</p>
                <ul className="ai-insights-examples">
                  {examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </>
            )}
          </article>
        );
      })}
    </div>
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
  const sentiment = insights?.sentiment;
  const writtenTotal = showCount(written?.totalWritten);
  const excludedTotal = showCount(written?.excludedCount);
  const comments = insights ? collectComments(insights) : [];
  const sentimentRows = [
    ['Positive', sentiment?.positive],
    ['Mixed', sentiment?.mixed],
    ['Negative', sentiment?.negative ?? sentiment?.concern],
  ];

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
            <h4>Sentiment analysis</h4>
            <p>
              {sentiment?.label
                ? `Overall sentiment: ${showText(sentiment.label)}.`
                : 'Overall sentiment: Not specified.'}
              {writtenTotal == null
                ? ' The number of written responses in this classification is not specified.'
                : ` Counts are based on ${writtenTotal} analysed written ${writtenTotal === '1' ? 'response' : 'responses'}.`}
            </p>
            <table className="ai-insights-table">
              <thead>
                <tr>
                  <th scope="col">Sentiment</th>
                  <th scope="col">Responses</th>
                  <th scope="col">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {sentimentRows.map(([label, bucket]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{showCount(bucket?.count) ?? 'Not specified'}</td>
                    <td>{showPercent(bucket?.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ai-insights-note ai-insights-method">{showText(sentiment?.method)}</p>
          </article>

          <article className="ai-insights-block">
            <h4>Written feedback</h4>
            <p>
              {writtenTotal == null
                ? 'The number of written responses analysed is not specified.'
                : `${writtenTotal} written ${writtenTotal === '1' ? 'response was' : 'responses were'} analysed.`}
            </p>
            {excludedTotal != null && (
              <p className="ai-insights-note">
                {`${excludedTotal} written ${excludedTotal === '1' ? 'response was' : 'responses were'} excluded from this analysis.`}
              </p>
            )}
          </article>

          <article className="ai-insights-block">
            <h4>Priority areas</h4>
            <TopicList
              items={insights.priorityAreas}
              empty="No priority area was identified from the written responses."
            />
          </article>

          <article className="ai-insights-block">
            <h4>Key themes</h4>
            <TopicList
              items={insights.themes}
              empty="Not enough written feedback to identify a theme."
            />
          </article>

          <article className="ai-insights-block">
            <h4>Theme frequency</h4>
            {visibleItems(insights.themeFrequency).length ? (
              <table className="ai-insights-table">
                <thead>
                  <tr>
                    <th scope="col">Theme</th>
                    <th scope="col">Responses</th>
                    <th scope="col">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems(insights.themeFrequency).map((theme, index) => (
                    <tr key={`${showText(theme.name)}-${index}`}>
                      <td>{showText(theme.name)}</td>
                      <td>{showCount(theme.count) ?? 'Not specified'}</td>
                      <td>{showPercent(theme.percentage)}</td>
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
            <TopicList
              items={insights.positiveFeedback}
              empty="No recurring positive topic was found in the written responses."
              withExamples
            />
          </article>

          <article className="ai-insights-block">
            <h4>Areas for improvement</h4>
            <TopicList
              items={insights.areasForImprovement}
              empty="No recurring concern was found in the written responses."
              withExamples
            />
          </article>

          {comments.length > 0 && (
            <article className="ai-insights-block">
              <h4>Representative comments</h4>
              <p className="ai-insights-note">
                These are representative examples from submitted feedback. The comments are shown as stored and have not been rewritten.
              </p>
              <ul className="ai-insights-comments">
                {comments.map((comment) => (
                  <li key={comment.text}>
                    <p className="ai-insights-meta">{`${comment.theme} · ${comment.section}`}</p>
                    <blockquote>{comment.text}</blockquote>
                  </li>
                ))}
              </ul>
            </article>
          )}

          <article className="ai-insights-block">
            <h4>Recommended actions</h4>
            {Array.isArray(insights.recommendations) && insights.recommendations.length ? (
              <ol className="ai-insights-actions">
                {insights.recommendations.map((item, index) => (
                  <li key={`${showText(item)}-${index}`}>{showText(item)}</li>
                ))}
              </ol>
            ) : (
              <p>No recommended action was returned.</p>
            )}
          </article>

          <article className="ai-insights-block ai-insights-departments">
            <h4>Department / program insights</h4>
            {Array.isArray(insights.departmentInsights) && insights.departmentInsights.length ? (
              <div className="ai-insights-highlights">
                {insights.departmentInsights.map((item, index) => (
                  <div key={`${showText(item?.name)}-${index}`} className="ai-insights-highlight">
                    <strong>{showText(item?.name)}</strong>
                    <span>
                      {`${showCount(item?.responseCount) ?? 'Not specified'} responses · average rating ${showRating(item?.averageRating)}`}
                    </span>
                    <span>{showText(item?.insight)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Not specified</p>
            )}
          </article>

          <article className="ai-insights-block">
            <h4>Rating analysis</h4>
            <p>
              {rating?.averageRating == null
                ? 'No rating answers are available.'
                : `Average rating ${showRating(rating.averageRating)} out of 5 from ${showCount(rating.responseCount) ?? 'Not specified'} rating answers.`}
            </p>
            <table className="ai-insights-table">
              <thead>
                <tr>
                  <th scope="col">Rating</th>
                  <th scope="col">Responses</th>
                  <th scope="col">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(rating?.distribution) ? rating.distribution : []).map((row, index) => (
                  <tr key={`${showText(row?.label)}-${index}`}>
                    <td>{showText(row?.label)}</td>
                    <td>{showCount(row?.count) ?? 'Not specified'}</td>
                    <td>{showPercent(row?.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <p className="portal-meta ai-insights-provider">
            {`Generated ${showGeneratedAt(insights.generatedAt)} · ${showText(insights.provider)}`}
          </p>
        </div>
      )}
    </section>
  );
}
