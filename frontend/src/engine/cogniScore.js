export const WEIGHTS = {
  cognitiveTests: 0.35,
  speechAnalysis: 0.25,
  facialAnalysis: 0.15,
  checkIns: 0.15,
  medications: 0.10,
};

export const SCORE_RANGES = {
  excellent: { min: 80, label: 'Excellent', color: '#10b981' },
  good: { min: 60, label: 'Good', color: '#06b6d4' },
  moderate: { min: 40, label: 'Moderate', color: '#f59e0b' },
  needsAttention: { min: 0, label: 'Needs Attention', color: '#ef4444' },
};

export function getScoreCategory(score) {
  if (score >= 80) return SCORE_RANGES.excellent;
  if (score >= 60) return SCORE_RANGES.good;
  if (score >= 40) return SCORE_RANGES.moderate;
  return SCORE_RANGES.needsAttention;
}

export function calculateCognitiveTestScore(testResults) {
  if (!testResults || testResults.length === 0) return null;

  const scores = {
    'clock-drawing': null,
    'word-recall': null,
    'trail-making': null,
    'stroop': null,
    'reaction-time': null,
  };

  testResults.forEach((result) => {
    const testType = result.testType;
    if (scores.hasOwnProperty(testType)) {
      scores[testType] = result.score;
    } else if (testType === 'clock_drawing') {
      scores['clock-drawing'] = result.score;
    } else if (testType === 'word_recall') {
      scores['word-recall'] = result.score;
    } else if (testType === 'trail_making') {
      scores['trail-making'] = result.score;
    } else if (testType === 'reaction_time') {
      scores['reaction-time'] = result.score;
    }
  });

  const availableTests = Object.values(scores).filter((s) => s !== null);
  if (availableTests.length === 0) return null;

  let totalScore = 0;
  let totalWeight = 0;

  if (scores['clock-drawing'] !== null) {
    totalScore += scores['clock-drawing'] * 0.25;
    totalWeight += 0.25;
  }
  if (scores['word-recall'] !== null) {
    totalScore += scores['word-recall'] * 0.25;
    totalWeight += 0.25;
  }
  if (scores['trail-making'] !== null) {
    totalScore += scores['trail-making'] * 0.20;
    totalWeight += 0.20;
  }
  if (scores['stroop'] !== null) {
    totalScore += scores['stroop'] * 0.15;
    totalWeight += 0.15;
  }
  if (scores['reaction-time'] !== null) {
    totalScore += scores['reaction-time'] * 0.15;
    totalWeight += 0.15;
  }

  return totalWeight > 0 ? (totalScore / totalWeight) : null;
}

export function calculateSpeechAnalysisScore(speechSessions) {
  if (!speechSessions || speechSessions.length === 0) return null;

  const recentSessions = speechSessions.slice(-5);
  const avgFluency = recentSessions.reduce((sum, s) => sum + (s.cognitive_fluency_score || s.fluencyScore || 0), 0) / recentSessions.length;
  const avgComplexity = recentSessions.reduce((sum, s) => sum + (s.complexityScore || 50), 0) / recentSessions.length;
  
  return Math.round(avgFluency);
}

export function calculateFacialAnalysisScore(facialSessions) {
  if (!facialSessions || facialSessions.length === 0) return null;

  const recentSessions = facialSessions.slice(-5);
  const avgMood = recentSessions.reduce((sum, s) => sum + (s.moodScore || s.mood_score || 0), 0) / recentSessions.length;
  const avgEngagement = recentSessions.reduce((sum, s) => sum + (s.engagementScore || s.engagement_score || 0), 0) / recentSessions.length;
  
  return Math.round(avgMood);
}

