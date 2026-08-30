const POSITIVE_WORDS = ['good', 'great', 'excellent', 'helpful', 'supportive', 'clear', 'enjoy', 'love', 'best'];
const NEGATIVE_WORDS = ['poor', 'bad', 'difficult', 'confusing', 'slow', 'lack', 'issue', 'problem', 'improve', 'better'];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function extractThemes(textResponses) {
  const counts = {};
  for (const text of textResponses) {
    for (const word of tokenize(text)) {
      if (POSITIVE_WORDS.includes(word) || NEGATIVE_WORDS.includes(word)) continue;
      counts[word] = (counts[word] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function estimateSentiment(textResponses) {
  if (!textResponses.length) return 'neutral';

  let score = 0;
  for (const text of textResponses) {
    const words = tokenize(text);
    for (const word of words) {
      if (POSITIVE_WORDS.includes(word)) score += 1;
      if (NEGATIVE_WORDS.includes(word)) score -= 1;
    }
  }

  if (score > 0) return 'positive';
  if (score < 0) return 'mixed';
  return 'neutral';
}

export function buildReportContext(report) {
  const textResponses = [];
  const surveySummaries = [];

  for (const surveyReport of report.surveys || []) {
    const ratings = [];
    for (const question of surveyReport.questionSummaries || []) {
      if (question.summaryType === 'rating' && question.averageRating) {
        ratings.push(question.averageRating);
      }
      if (question.summaryType === 'text') {
        textResponses.push(...question.textResponses.map((item) => item.text));
      }
    }

    surveySummaries.push({
      title: surveyReport.survey.title,
      department: surveyReport.survey.departmentName || 'University-wide',
      responses: surveyReport.totalResponses,
      averageRating: ratings.length
        ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
        : 0,
    });
  }

  return {
    totals: {
      departments: report.totalDepartments,
      courses: report.totalCourses,
      responses: report.totalResponses,
      averageRating: report.averageRating || 0,
      uniqueStudents: report.uniqueStudents || 0,
    },
    departments: (report.departments || []).map((dept) => ({
      name: dept.name,
      responses: dept.responseCount,
      averageRating: dept.averageRating || 0,
    })),
    surveys: surveySummaries,
    trend: report.responseTrend || [],
    textResponses: textResponses.slice(0, 40),
    sentiment: estimateSentiment(textResponses),
    themes: extractThemes(textResponses),
  };
}

function generateLocalInsights(context) {
  const { totals, departments, trend, themes, sentiment, textResponses } = context;

  if (!totals.responses) {
    return {
      summary:
        'There is not enough student feedback yet to produce strong AI insights. Activate department surveys and encourage students to respond so trends can be analysed.',
      themes: ['Awaiting first responses', 'Survey coverage ready', 'No rating trend yet'],
      recommendations: [
        'Share department feedback links with students this week.',
        'Set closing dates on active surveys to improve completion rates.',
        'Review each department survey before the next teaching period.',
      ],
      departmentHighlights: departments.map((dept) => ({
        department: dept.name,
        note: 'No responses recorded yet. Consider promoting this department survey.',
      })),
      provider: 'NexGen AI (local analysis)',
      generatedAt: new Date().toISOString(),
    };
  }

  const sortedDepartments = [...departments].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
  const strongest = sortedDepartments[0];
  const weakest = sortedDepartments[sortedDepartments.length - 1];
  const recentTrend = trend.slice(-3).reduce((sum, day) => sum + day.count, 0);
  const earlierTrend = trend.slice(0, 3).reduce((sum, day) => sum + day.count, 0);
  const trendDirection =
    recentTrend > earlierTrend ? 'increasing' : recentTrend < earlierTrend ? 'decreasing' : 'steady';

  const summary = [
    `NexGen University has ${totals.responses} feedback responses across ${totals.departments} departments with an overall average rating of ${totals.averageRating || '—'}.`,
    strongest?.averageRating
      ? `${strongest.name} currently leads with an average rating of ${strongest.averageRating}.`
      : `${strongest?.name || 'One department'} has the highest response volume so far.`,
    `Sentiment from written comments appears ${sentiment}, and submissions over the last 7 days are ${trendDirection}.`,
  ].join(' ');

  const derivedThemes = themes.length
    ? themes.map((theme) => `Students frequently mention “${theme}”`)
    : ['Rating scores are the main signal so far', 'More written feedback would improve theme detection'];

  const recommendations = [];
  if (weakest && weakest.name !== strongest?.name) {
    recommendations.push(`Review ${weakest.name} feedback first and follow up with program leaders.`);
  }
  if (textResponses.length < 5) {
    recommendations.push('Add open-text questions or reminders to collect richer qualitative feedback.');
  }
  if (trendDirection === 'decreasing') {
    recommendations.push('Response volume is slowing. Re-promote active surveys before closing dates.');
  } else {
    recommendations.push('Maintain current survey visibility while responses remain active.');
  }
  recommendations.push('Use department reports to compare rating changes after each survey cycle.');

  return {
    summary,
    themes: derivedThemes.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
    departmentHighlights: departments.map((dept) => ({
      department: dept.name,
      note:
        dept.responseCount === 0
          ? 'No responses yet.'
          : dept.averageRating
            ? `${dept.responseCount} responses with an average rating of ${dept.averageRating}.`
            : `${dept.responseCount} responses collected.`,
    })),
    provider: 'NexGen AI (local analysis)',
    generatedAt: new Date().toISOString(),
  };
}

async function generateOpenAiInsights(context) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You analyse university student feedback for staff. Return JSON only with keys: summary (string), themes (string array), recommendations (string array), departmentHighlights (array of {department, note}). Be concise and practical.',
        },
        {
          role: 'user',
          content: `Analyse this NexGen University feedback report:\n${JSON.stringify(context)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || 'OpenAI request failed.');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response.');

  const parsed = JSON.parse(content);
  return {
    summary: parsed.summary || '',
    themes: parsed.themes || [],
    recommendations: parsed.recommendations || [],
    departmentHighlights: parsed.departmentHighlights || [],
    provider: 'OpenAI',
    generatedAt: new Date().toISOString(),
  };
}

export async function generateAiInsights(report) {
  const context = buildReportContext(report);

  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateOpenAiInsights(context);
    } catch {
      const local = generateLocalInsights(context);
      return {
        ...local,
        provider: 'NexGen AI (local fallback)',
      };
    }
  }

  return generateLocalInsights(context);
}
