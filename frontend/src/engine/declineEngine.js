import { db } from '../store/db';

const BASELINE_DAYS = 7;
const DECLINE_THRESHOLDS = {
  MILD: 5,
  MODERATE: 10,
  SEVERE: 20,
};

const RISK_WEIGHTS = {
  cognitiveTests: 0.50,
  speech: 0.25,
  behavior: 0.25,
};

export async function calculateBaseline(patientId = 1) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - BASELINE_DAYS);

  const checkIns = await db.checkIns
    .where('patientId')
    .equals(patientId)
    .filter(c => new Date(c.date) >= cutoffDate)
    .toArray();

  const testResults = await db.testResults
    .where('patientId')
    .equals(patientId)
    .filter(t => new Date(t.completedAt) >= cutoffDate)
    .toArray();

  const speechSessions = await db.speechSessions
    .where('patientId')
    .equals(patientId)
    .filter(s => new Date(s.createdAt) >= cutoffDate)
    .toArray();

  const baseline = {
    memoryScore: 0,
    reactionScore: 0,
    patternScore: 0,
    speechScore: 0,
    wellbeingScore: 0,
    count: 0,
    establishedAt: new Date().toISOString(),
  };

  if (testResults.length === 0 && checkIns.length === 0) {
    baseline.count = 0;
    return baseline;
  }

  let memorySum = 0, memoryCount = 0;
  let reactionSum = 0, reactionCount = 0;
  let patternSum = 0, patternCount = 0;
  let wellbeingSum = 0;

  testResults.forEach(test => {
    const score = test.score || 0;
    switch (test.testType) {
      case 'word-recall':
        memorySum += score;
        memoryCount++;
        break;
      case 'reaction-time':
        reactionSum += score;
        reactionCount++;
        break;
      case 'trail-making':
      case 'stroop':
        patternSum += score;
        patternCount++;
        break;
      default:
        patternSum += score;
        patternCount++;
    }
  });

  checkIns.forEach(ci => {
    wellbeingSum += ((ci.mood || 3) + (ci.sleep || 3)) / 2;
  });

  baseline.memoryScore = memoryCount > 0 ? Math.round(memorySum / memoryCount) : 70;
  baseline.reactionScore = reactionCount > 0 ? Math.round(reactionSum / reactionCount) : 70;
  baseline.patternScore = patternCount > 0 ? Math.round(patternSum / patternCount) : 70;
  baseline.wellbeingScore = checkIns.length > 0 ? Math.round(wellbeingSum / checkIns.length * 20) : 70;
  
  let speechAvg = 0;
  if (speechSessions.length > 0) {
    speechAvg = speechSessions.reduce((sum, s) => sum + (s.fluencyScore || 70), 0) / speechSessions.length;
  }
  baseline.speechScore = Math.round(speechAvg || 70);
  baseline.count = testResults.length + checkIns.length + speechSessions.length;

  return baseline;
}

