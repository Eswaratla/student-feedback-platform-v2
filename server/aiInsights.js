import { getReportRecords } from './db.js';

const THEME_RULES = [
  {
    name: 'Parking / Facilities',
    terms: ['parking', 'car park', 'visitor bay', 'visitor bays'],
  },
  {
    name: 'Library and learning resources',
    terms: ['library', 'textbook', 'textbooks', 'study room', 'study rooms', 'reading', 'readings'],
  },
  {
    name: 'Assessment feedback',
    terms: ['feedback'],
  },
  {
    name: 'Exams and assignments',
    terms: ['exam', 'exams', 'assignment', 'assignments', 'due date', 'osce'],
  },
  {
    name: 'Teaching and tutorials',
    terms: ['tutorial', 'tutorials', 'lecture', 'lectures', 'workshop', 'workshops', 'seminar', 'seminars', 'tutor', 'tutors'],
  },
  {
    name: 'Clinical placements and skills',
    terms: ['placement', 'placements', 'ward', 'wards', 'clinical', 'handover', 'handovers', 'bedside', 'simulation', 'simulations'],
  },
  {
    name: 'Group work',
    terms: ['group', 'groups'],
  },
  {
    name: 'Timetables and communication',
    terms: ['timetable', 'timetables', 'roster', 'rosters', 'email', 'emails'],
  },
  {
    name: 'Student support and advising',
    terms: [
      { text: 'advis', prefix: true },
      'appointment',
      'appointments',
      { text: 'counsel', prefix: true },
      'student service',
      'student services',
      { text: 'enrol', prefix: true },
      'office hour',
      'office hours',
    ],
  },
  {
    name: 'Learning systems',
    terms: ['software', 'portal', 'database', 'learning platform', 'unit site', 'unit sites', 'off-campus'],
  },
];

const POSITIVE_CUES = [
  'useful',
  'clear',
  'helpful',
  'excellent',
  'well run',
  'well supervised',
  'welcoming',
  'specific',
  'quick',
  'organised',
  'organized',
  'realistic',
  'punctual',
  'straightforward',
  'fair',
  'valuable',
  'strongest',
  'willing',
  'kind',
  'good',
];

const CONCERN_CUES = [
  'would help',
  'difficult',
  'hard to',
  'confusing',
  'confused',
  'too short',
  'too large',
  'not enough',
  'only the mark',
  'only a number',
  'waitlist',
  'wait time',
  'late',
  'expired',
  'rejected',
  'poorly',
  'without notice',
  'night before',
  'cancelled',
  'canceled',
  'bounces',
  'did not',
  'does not',
  'not available',
  'out of paper',
  'rang out',
  'drops out',
  'thinner',
  'no station',
  'hard',
];

function termPattern(term) {
  const text = typeof term === 'string' ? term : term.text;
  const prefix = typeof term === 'object' && term.prefix;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const end = prefix ? '' : '(?:$|[^a-z0-9])';
  return new RegExp(`(?:^|[^a-z0-9])${escaped}${end}`, 'i');
}

const THEME_MATCHERS = THEME_RULES.map((rule) => ({
  name: rule.name,
  patterns: rule.terms.map(termPattern),
}));

const POSITIVE_PATTERNS = POSITIVE_CUES.map((cue) => termPattern(cue));
const CONCERN_PATTERNS = CONCERN_CUES.map((cue) => termPattern(cue === 'hard' ? { text: 'hard', prefix: false } : cue));

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function polarity(text) {
  return {
    positive: matchesAny(text, POSITIVE_PATTERNS),
    concern: matchesAny(text, CONCERN_PATTERNS),
  };
}