export function calculateCheckInScore(checkIns) {
  if (!checkIns || checkIns.length === 0) return null;

  const recentCheckIns = checkIns.slice(-7);
  const completionRate = recentCheckIns.length > 0 ? recentCheckIns.length / 7 : 0;
  
  const avgMood = recentCheckIns.reduce((sum, c) => sum + (c.mood || 3), 0) / recentCheckIns.length;
  const avgSleep = recentCheckIns.reduce((sum, c) => sum + (c.sleep || 3), 0) / recentCheckIns.length;
  
  const moodScore = (avgMood / 5) * 100;
  const sleepScore = (avgSleep / 5) * 100;
  const completionScore = completionRate * 100;
  
  return Math.round((moodScore * 0.5 + sleepScore * 0.3 + completionScore * 0.2));
}

export function calculateMedicationScore(medications) {
  if (!medications || medications.length === 0) return null;

  const today = new Date();
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  let totalDoses = 0;
  let takenDoses = 0;

  medications.forEach(med => {
    const freq = med.frequency || 1;
    totalDoses += last7Days.length * freq;
    last7Days.forEach(day => {
      const dayTaken = med.taken?.find(t => t.date === day);
      if (dayTaken?.taken) {
        takenDoses += 1;
      }
    });
  });

  if (totalDoses === 0) return null;
  
  return Math.round((takenDoses / totalDoses) * 100);
}

export function calculateOverallCogniScore(componentScores) {
  const {
    cognitiveTests,
    speechAnalysis,
    facialAnalysis,
    checkIns,
    medications,
  } = componentScores;

  const availableWeights = {
    cognitiveTests: cognitiveTests !== null ? WEIGHTS.cognitiveTests : 0,
    speechAnalysis: speechAnalysis !== null ? WEIGHTS.speechAnalysis : 0,
    facialAnalysis: facialAnalysis !== null ? WEIGHTS.facialAnalysis : 0,
    checkIns: checkIns !== null ? WEIGHTS.checkIns : 0,
    medications: medications !== null ? WEIGHTS.medications : 0,
  };

  const totalAvailableWeight = Object.values(availableWeights).reduce((a, b) => a + b, 0);
  
  if (totalAvailableWeight === 0) return null;

  let weightedSum = 0;
  
  if (cognitiveTests !== null) weightedSum += cognitiveTests * (WEIGHTS.cognitiveTests / totalAvailableWeight);
  if (speechAnalysis !== null) weightedSum += speechAnalysis * (WEIGHTS.speechAnalysis / totalAvailableWeight);
  if (facialAnalysis !== null) weightedSum += facialAnalysis * (WEIGHTS.facialAnalysis / totalAvailableWeight);
  if (checkIns !== null) weightedSum += checkIns * (WEIGHTS.checkIns / totalAvailableWeight);
  if (medications !== null) weightedSum += medications * (WEIGHTS.medications / totalAvailableWeight);

  return Math.round(weightedSum);
}

export function calculateAllScores(data) {
  const {
    testResults = [],
    speechSessions = [],
    facialSessions = [],
    checkIns = [],
    medicationLogs = [],
  } = data;

  const cognitiveTests = calculateCognitiveTestScore(testResults);
  const speechAnalysis = calculateSpeechAnalysisScore(speechSessions);
  const facialAnalysis = calculateFacialAnalysisScore(facialSessions);
  const checkInScore = calculateCheckInScore(checkIns);
  const medicationScore = calculateMedicationScore(medicationLogs);

  const overall = calculateOverallCogniScore({
    cognitiveTests,
    speechAnalysis,
    facialAnalysis,
    checkIns: checkInScore,
    medications: medicationScore,
  });

  return {
    overall,
    breakdown: {
      cognitiveTests,
      speechAnalysis,
      facialAnalysis,
      checkIns: checkInScore,
      medications: medicationScore,
    },
    weights: WEIGHTS,
  };
}

export function getTrendDirection(current, previous) {
  if (previous === null || previous === undefined) return 'stable';
  const diff = current - previous;
  if (Math.abs(diff) < 2) return 'stable';
  return diff > 0 ? 'improving' : 'declining';
}

export function formatScore(score) {
  if (score === null || score === undefined) return '--';
  return `${Math.round(score)}`;
}