export async function calculateTrends(patientId = 1, baseline) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentCheckIns = await db.checkIns
    .where('patientId')
    .equals(patientId)
    .filter(c => new Date(c.date) >= weekAgo)
    .toArray();

  const previousCheckIns = await db.checkIns
    .where('patientId')
    .equals(patientId)
    .filter(c => new Date(c.date) >= twoWeeksAgo && new Date(c.date) < weekAgo)
    .toArray();

  const recentTests = await db.testResults
    .where('patientId')
    .equals(patientId)
    .filter(t => new Date(t.completedAt) >= weekAgo)
    .toArray();

  const previousTests = await db.testResults
    .where('patientId')
    .equals(patientId)
    .filter(t => new Date(t.completedAt) >= twoWeeksAgo && new Date(t.completedAt) < weekAgo)
    .toArray();

  const recentSpeech = await db.speechSessions
    .where('patientId')
    .equals(patientId)
    .filter(s => new Date(s.createdAt) >= weekAgo)
    .toArray();

  const previousSpeech = await db.speechSessions
    .where('patientId')
    .equals(patientId)
    .filter(s => new Date(s.createdAt) >= twoWeeksAgo && new Date(s.createdAt) < weekAgo)
    .toArray();

  const calculateAvg = (arr, field) => {
    if (arr.length === 0) return null;
    return arr.reduce((sum, item) => sum + (item[field] || 0), 0) / arr.length;
  };

  const recentMemory = recentTests
    .filter(t => t.testType === 'word-recall')
    .map(t => t.score);
  const prevMemory = previousTests
    .filter(t => t.testType === 'word-recall')
    .map(t => t.score);

  const recentReaction = recentTests
    .filter(t => t.testType === 'reaction-time')
    .map(t => t.score);
  const prevReaction = previousTests
    .filter(t => t.testType === 'reaction-time')
    .map(t => t.score);

  const recentPattern = recentTests
    .filter(t => ['trail-making', 'stroop', 'clock-drawing'].includes(t.testType))
    .map(t => t.score);
  const prevPattern = previousTests
    .filter(t => ['trail-making', 'stroop', 'clock-drawing'].includes(t.testType))
    .map(t => t.score);

  const recentSpeechAvg = calculateAvg(recentSpeech, 'fluencyScore');
  const prevSpeechAvg = calculateAvg(previousSpeech, 'fluencyScore');

  const recentWellbeing = recentCheckIns.length > 0
    ? recentCheckIns.reduce((sum, c) => sum + ((c.mood || 3) + (c.sleep || 3)) / 2, 0) / recentCheckIns.length * 20
    : null;
  const prevWellbeing = previousCheckIns.length > 0
    ? previousCheckIns.reduce((sum, c) => sum + ((c.mood || 3) + (c.sleep || 3)) / 2, 0) / previousCheckIns.length * 20
    : null;

  const calcChange = (recent, baseline) => {
    if (recent === null || baseline === 0) return 0;
    return Math.round(((recent - baseline) / baseline) * 100);
  };

  return {
    memory: {
      current: recentMemory.length > 0 ? Math.round(recentMemory.reduce((a, b) => a + b, 0) / recentMemory.length) : baseline?.memoryScore || 70,
      baseline: baseline?.memoryScore || 70,
      change: recentMemory.length > 0 && baseline?.memoryScore
        ? calcChange(Math.round(recentMemory.reduce((a, b) => a + b, 0) / recentMemory.length), baseline.memoryScore)
        : 0,
    },
    reaction: {
      current: recentReaction.length > 0 ? Math.round(recentReaction.reduce((a, b) => a + b, 0) / recentReaction.length) : baseline?.reactionScore || 70,
      baseline: baseline?.reactionScore || 70,
      change: recentReaction.length > 0 && baseline?.reactionScore
        ? calcChange(Math.round(recentReaction.reduce((a, b) => a + b, 0) / recentReaction.length), baseline.reactionScore)
        : 0,
    },
    pattern: {
      current: recentPattern.length > 0 ? Math.round(recentPattern.reduce((a, b) => a + b, 0) / recentPattern.length) : baseline?.patternScore || 70,
      baseline: baseline?.patternScore || 70,
      change: recentPattern.length > 0 && baseline?.patternScore
        ? calcChange(Math.round(recentPattern.reduce((a, b) => a + b, 0) / recentPattern.length), baseline.patternScore)
        : 0,
    },
    speech: {
      current: recentSpeechAvg || baseline?.speechScore || 70,
      baseline: baseline?.speechScore || 70,
      change: recentSpeechAvg && baseline?.speechScore
        ? calcChange(Math.round(recentSpeechAvg), baseline.speechScore)
        : 0,
    },
    wellbeing: {
      current: recentWellbeing || baseline?.wellbeingScore || 70,
      baseline: baseline?.wellbeingScore || 70,
      change: recentWellbeing && baseline?.wellbeingScore
        ? calcChange(Math.round(recentWellbeing), baseline.wellbeingScore)
        : 0,
    },
    sessionCounts: {
      recent: recentTests.length + recentCheckIns.length + recentSpeech.length,
      previous: previousTests.length + previousCheckIns.length + previousSpeech.length,
      missedCheckIns: Math.max(0, 7 - recentCheckIns.length),
    },
    weekAgo: weekAgo.toISOString(),
  };
}

