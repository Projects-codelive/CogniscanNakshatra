import { db } from '../store/db';

export async function analyzeCorrelations(patientId = 1) {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const checkIns = await db.checkIns
    .where('patientId')
    .equals(patientId)
    .filter(c => new Date(c.date) >= monthAgo)
    .toArray();

  const tests = await db.testResults
    .where('patientId')
    .equals(patientId)
    .filter(t => new Date(t.completedAt) >= monthAgo)
    .toArray();

  const speech = await db.speechSessions
    .where('patientId')
    .equals(patientId)
    .filter(s => new Date(s.createdAt) >= monthAgo)
    .toArray();

  const correlations = [];

  const memoryTests = tests.filter(t => t.testType === 'word-recall');
  const reactionTests = tests.filter(t => t.testType === 'reaction-time');
  const patternTests = tests.filter(t => ['trail-making', 'stroop'].includes(t.testType));

  if (memoryTests.length >= 2 && speech.length >= 2) {
    const memTrend = calculateTrend(memoryTests.map(t => t.score));
    const speechTrend = calculateTrend(speech.map(s => s.fluencyScore || 70));

    if (memTrend < -5 && speechTrend < -5) {
      correlations.push({
        type: 'strong_cognitive_signal',
        domains: ['memory', 'speech'],
        description: 'Memory and speech both declining together',
        severity: 'high',
        confidence: 85,
        observation: `Memory scores down ${Math.abs(memTrend).toFixed(0)}%, speech fluency down ${Math.abs(speechTrend).toFixed(0)}%. This combination suggests possible cognitive processing changes.`,
      });
    }

    if (memTrend > 5 && speechTrend > 5) {
      correlations.push({
        type: 'positive_sync',
        domains: ['memory', 'speech'],
        description: 'Memory and speech improving together',
        severity: 'low',
        confidence: 80,
        observation: 'Both memory and speech showing improvement, suggesting positive cognitive trajectory.',
      });
    }
  }

  if (checkIns.length >= 3 && tests.length >= 3) {
    const moodScores = checkIns.map(c => c.mood || 3);
    const avgMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
    const testScores = tests.map(t => t.score || 70);
    const avgTest = testScores.reduce((a, b) => a + b, 0) / testScores.length;

    if (avgMood < 2.5 && avgTest < 65) {
      correlations.push({
        type: 'behavioral_concern',
        domains: ['wellbeing', 'cognitive'],
        description: 'Low mood associated with lower cognitive performance',
        severity: 'moderate',
        confidence: 75,
        observation: `Average mood ${avgMood.toFixed(1)}/5 with average test score ${avgTest.toFixed(0)}%. Mood may be influencing cognitive performance.`,
      });
    }

    if (avgMood > 4 && avgTest > 80) {
      correlations.push({
        type: 'positive_behavioral',
        domains: ['wellbeing', 'cognitive'],
        description: 'Good mood associated with better cognitive performance',
        severity: 'low',
        confidence: 70,
        observation: 'Positive mood correlates with stronger cognitive test results.',
      });
    }
  }

  if (speech.length >= 2) {
    const hesitationTrend = calculateTrend(speech.map(s => s.hesitationScore || 20));
    
    if (hesitationTrend > 20) {
      correlations.push({
        type: 'speech_decline',
        domains: ['speech'],
        description: 'Increasing speech hesitation detected',
        severity: 'moderate',
        confidence: 80,
        observation: `Speech hesitation increased by ${hesitationTrend.toFixed(0)}%. May indicate word-finding difficulty.`,
      });
    }

    const wpmTrend = calculateTrend(speech.map(s => s.wpm || 120));
    if (wpmTrend < -15) {
      correlations.push({
        type: 'speech_pace_decline',
        domains: ['speech'],
        description: 'Speaking pace significantly slowed',
        severity: 'moderate',
        confidence: 75,
        observation: `Speech pace decreased by ${Math.abs(wpmTrend).toFixed(0)}%. May indicate processing slowdown.`,
      });
    }
  }

  if (tests.length >= 3) {
    const memoryTrend = memoryTests.length > 0 
      ? calculateTrend(memoryTests.map(t => t.score)) 
      : 0;
    const reactionTrend = reactionTests.length > 0
      ? calculateTrend(reactionTests.map(t => t.score))
      : 0;
    const patternTrend = patternTests.length > 0
      ? calculateTrend(patternTests.map(t => t.score))
      : 0;

    if (memoryTrend < -10 && reactionTrend < -10 && patternTrend < -10) {
      correlations.push({
        type: 'global_decline',
        domains: ['memory', 'reaction', 'pattern'],
        description: 'All cognitive domains declining',
        severity: 'high',
        confidence: 90,
        observation: 'Widespread decline across memory (-' + Math.abs(memoryTrend).toFixed(0) + '%), reaction (-' + Math.abs(reactionTrend).toFixed(0) + '%), and pattern recognition (-' + Math.abs(patternTrend).toFixed(0) + '%). Comprehensive assessment recommended.',
      });
    }

    if (memoryTrend > 10 && patternTrend > 10) {
      correlations.push({
        type: 'cognitive_improvement',
        domains: ['memory', 'pattern'],
        description: 'Memory and executive function both improving',
        severity: 'positive',
        confidence: 85,
        observation: 'Strong improvement in memory and pattern recognition. Continue current activities.',
      });
    }
  }

  if (checkIns.length >= 5) {
    const sleepTrend = calculateTrend(checkIns.map(c => c.sleep || 3));
    const moodTrend = calculateTrend(checkIns.map(c => c.mood || 3));

    if (sleepTrend < -20 && moodTrend < -10) {
      correlations.push({
        type: 'sleep_mood_link',
        domains: ['wellbeing'],
        description: 'Poor sleep associated with low mood',
        severity: 'moderate',
        confidence: 80,
        observation: 'Sleep quality dropped ${Math.abs(sleepTrend).toFixed(0)}% with mood declining ${Math.abs(moodTrend).toFixed(0)}%. Address sleep hygiene.',
      });
    }
  }

  const speechGoodTestsPoor = speech.length > 0 && tests.length > 0;
  if (speechGoodTestsPoor) {
    const recentSpeechAvg = speech[speech.length - 1]?.fluencyScore || 70;
    const recentTestAvg = tests[tests.length - 1]?.score || 70;
    
    if (recentSpeechAvg > 80 && recentTestAvg < 60) {
      correlations.push({
        type: 'early_indicator',
        domains: ['speech', 'cognitive'],
        description: 'Speech preserved but test performance declined',
        severity: 'moderate',
        confidence: 70,
        observation: 'Speech fluency normal but cognitive tests show decline. May indicate early compensatory mechanism.',
      });
    }
  }

  return {
    correlations,
    summary: generateCorrelationSummary(correlations),
    highestSeverity: correlations.length > 0 
      ? correlations.reduce((max, c) => {
          const severityOrder = { high: 0, moderate: 1, low: 2, positive: 3 };
          return severityOrder[c.severity] < severityOrder[max] ? c.severity : max;
        }, 'low')
      : 'none',
    timestamp: new Date().toISOString(),
  };
}

