import { getReportRecords } from './db.js';

const MIN_THEME_RESPONSES = 3;
const MIN_PRIORITY_CONCERNS = 3;

const PLACEHOLDERS = new Set([
  'n/a',
  'na',
  'n a',
  'none',
  'nil',
  'nothing',
  'no comment',
  'no comments',
  'null',
  'undefined',
  'test',
  'testing',
  'asdf',
  'xxx',
  '-',
  '--',
  '.',
  'ok',
  'okay',
]);

const POSITIVE_CUE = /\b(helpful|useful|excellent|clear|straightforward|welcoming|supportive|specific|fair|valuable|realistic|punctual|willing|kind|organised|organized|well run|well supervised|practical|good)\b/i;
const CONCERN_CUE = /\b(would help|need more|needs more|needed more|not enough|difficult|hard to|confusing|confused|unclear|too short|too large|too big|only the mark|only a number|waitlist|wait time|waiting|late|poorly|without notice|did not|does not|didn't|doesn't|not available|cancelled|canceled|not clear|not helpful|not useful|not good)\b/i;

const THEME_RULES = [
  {
    name: 'Parking & Facilities',
    match: (text) => /\b(parking|car parks?|visitor bays?)\b/i.test(text),
    ideas: [
      {
        id: 'availability',
        tone: 'concern',
        label: 'parking spaces are limited or hard to find',
        recommendation: 'Review parking capacity at busy class times and tell students where spaces are still available.',
        test: (text) => /\b(parking|car parks?|visitor bays?)\b/i.test(text)
          && /\b(full|spaces?|spots?|bays?|lots?|difficult|hard|limited|not enough|fills?|only)\b/i.test(text),
      },
      {
        id: 'lighting',
        tone: 'concern',
        label: 'lighting or the walk from the car park is a concern',
        recommendation: 'Improve lighting and safe access on the paths and car parks students use after class.',
        test: (text) => /\b(parking|car parks?)\b/i.test(text) && /\b(light|lighting|lit|dark|security)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Library and learning resources',
    match: (text) => /\b(library|libraries|textbooks?|study rooms?|core texts?)\b/i.test(text),
    ideas: [
      {
        id: 'hours',
        tone: 'concern',
        label: 'library opening hours are too short for study or placement weeks',
        recommendation: 'Review library opening hours in placement and exam weeks, when students say evening access would help.',
        test: (text) => /\blibrary\b/i.test(text) && /\b(hours|evening|open late|late enough|exam week)\b/i.test(text),
      },
      {
        id: 'copies',
        tone: 'concern',
        label: 'core texts are hard to get because copies or waitlists are limited',
        recommendation: 'Increase copies of core texts, or offer a digital copy, where students report a waitlist.',
        test: (text) => /\b(library|textbooks?|core texts?)\b/i.test(text) && /\b(waitlist|copies|copy|several weeks)\b/i.test(text),
      },
      {
        id: 'helpful-library',
        tone: 'positive',
        label: 'library staff or library search are helpful',
        recommendation: 'Keep the library help students already describe as useful, and focus changes on hours and copies.',
        test: (text) => /\blibrary\b/i.test(text) && /\b(helpful|excellent|found|quick|good)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Assessment feedback',
    match: (text) => /\bfeedback\b/i.test(text),
    ideas: [
      {
        id: 'mark-only',
        tone: 'concern',
        label: 'written feedback is only a mark, a number, or a pass/fail',
        recommendation: 'Ask markers to explain what to improve in written feedback, not only the mark or a pass/fail.',
        test: (text) => /\b(only the mark|only a number|pass or fail|thinner|no station)\b/i.test(text),
      },
      {
        id: 'late-feedback',
        tone: 'concern',
        label: 'feedback arrives late or stops before the next piece of work',
        recommendation: 'Return feedback before the next related task so students can use it.',
        test: (text) => /\bfeedback\b/i.test(text) && /\b(late|arrived after|after lab|stops|too late|week late)\b/i.test(text),
      },
      {
        id: 'useful-feedback',
        tone: 'positive',
        label: 'feedback is specific, fair, or useful',
        recommendation: 'Keep the specific feedback students praise, and extend that standard to tasks that currently receive only a mark.',
        test: (text) => /\bfeedback\b/i.test(text) && /\b(specific|fair|useful|clear|kind)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Assessment clarity',
    match: (text) => /\b(exams?|assignments?|due dates?|worked examples?|marking criteria|assignment spec)\b/i.test(text)
      && !/\bonly the mark|only a number\b/i.test(text),
    ideas: [
      {
        id: 'examples',
        tone: 'concern',
        label: 'assessment instructions or worked examples are needed before the task starts',
        recommendation: 'Provide clearer assessment instructions and examples before major assessment deadlines.',
        test: (text) => /\b(worked examples?|clearer instructions|before we start|assessment brief|how to start)\b/i.test(text)
          || (/\b(assignments?|assessments?|exams?)\b/i.test(text) && /\b(example|unclear|confusing|instructions)\b/i.test(text)),
      },
      {
        id: 'exam-prep',
        tone: 'concern',
        label: 'exam preparation or the timing of exam information is a concern',
        recommendation: 'Publish what an exam or skills test will cover early enough for students to prepare.',
        test: (text) => /\b(exams?|osce)\b/i.test(text) && /\b(before the exam|study week|which skill|not revisited|prepare)\b/i.test(text),
      },
      {
        id: 'clear-tasks',
        tone: 'positive',
        label: 'assessment tasks or case work are described as clear or relevant',
        recommendation: 'Keep the assessment tasks students describe as clear, and add examples where other tasks are not.',
        test: (text) => /\b(assignments?|assessments?|exams?)\b/i.test(text) && /\b(clear|relevant|useful|fair|straightforward)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Teaching and tutorials',
    match: (text) => /\b(tutorials?|lectures?|workshops?|seminars?)\b/i.test(text)
      || (/\btutors?\b/i.test(text) && /\b(help|teaching|class|session|willing|workshop)\b/i.test(text)),
    ideas: [
      {
        id: 'helpful-teaching',
        tone: 'positive',
        label: 'teaching, tutorials, or workshops are clear, practical, or helpful',
        recommendation: 'Keep the tutorials and workshops students describe as clear or practical.',
        test: (text) => /\b(tutorials?|lectures?|workshops?|seminars?|tutors?)\b/i.test(text)
          && /\b(clear|useful|practical|helpful|willing|excellent|well run|organised|organized)\b/i.test(text),
      },
      {
        id: 'more-sessions',
        tone: 'concern',
        label: 'students want another session, a repeat, or an evening option',
        recommendation: 'Add a repeat or evening session where students say one tutorial or workshop is not enough.',
        test: (text) => /\b(tutorials?|lectures?|workshops?|seminars?)\b/i.test(text)
          && /\b(would help|repeat|evening|another|more time|not enough)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Clinical placements and skills',
    match: (text) => /\b(placements?|wards?|clinical|simulations?|handovers?|bedside|osce)\b/i.test(text),
    ideas: [
      {
        id: 'practice-time',
        tone: 'concern',
        label: 'students want more supervised practice, handover time, or a second attempt',
        recommendation: 'Give students more supervised practice time on placement and in simulation before they are assessed.',
        test: (text) => /\b(placements?|wards?|clinical|simulations?|handovers?|bedside|osce)\b/i.test(text)
          && /\b(more time|second|repeat|only performed|once|too large|practice run|not enough time)\b/i.test(text),
      },
      {
        id: 'roster',
        tone: 'concern',
        label: 'placement or ward roster changes arrive too late',
        recommendation: 'Send placement and ward roster changes earlier than the night before.',
        test: (text) => /\b(placements?|wards?|roster)\b/i.test(text) && /\b(night before|without notice|changed|old one|late)\b/i.test(text),
      },
      {
        id: 'useful-clinical',
        tone: 'positive',
        label: 'simulations, clinical skills, or supervision are useful',
        recommendation: 'Keep the supervised clinical and simulation teaching students describe as useful.',
        test: (text) => /\b(placements?|wards?|clinical|simulations?|handovers?|bedside)\b/i.test(text)
          && /\b(useful|realistic|well supervised|well run|strongest|helpful|willing)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Group work',
    match: (text) => /\b(group work|group projects?|group cases?|group assignments?|study groups?|small[- ]groups?|simulation groups?)\b/i.test(text)
      || (/\bgroups?\b/i.test(text) && /\b(project|cases?|roles?|members?|team|study)\b/i.test(text)),
    ideas: [
      {
        id: 'group-load',
        tone: 'concern',
        label: 'group tasks need clearer roles, a check-in, or a smaller group',
        recommendation: 'Set clearer roles and a midway check-in for group tasks so the work is shared.',
        test: (text) => /\bgroups?\b/i.test(text) && /\b(roles?|one person|carry|drifting|too large|cancelled|not rescheduled|check-in|midway)\b/i.test(text),
      },
      {
        id: 'useful-groups',
        tone: 'positive',
        label: 'group or peer study is welcoming or has a clear brief',
        recommendation: 'Keep the group briefs and peer study groups students describe as clear or welcoming.',
        test: (text) => /\bgroups?\b/i.test(text) && /\b(clear|welcoming|useful|easy to join|work well|relevant)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Timetables and communication',
    match: (text) => /\b(timetables?|rosters?)\b/i.test(text)
      || (/\bemails?\b/i.test(text) && /\b(late|bounces?|reminder|change|changes|night before|arrived)\b/i.test(text)),
    ideas: [
      {
        id: 'late-changes',
        tone: 'concern',
        label: 'timetable, roster, or email changes arrive too late or are hard to read',
        recommendation: 'Send timetable and roster changes earlier, and make the timetable readable on a phone.',
        test: (text) => /\b(timetables?|rosters?|emails?)\b/i.test(text)
          && /\b(late|night before|hard to read|bounces?|without notice|old one|confusing)\b/i.test(text),
      },
      {
        id: 'clear-updates',
        tone: 'positive',
        label: 'course updates or reminders are timely or welcome',
        recommendation: 'Keep the timely course updates students mention, and use the same notice period for timetable changes.',
        test: (text) => /\b(timetables?|emails?|updates?)\b/i.test(text) && /\b(on time|welcome|helpful|clear|punctual)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Student support and advising',
    match: (text) => /\b(advis\w*|appointments?|counsell\w*|student services?|office hours?|enrol(?:ment|lment)?)\b/i.test(text),
    ideas: [
      {
        id: 'wait-time',
        tone: 'concern',
        label: 'appointments, office hours, or support replies are hard to get in time',
        recommendation: 'Shorten the wait for advising, office hours, and student-service replies in the first weeks of term.',
        test: (text) => /\b(advis\w*|appointments?|office hours?|counsell\w*|student services?)\b/i.test(text)
          && /\b(wait|weeks?|hard to get|only on days|would help|longer|difficult)\b/i.test(text),
      },
      {
        id: 'helpful-support',
        tone: 'positive',
        label: 'student services, enrolment help, or tutors are supportive',
        recommendation: 'Keep the enrolment and student-service help students describe as useful.',
        test: (text) => /\b(advis\w*|student services?|enrol(?:ment|lment)?|office hours?|appointments?)\b/i.test(text)
          && /\b(helpful|useful|straightforward|willing|quick|supportive)\b/i.test(text),
      },
    ],
  },
  {
    name: 'Learning systems',
    match: (text) => /\b(portals?|software|off-campus|learning platforms?|unit sites?)\b/i.test(text)
      || (/\bdatabase\b/i.test(text) && /\b(access|licen[cs]e|login|software|system)\b/i.test(text)),
    ideas: [
      {
        id: 'access',
        tone: 'concern',
        label: 'a portal, login, upload, or off-campus connection fails or is unclear',
        recommendation: 'Fix portal uploads, logins, and off-campus access, and show an error students can act on.',
        test: (text) => /\b(portals?|software|off-campus|learning platforms?|unit sites?|login|upload)\b/i.test(text)
          && /\b(rejected|expired|error|bounces?|drops?|not available|did not|does not|hard|difficult|unclear)\b/i.test(text),
      },
      {
        id: 'works',
        tone: 'positive',
        label: 'a portal, site, or software tool is clear or up to date',
        recommendation: 'Keep the systems students can already use, and fix the uploads and access problems reported alongside them.',
        test: (text) => /\b(portals?|software|unit sites?|learning platforms?)\b/i.test(text)
          && /\b(clear|current|updated|straightforward|useful|quick)\b/i.test(text),
      },
    ],
  },
];

function round1(value) {
  return Math.round(value * 10) / 10;
}

function percentageOf(count, total) {
  if (!total) return 0;
  return round1((count / total) * 100);
}

function sharesThatSumTo100(counts, total) {
  if (!total) {
    return counts.map(() => 0);
  }
  const exact = counts.map((count) => (count / total) * 100);
  const floored = exact.map((value) => Math.floor(value * 10) / 10);
  let remainder = Math.round((100 - floored.reduce((sum, value) => sum + value, 0)) * 10);
  const order = exact
    .map((value, index) => ({ index, fraction: value - floored[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  let step = 0;
  while (remainder > 0 && order.length) {
    const target = order[step % order.length].index;
    floored[target] = round1(floored[target] + 0.1);
    remainder -= 1;
    step += 1;
  }
  return floored;
}

function normalise(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function wordCount(text) {
  return normalise(text).split(/\s+/).filter(Boolean).length;
}

function isAnalysableComment(text) {
  const clean = normalise(text);
  if (!clean) return false;
  const key = clean.toLowerCase().replace(/[.!?]+$/g, '').trim();
  if (PLACEHOLDERS.has(key)) return false;
  if (wordCount(clean) < 3 || clean.length < 12) return false;
  return true;
}

function hasPositiveCue(text) {
  if (/\bnot (good|clear|helpful|useful|fair)\b/i.test(text)) return false;
  return POSITIVE_CUE.test(text);
}

function hasConcernCue(text) {
  return CONCERN_CUE.test(text);
}

function classifyTone(text) {
  const positive = hasPositiveCue(text);
  const concern = hasConcernCue(text);
  if (positive && !concern) return 'positive';
  if (concern && !positive) return 'concern';
  return 'mixed';
}

function fragments(text) {
  return normalise(text)
    .split(/\s+but\s+|(?<=[.!?])\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchesIdea(text, idea) {
  return fragments(text).some((part) => idea.test(part));
}

function themeScope(text, rule) {
  const parts = fragments(text).filter((part) => rule.match(part) || rule.ideas.some((idea) => idea.test(part)));
  return parts.length ? parts.join(' ') : text;
}

function excerpt(text, max = 180) {
  const clean = normalise(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function pickExamples(comments, prefer) {
  const preferred = comments.filter((comment) => prefer(comment.text));
  const pool = preferred.length ? preferred : comments;
  const chosen = [];
  const seen = new Set();
  for (const comment of pool) {
    const key = normalise(comment.text).toLowerCase().slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(excerpt(comment.text));
    if (chosen.length === 3) break;
  }
  return chosen;
}

function quoteList(examples) {
  if (!examples.length) return '';
  return `Examples: ${examples.map((example) => `“${example}”`).join(' ')}`;
}

function describeIdeas(ideas) {
  const repeated = ideas.filter((idea) => idea.count >= 2);
  if (!repeated.length) {
    return 'The comments mention this topic, but they do not repeat one specific point often enough to describe it more precisely.';
  }
  const detail = repeated
    .slice(0, 2)
    .map((idea) => `${idea.label} (${idea.count} ${idea.count === 1 ? 'response' : 'responses'})`)
    .join('; ');
  return `The repeated points are: ${detail}.`;
}

function buildThemes(comments) {
  const responseTotal = new Set(comments.map((comment) => comment.responseId)).size;

  return THEME_RULES.map((rule) => {
    const matched = [];
    const ideaCounts = rule.ideas.map((idea) => ({ ...idea, count: 0, ids: new Set(), comments: [] }));

    for (const comment of comments) {
      if (!rule.match(comment.text) && !rule.ideas.some((idea) => idea.test(comment.text))) continue;
      const scope = themeScope(comment.text, rule);
      const tone = classifyTone(scope);
      const hit = { ...comment, tone, scope };
      matched.push(hit);
      for (const idea of ideaCounts) {
        if (!matchesIdea(comment.text, idea) || idea.ids.has(comment.responseId)) continue;
        idea.ids.add(comment.responseId);
        idea.comments.push(hit);
      }
    }
    for (const idea of ideaCounts) idea.count = idea.ids.size;

    const responseIds = new Set(matched.map((comment) => comment.responseId));
    const positive = matched.filter((comment) => comment.tone === 'positive'
      || hasPositiveCue(comment.scope)
      || ideaCounts.some((idea) => idea.tone === 'positive' && idea.ids.has(comment.responseId)));
    const concern = matched.filter((comment) => comment.tone === 'concern'
      || hasConcernCue(comment.scope)
      || ideaCounts.some((idea) => idea.tone === 'concern' && idea.ids.has(comment.responseId)));
    const count = responseIds.size;
    const percentage = percentageOf(count, responseTotal);
    const examples = pickExamples(matched, (text) => rule.ideas.some((idea) => matchesIdea(text, idea)));
    const positiveExamples = pickExamples(positive, (text) => rule.ideas.some((idea) => idea.tone === 'positive' && matchesIdea(text, idea)));
    const concernExamples = pickExamples(concern, (text) => rule.ideas.some((idea) => idea.tone === 'concern' && matchesIdea(text, idea)));
    const leadingConcern = ideaCounts
      .filter((idea) => idea.tone === 'concern' && idea.count >= 2)
      .sort((a, b) => b.count - a.count)[0];

    return {
      name: rule.name,
      count,
      percentage,
      positiveCount: new Set(positive.map((comment) => comment.responseId)).size,
      concernCount: new Set(concern.map((comment) => comment.responseId)).size,
      examples,
      positiveExamples,
      concernExamples,
      recommendation: leadingConcern?.recommendation || '',
      explanation: count
        ? `${percentage}% of written responses (${count}). ${describeIdeas(ideaCounts)} ${quoteList(examples)}`.trim()
        : '',
      positiveExplanation: positive.length
        ? `${percentageOf(new Set(positive.map((comment) => comment.responseId)).size, responseTotal)}% of written responses mention this positively (${new Set(positive.map((comment) => comment.responseId)).size}). ${describeIdeas(ideaCounts.filter((idea) => idea.tone === 'positive'))} ${quoteList(positiveExamples)}`.trim()
        : '',
      concernExplanation: concern.length
        ? `${percentageOf(new Set(concern.map((comment) => comment.responseId)).size, responseTotal)}% of written responses raise this as a concern (${new Set(concern.map((comment) => comment.responseId)).size}). ${describeIdeas(ideaCounts.filter((idea) => idea.tone === 'concern'))} ${quoteList(concernExamples)}`.trim()
        : '',
    };
  })
    .filter((theme) => theme.count >= MIN_THEME_RESPONSES)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function sentimentSummary(comments) {
  const buckets = { positive: [], mixed: [], concern: [] };
  for (const comment of comments) {
    const tone = classifyTone(comment.text);
    if (tone === 'positive') buckets.positive.push(comment);
    else if (tone === 'concern') buckets.concern.push(comment);
    else buckets.mixed.push(comment);
  }
  const counts = [buckets.positive.length, buckets.mixed.length, buckets.concern.length];
  const [positivePct, mixedPct, concernPct] = sharesThatSumTo100(counts, comments.length);
  const ranked = [
    { label: 'Positive', count: buckets.positive.length, percentage: positivePct },
    { label: 'Mixed', count: buckets.mixed.length, percentage: mixedPct },
    { label: 'Improvement/Concern', count: buckets.concern.length, percentage: concernPct },
  ].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    method: 'Rule-based cue matching, not a machine-learning model. A written comment is Positive when it has a positive cue and no concern cue, Improvement/Concern when it has a concern cue and no positive cue, and Mixed when it has both or neither.',
    total: comments.length,
    label: comments.length ? ranked[0].label : 'Mixed',
    positive: { count: buckets.positive.length, percentage: positivePct },
    mixed: { count: buckets.mixed.length, percentage: mixedPct },
    concern: { count: buckets.concern.length, percentage: concernPct },
  };
}

function priorityAreas(themes, writtenTotal) {
  return themes
    .filter((theme) => theme.concernCount >= 5
      || (theme.concernCount >= MIN_PRIORITY_CONCERNS && theme.concernCount / Math.max(writtenTotal, 1) >= 0.08))
    .sort((a, b) => b.concernCount - a.concernCount || b.count - a.count)
    .slice(0, 4)
    .map((theme) => ({
      name: theme.name,
      count: theme.concernCount,
      percentage: percentageOf(theme.concernCount, writtenTotal),
      explanation: theme.concernExplanation,
      examples: theme.concernExamples,
    }));
}

function recommendationLines(themes, priorities) {
  const source = priorities.length
    ? priorities.map((item) => themes.find((theme) => theme.name === item.name)).filter(Boolean)
    : themes.filter((theme) => theme.concernCount >= MIN_THEME_RESPONSES);
  const lines = [];
  const seen = new Set();
  for (const theme of source) {
    if (!theme.recommendation || seen.has(theme.recommendation)) continue;
    seen.add(theme.recommendation);
    lines.push(`${theme.recommendation} This follows ${theme.name}, raised in ${theme.concernCount} written responses.`);
    if (lines.length === 4) break;
  }
  if (!lines.length) {
    const repeatedConcerns = themes.filter((theme) => theme.concernCount >= 2);
    if (!repeatedConcerns.length) {
      return ['Not enough written feedback to identify reliable themes.'];
    }
    return repeatedConcerns.slice(0, 4).map((theme) => (
      `Review the written comments about ${theme.name}. ${theme.concernCount} responses raise this as something to improve.`
    ));
  }
  return lines;
}

function summaryText({ writtenCount, themes, positiveFeedback, areasForImprovement, priorities, sentiment }) {
  if (!writtenCount || !themes.length) {
    return 'Not enough written feedback to identify reliable themes.';
  }

  const themeList = themes
    .slice(0, 3)
    .map((theme) => `${theme.name} (${theme.count}, ${theme.percentage}%)`)
    .join(', ');
  const sentences = [
    `${writtenCount} written responses were analysed. Cue matching classifies ${sentiment.positive.count} as positive (${sentiment.positive.percentage}%), ${sentiment.mixed.count} as mixed (${sentiment.mixed.percentage}%), and ${sentiment.concern.count} as improvement or concern (${sentiment.concern.percentage}%).`,
    `The main recurring themes are ${themeList}.`,
  ];
  const leadingPositive = positiveFeedback[0];
  const leadingConcern = areasForImprovement[0];
  const priority = priorities[0];
  if (leadingPositive && leadingConcern && leadingPositive.name === leadingConcern.name) {
    sentences.push(
      `${leadingPositive.name} is both the strongest positive area and the main improvement area: comments praise it and also ask for changes.`
    );
  } else if (leadingPositive) {
    sentences.push(`The strongest positive area supported by the comments is ${leadingPositive.name}.`);
  }
  if (leadingConcern && leadingPositive?.name !== leadingConcern.name) {
    sentences.push(
      priority && priority.name === leadingConcern.name
        ? `The main improvement area is ${leadingConcern.name}, a priority because that concern is repeated in ${priority.count} responses.`
        : `The main improvement area is ${leadingConcern.name}.`
    );
  } else if (priority && sentences.length < 4) {
    sentences.push(`${priority.name} is a priority because that concern is repeated in ${priority.count} responses.`);
  }
  return sentences.slice(0, 4).join(' ');
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
        ? `${topTheme.name} is the most common written theme in this program (${topTheme.count} responses, ${topTheme.percentage}% of its written comments).`
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

function publicTheme(theme) {
  return {
    name: theme.name,
    count: theme.count,
    percentage: theme.percentage,
    explanation: theme.explanation,
    examples: theme.examples,
  };
}

function toneTheme(theme, tone, writtenTotal) {
  const count = tone === 'positive' ? theme.positiveCount : theme.concernCount;
  const examples = tone === 'positive' ? theme.positiveExamples : theme.concernExamples;
  return {
    name: theme.name,
    count,
    percentage: percentageOf(count, writtenTotal),
    explanation: tone === 'positive' ? theme.positiveExplanation : theme.concernExplanation,
    examples,
  };
}

export function analyseFeedback(records) {
  const responseIds = new Set((records.responses || []).map((response) => response.id));
  const textAnswers = (records.answers || [])
    .filter((answer) => answer.question_type === 'text')
    .map((answer) => ({
      responseId: answer.response_id,
      text: normalise(answer.answer_text),
    }));
  const written = textAnswers.filter((answer) => isAnalysableComment(answer.text));
  const excludedCount = textAnswers.length - written.length;
  const themes = buildThemes(written);
  const ratings = ratingAnalysis(records.answers || []);
  const programs = programInsights(records, written);
  const sentiment = sentimentSummary(written);
  const priorities = priorityAreas(themes, written.length);
  const positiveFeedback = themes
    .filter((theme) => theme.positiveCount >= MIN_THEME_RESPONSES)
    .sort((a, b) => b.positiveCount - a.positiveCount || a.name.localeCompare(b.name))
    .map((theme) => toneTheme(theme, 'positive', written.length));
  const areasForImprovement = themes
    .filter((theme) => theme.concernCount >= MIN_THEME_RESPONSES)
    .sort((a, b) => b.concernCount - a.concernCount || a.name.localeCompare(b.name))
    .map((theme) => toneTheme(theme, 'concern', written.length));
  const recommendations = recommendationLines(themes, priorities);

  const submittedTimes = (records.responses || [])
    .map((response) => response.submitted_at)
    .filter(Boolean)
    .sort();
  const periodStart = formatDay(submittedTimes[0]);
  const periodEnd = formatDay(submittedTimes[submittedTimes.length - 1]);
  const closingDates = [...new Set((records.responses || []).map((response) => response.closing_date).filter(Boolean))];
  const closingLabel = records.closingDate
    ? formatDay(records.closingDate)
    : closingDates.length === 1
      ? formatDay(closingDates[0])
      : null;

  const departments = new Set(
    (records.responses || []).map((response) => response.department_name).filter(Boolean)
  );
  const publicThemes = themes.map(publicTheme);

  return {
    reportName: records.reportName,
    reportingPeriod: periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : 'Not specified',
    surveyClosing: closingLabel,
    summary: summaryText({
      writtenCount: written.length,
      themes,
      positiveFeedback,
      areasForImprovement,
      priorities,
      sentiment,
    }),
    themes: publicThemes,
    themeFrequency: publicThemes.map(({ name, count, percentage }) => ({ name, count, percentage })),
    positiveFeedback,
    areasForImprovement,
    priorityAreas: priorities,
    recommendations,
    sentiment,
    departmentInsights: programs,
    ratingAnalysis: ratings,
    writtenFeedbackAnalysis: {
      totalWritten: written.length,
      excludedCount,
      themes: publicThemes,
      positiveThemes: positiveFeedback,
      improvementThemes: areasForImprovement,
      priorityAreas: priorities,
      sentiment,
    },
    questions: questionResults(records),
    totals: {
      totalResponses: responseIds.size,
      uniqueStudents: new Set((records.responses || []).map((response) => response.student_email).filter(Boolean)).size,
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