export function detectDeclineFlags(trends) {
  const flags = [];
  const thresholds = DECLINE_THRESHOLDS;

  Object.entries(trends).forEach(([domain, data]) => {
    if (domain === 'sessionCounts') return;
    
    const { change, current } = data;
    
    if (change <= -thresholds.SEVERE) {
      flags.push({
        domain,
        severity: 'severe',
        change,
        current,
        message: `${domain} dropped ${Math.abs(change)}%`,
      });
    } else if (change <= -thresholds.MODERATE) {
      flags.push({
        domain,
        severity: 'moderate',
        change,
        current,
        message: `${domain} declined ${Math.abs(change)}%`,
      });
    } else if (change <= -thresholds.MILD) {
      flags.push({
        domain,
        severity: 'mild',
        change,
        current,
        message: `${domain} slightly down ${Math.abs(change)}%`,
      });
    }
  });

  if (trends.sessionCounts?.missedCheckIns >= 3) {
    flags.push({
      domain: 'behavior',
      severity: 'moderate',
      change: -trends.sessionCounts.missedCheckIns * 10,
      current: 7 - trends.sessionCounts.missedCheckIns,
      message: `Missed ${trends.sessionCounts.missedCheckIns} check-ins`,
    });
  }

  if (trends.wellbeing?.current < 50) {
    flags.push({
      domain: 'wellbeing',
      severity: 'mild',
      change: trends.wellbeing.change,
      current: trends.wellbeing.current,
      message: 'Low mood/wellbeing scores',
    });
  }

  return flags.sort((a, b) => {
    const severityOrder = { severe: 0, moderate: 1, mild: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export async function calculateRiskScore(patientId = 1) {
  const baseline = await calculateBaseline(patientId);
  
  if (baseline.count < 3) {
    return {
      riskLevel: 'stable',
      confidence: 50,
      reasons: ['Not enough data for accurate assessment. Continue regular assessments.'],
      baseline,
      trends: null,
      flags: [],
    };
  }

  const trends = await calculateTrends(patientId, baseline);
  const flags = detectDeclineFlags(trends);

  const cognitiveChange = (
    trends.memory.change * 0.35 +
    trends.reaction.change * 0.35 +
    trends.pattern.change * 0.30
  );

  const speechChange = trends.speech.change;
  
  const behaviorChange = (
    trends.wellbeing.change * 0.7 +
    (trends.sessionCounts.missedCheckIns > 0 ? -trends.sessionCounts.missedCheckIns * 10 : 0) * 0.3
  );

  const cognitiveScore = 50 + (cognitiveChange * 2);
  const speechScore = 50 + (speechChange * 2);
  const behaviorScore = 50 + (behaviorChange * 2);

  let weightedScore = (
    cognitiveScore * RISK_WEIGHTS.cognitiveTests +
    speechScore * RISK_WEIGHTS.speech +
    behaviorScore * RISK_WEIGHTS.behavior
  );

  const severityPenalty = flags.reduce((penalty, flag) => {
    switch (flag.severity) {
      case 'severe': return penalty + 20;
      case 'moderate': return penalty + 10;
      case 'mild': return penalty + 5;
      default: return penalty;
    }
  }, 0);

  weightedScore = Math.max(0, Math.min(100, weightedScore - severityPenalty));

  let riskLevel = 'stable';
  if (weightedScore < 40) {
    riskLevel = 'high';
  } else if (weightedScore < 60) {
    riskLevel = 'monitor';
  }

  const confidence = Math.min(95, 40 + baseline.count * 5);

  const reasons = flags.length > 0
    ? flags.map(f => `${f.domain}: ${f.message}`)
    : ['All metrics within normal range'];

  return {
    riskLevel,
    confidence,
    reasons,
    baseline,
    trends,
    flags,
    weightedScore: Math.round(weightedScore),
    components: {
      cognitive: Math.round(cognitiveScore),
      speech: Math.round(speechScore),
      behavior: Math.round(behaviorScore),
    },
    analysisDate: new Date().toISOString(),
  };
}

export async function getDeclineReport(patientId = 1) {
  const riskData = await calculateRiskScore(patientId);
  
  return {
    summary: riskData.riskLevel === 'high' 
      ? 'Significant decline detected. Immediate attention recommended.'
      : riskData.riskLevel === 'monitor'
        ? 'Some decline noted. Continue monitoring.'
        : 'Cognitive health stable.',
    riskLevel: riskData.riskLevel,
    confidence: riskData.confidence,
    alerts: riskData.flags.map(f => ({
      type: f.severity,
      domain: f.domain,
      message: f.message,
      action: getActionForFlag(f),
    })),
    baseline: riskData.baseline,
    current: riskData.trends,
    recommendations: generateRecommendations(riskData.flags),
    timestamp: riskData.analysisDate,
  };
}

function getActionForFlag(flag) {
  switch (flag.domain) {
    case 'memory':
      return 'Consider memory exercises and review medication.';
    case 'reaction':
      return 'Try reflex training games.';
    case 'speech':
      return 'Practice reading aloud daily.';
    case 'pattern':
      return 'Engage in puzzles and pattern games.';
    case 'wellbeing':
      return 'Focus on sleep quality and stress reduction.';
    case 'behavior':
      return 'Establish consistent daily check-in routine.';
    default:
      return 'Continue regular monitoring.';
  }
}

function generateRecommendations(flags) {
  const recs = [];
  const domains = new Set(flags.map(f => f.domain));

  if (domains.has('memory')) {
    recs.push({ domain: 'memory', text: 'Practice word recall exercises daily', frequency: 'Daily' });
  }
  if (domains.has('reaction')) {
    recs.push({ domain: 'reaction', text: 'Play reaction time games', frequency: '3x weekly' });
  }
  if (domains.has('speech')) {
    recs.push({ domain: 'speech', text: 'Read aloud for 10 minutes daily', frequency: 'Daily' });
  }
  if (domains.has('pattern')) {
    recs.push({ domain: 'pattern', text: 'Complete puzzles and pattern tasks', frequency: 'Daily' });
  }
  if (domains.has('wellbeing') || domains.has('behavior')) {
    recs.push({ domain: 'wellbeing', text: 'Maintain consistent sleep schedule', frequency: 'Daily' });
  }

  if (recs.length === 0) {
    recs.push({ domain: 'general', text: 'Continue regular activities and assessments', frequency: 'Ongoing' });
  }

  return recs;
}

export async function getWeeklySummary(patientId = 1) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const checkIns = await db.checkIns
    .where('patientId')
    .equals(patientId)
    .filter(c => new Date(c.date) >= weekAgo)
    .toArray();

  const tests = await db.testResults
    .where('patientId')
    .equals(patientId)
    .filter(t => new Date(t.completedAt) >= weekAgo)
    .toArray();

  const speech = await db.speechSessions
    .where('patientId')
    .equals(patientId)
    .filter(s => new Date(s.createdAt) >= weekAgo)
    .toArray();

  const avgMood = checkIns.length > 0
    ? checkIns.reduce((sum, c) => sum + (c.mood || 0), 0) / checkIns.length
    : 0;
  
  const avgSleep = checkIns.length > 0
    ? checkIns.reduce((sum, c) => sum + (c.sleep || 0), 0) / checkIns.length
    : 0;

  const avgTestScore = tests.length > 0
    ? tests.reduce((sum, t) => sum + (t.score || 0), 0) / tests.length
    : 0;

  const avgSpeechScore = speech.length > 0
    ? speech.reduce((sum, s) => sum + (s.fluencyScore || 0), 0) / speech.length
    : 0;

  return {
    period: { start: weekAgo.toISOString(), end: now.toISOString() },
    checkInsCompleted: checkIns.length,
    checkInsTotal: 7,
    testsCompleted: tests.length,
    speechSessions: speech.length,
    avgMood: Math.round(avgMood * 10) / 10,
    avgSleep: Math.round(avgSleep * 10) / 10,
    avgTestScore: Math.round(avgTestScore),
    avgSpeechScore: Math.round(avgSpeechScore),
    adherence: Math.round((checkIns.length / 7) * 100),
    overallScore: Math.round((avgTestScore * 0.4 + avgMood * 20 * 0.3 + avgSpeechScore * 0.3)),
  };
}