function calculateTrend(values) {
  if (values.length < 2) return 0;
  
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avg = sumY / n;
  
  return avg > 0 ? (slope / avg) * 100 : 0;
}

function generateCorrelationSummary(correlations) {
  if (correlations.length === 0) {
    return 'No significant correlations detected. All metrics are independent.';
  }

  const highSeverity = correlations.filter(c => c.severity === 'high');
  const moderateSeverity = correlations.filter(c => c.severity === 'moderate');

  if (highSeverity.length > 0) {
    return `Critical: ${highSeverity[0].observation}`;
  }

  if (moderateSeverity.length > 0) {
    return `Monitor: ${moderateSeverity[0].observation}`;
  }

  const positive = correlations.filter(c => c.severity === 'positive');
  if (positive.length > 0) {
    return `Good progress: ${positive[0].observation}`;
  }

  return correlations[0]?.observation || 'Metrics within normal range.';
}

export async function getCorrelationAlerts(correlations) {
  const alerts = [];

  correlations.forEach(corr => {
    if (corr.severity === 'high') {
      alerts.push({
        level: 'urgent',
        message: `Critical: ${corr.description}`,
        observation: corr.observation,
        action: 'Schedule comprehensive assessment',
      });
    } else if (corr.severity === 'moderate') {
      alerts.push({
        level: 'warning',
        message: `Pattern detected: ${corr.description}`,
        observation: corr.observation,
        action: 'Continue monitoring',
      });
    }
  });

  return alerts;
}

export function getCorrelatedDomains(correlations) {
  const domains = new Set();
  correlations.forEach(corr => {
    corr.domains.forEach(d => domains.add(d));
  });
  return Array.from(domains);
}