function excerpt(text, max = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function fragments(text) {
  return String(text || '')
    .split(/\s+but\s+|(?<=[.!?])\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function bestFragment(comments, patterns, want) {
  const candidates = [];
  for (const comment of comments) {
    for (const part of fragments(comment.text)) {
      if (!matchesAny(part, patterns)) continue;
      candidates.push({ part, tone: polarity(part) });
    }
  }
  if (want === 'any') return excerpt(candidates[0]?.part || comments[0]?.text || '');
  const preferred = candidates.find((item) => (
    want === 'positive'
      ? item.tone.positive && !item.tone.concern
      : item.tone.concern && !item.tone.positive
  ))
    || candidates.find((item) => (want === 'positive' ? item.tone.positive : item.tone.concern))
    || candidates[0];
  return excerpt(preferred?.part || comments[0]?.text || '');
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function programName(response) {
  const department = response.department_name || null;
  const program = response.course_code && response.course_name
    ? `${response.course_code} ${response.course_name}`
    : response.course_name || response.course_code || null;
  if (!department && !program) return 'Not specified';
  if (!program) return department;
  if (!department) return program;
  return `${department} — ${program}`;
}

function formatDay(value) {
  if (!value) return null;
  const parsed = new Date(String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildThemes(comments) {
  return THEME_MATCHERS.map((theme) => {
    const matched = comments.filter((comment) => matchesAny(comment.text, theme.patterns));
    const responseIds = new Set(matched.map((comment) => comment.responseId));
    const positive = matched.filter((comment) => polarity(comment.text).positive);
    const concern = matched.filter((comment) => polarity(comment.text).concern);
    return {
      name: theme.name,
      count: responseIds.size,
      positiveCount: new Set(positive.map((comment) => comment.responseId)).size,
      concernCount: new Set(concern.map((comment) => comment.responseId)).size,
      explanation: responseIds.size
        ? `Mentioned in ${responseIds.size} responses. Example from the stored comments: “${bestFragment(matched, theme.patterns, 'any')}”`
        : '',
      positiveExplanation: positive.length
        ? `${new Set(positive.map((comment) => comment.responseId)).size} responses mention this positively. Example: “${bestFragment(positive, theme.patterns, 'positive')}”`
        : '',
      concernExplanation: concern.length
        ? `${new Set(concern.map((comment) => comment.responseId)).size} responses raise this as a concern. Example: “${bestFragment(concern, theme.patterns, 'concern')}”`
        : '',
    };
  })
    .filter((theme) => theme.count >= 2)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function ratingAnalysis(answers) {
  const ratings = answers.filter((answer) => answer.question_type === 'rating' && answer.answer_rating != null);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const answer of ratings) {
    const value = Number(answer.answer_rating);
    if (counts[value] != null) counts[value] += 1;
  }
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const raw = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    exact: total ? (counts[rating] / total) * 100 : 0,
  }));
  const distribution = raw.map((row) => ({
    rating: row.rating,
    label: `${row.rating} / 5`,
    count: counts[row.rating],
    percentage: total ? Math.floor(row.exact * 10) / 10 : 0,
  }));
  if (total) {
    let remainder = Math.round((100 - distribution.reduce((sum, row) => sum + row.percentage, 0)) * 10);
    const order = raw
      .map((row, index) => ({ index, fraction: row.exact - distribution[index].percentage }))
      .sort((a, b) => b.fraction - a.fraction);
    let step = 0;
    while (remainder > 0) {
      const target = distribution[order[step % order.length].index];
      target.percentage = round1(target.percentage + 0.1);
      remainder -= 1;
      step += 1;
    }
  }
  const averageRating = total
    ? round1(ratings.reduce((sum, answer) => sum + Number(answer.answer_rating), 0) / total)
    : null;
  return { responseCount: total, averageRating, distribution };
}

function parseOptions(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function questionResults(records) {
  const answersByQuestion = new Map();
  for (const answer of records.answers) {
    const list = answersByQuestion.get(answer.question_id) || [];
    list.push(answer);
    answersByQuestion.set(answer.question_id, list);
  }

  return records.questions.map((question) => {
    const answers = answersByQuestion.get(question.id) || [];
    if (question.question_type === 'rating') {
      const ratings = answers.map((answer) => answer.answer_rating).filter((value) => value != null).map(Number);
      const averageRating = ratings.length
        ? round1(ratings.reduce((sum, value) => sum + value, 0) / ratings.length)
        : null;
      return {
        surveyTitle: question.survey_title,
        questionText: question.question_text,
        questionType: 'Rating',
        responseCount: ratings.length,
        averageRating,
        summary: averageRating == null ? 'No ratings recorded.' : `Average ${averageRating} out of 5.`,
      };
    }

    if (question.question_type === 'choice') {
      const counts = {};
      for (const option of parseOptions(question.options)) counts[option] = 0;
      for (const answer of answers) {
        const text = String(answer.answer_text || '').trim();
        if (!text) continue;
        counts[text] = (counts[text] || 0) + 1;
      }
      const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const summary = ranked.length
        ? ranked.map(([choice, count]) => `${choice}: ${count}`).join('; ')
        : 'No choices recorded.';
      const responseCount = answers.filter((answer) => String(answer.answer_text || '').trim()).length;
      return {
        surveyTitle: question.survey_title,
        questionText: question.question_text,
        questionType: 'Choice',
        responseCount,
        averageRating: null,
        summary,
      };
    }

    const written = answers.filter((answer) => String(answer.answer_text || '').trim());
    return {
      surveyTitle: question.survey_title,
      questionText: question.question_text,
      questionType: 'Written',
      responseCount: written.length,
      averageRating: null,
      summary: written.length ? `${written.length} written responses.` : 'No written responses.',
    };
  });
}

function programInsights(records, comments) {
  const responsesByProgram = new Map();
  for (const response of records.responses) {
    const name = programName(response);
    const bucket = responsesByProgram.get(name) || [];
    bucket.push(response);
    responsesByProgram.set(name, bucket);
  }

  const ratingsByResponse = new Map();
  for (const answer of records.answers) {
    if (answer.question_type !== 'rating' || answer.answer_rating == null) continue;
    const list = ratingsByResponse.get(answer.response_id) || [];
    list.push(Number(answer.answer_rating));
    ratingsByResponse.set(answer.response_id, list);
  }

  const commentsByResponse = new Map();
  for (const comment of comments) {
    const list = commentsByResponse.get(comment.responseId) || [];
    list.push(comment);
    commentsByResponse.set(comment.responseId, list);
  }

  return [...responsesByProgram.entries()]
    .map(([name, responses]) => {
      const responseIds = new Set(responses.map((response) => response.id));
      const ratings = [];
      for (const responseId of responseIds) {
        ratings.push(...(ratingsByResponse.get(responseId) || []));
      }
      const programComments = [];
      for (const responseId of responseIds) {
        programComments.push(...(commentsByResponse.get(responseId) || []));
      }
      const topTheme = buildThemes(programComments)[0];
      const insight = topTheme
        ? `${topTheme.name} is the most common written theme in this program (${topTheme.count} responses).`
        : 'Not enough written feedback to identify a theme.';
      return {
        name,
        responseCount: responseIds.size,
        averageRating: ratings.length
          ? round1(ratings.reduce((sum, value) => sum + value, 0) / ratings.length)
          : null,
        insight,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function analyseFeedback(records) {
  const responseIds = new Set(records.responses.map((response) => response.id));
  const written = records.answers
    .filter((answer) => answer.question_type === 'text' && String(answer.answer_text || '').trim())
    .map((answer) => ({
      responseId: answer.response_id,
      text: String(answer.answer_text).trim(),
    }));
  const themes = buildThemes(written);
  const ratings = ratingAnalysis(records.answers);
  const programs = programInsights(records, written);
  const positiveFeedback = themes
    .filter((theme) => theme.positiveCount >= 2)
    .map((theme) => ({
      name: theme.name,
      count: theme.positiveCount,
      explanation: theme.positiveExplanation,
    }));
  const areasForImprovement = themes
    .filter((theme) => theme.concernCount >= 2)
    .map((theme) => ({
      name: theme.name,
      count: theme.concernCount,
      explanation: theme.concernExplanation,
    }));
  const recommendations = areasForImprovement.slice(0, 4).map((theme) => (
    `Review ${theme.name.toLowerCase()} with the relevant program team. ${theme.explanation}`
  ));
  if (!recommendations.length) {
    recommendations.push('There is not enough written feedback to recommend a specific action.');
  }

  const submittedTimes = records.responses
    .map((response) => response.submitted_at)
    .filter(Boolean)
    .sort();
  const periodStart = formatDay(submittedTimes[0]);
  const periodEnd = formatDay(submittedTimes[submittedTimes.length - 1]);
  const closingDates = [...new Set(records.responses.map((response) => response.closing_date).filter(Boolean))];
  const closingLabel = records.closingDate
    ? formatDay(records.closingDate)
    : closingDates.length === 1
      ? formatDay(closingDates[0])
      : null;

  const themeSummary = themes.slice(0, 3).map((theme) => `${theme.name} (${theme.count})`).join(', ');
  const summaryParts = [
    `${responseIds.size} responses are included in this report.`,
    ratings.averageRating == null
      ? 'No rating answers are available to calculate an average.'
      : `The overall average rating is ${ratings.averageRating} out of 5, from ${ratings.responseCount} rating answers.`,
    written.length
      ? `${written.length} written responses were analysed.`
      : 'No written responses are available.',
    themes.length
      ? `The most frequent written themes are ${themeSummary}.`
      : 'There is not enough repeated written feedback to identify a theme.',
  ];

  const departments = new Set(
    records.responses.map((response) => response.department_name).filter(Boolean)
  );

  return {
    reportName: records.reportName,
    reportingPeriod: periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : 'Not specified',
    surveyClosing: closingLabel,
    summary: summaryParts.join(' '),
    themes: themes.map(({ name, count, explanation }) => ({ name, count, explanation })),
    themeFrequency: themes.map(({ name, count }) => ({ name, count })),
    positiveFeedback,
    areasForImprovement,
    recommendations,
    departmentInsights: programs,
    ratingAnalysis: ratings,
    writtenFeedbackAnalysis: {
      totalWritten: written.length,
      themes: themes.map(({ name, count, explanation }) => ({ name, count, explanation })),
      positiveThemes: positiveFeedback,
      improvementThemes: areasForImprovement,
    },
    questions: questionResults(records),
    totals: {
      totalResponses: responseIds.size,
      uniqueStudents: new Set(records.responses.map((response) => response.student_email).filter(Boolean)).size,
      averageRating: ratings.averageRating,
      ratingAnswerCount: ratings.responseCount,
      writtenCount: written.length,
      departmentCount: departments.size,
      programCount: programs.filter((program) => program.name !== 'Not specified').length,
    },
    provider: 'NexGen AI (local analysis)',
    generatedAt: new Date().toISOString(),
  };
}

export function generateAiInsights() {
  return analyseFeedback(getReportRecords());
}
