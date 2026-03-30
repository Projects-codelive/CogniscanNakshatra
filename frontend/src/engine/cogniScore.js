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
    if (scores.hasOwnProperty(result.testType)) {
      scores[result.testType] = result.score;
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
  const avgFluency = recentSessions.reduce((sum, s) => sum + (s.fluencyScore || 0), 0) / recentSessions.length;
  const avgComplexity = recentSessions.reduce((sum, s) => sum + (s.complexityScore || 0), 0) / recentSessions.length;
  
  return Math.round((avgFluency * 0.6 + avgComplexity * 0.4) * 100);
}

export function calculateFacialAnalysisScore(facialSessions) {
  if (!facialSessions || facialSessions.length === 0) return null;

  const recentSessions = facialSessions.slice(-5);
  const avgMood = recentSessions.reduce((sum, s) => sum + (s.moodScore || 0), 0) / recentSessions.length;
  const avgEngagement = recentSessions.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / recentSessions.length;
  
  return Math.round((avgMood * 0.5 + avgEngagement * 0.5) * 100);
}

export function calculateCheckInScore(checkIns) {
  if (!checkIns || checkIns.length === 0) return null;

  const recentCheckIns = checkIns.slice(-7);
  const completionRate = recentCheckIns.filter((c) => c.completed).length / recentCheckIns.length;
  
  const avgMood = recentCheckIns.reduce((sum, c) => sum + (c.mood || 3), 0) / recentCheckIns.length;
  const avgEnergy = recentCheckIns.reduce((sum, c) => sum + (c.energy || 3), 0) / recentCheckIns.length;
  
  const moodScore = (avgMood / 5) * 100;
  const energyScore = (avgEnergy / 5) * 100;
  const completionScore = completionRate * 100;
  
  return Math.round((moodScore * 0.4 + energyScore * 0.3 + completionScore * 0.3));
}

export function calculateMedicationScore(medicationLogs) {
  if (!medicationLogs || medicationLogs.length === 0) return null;

  const recentLogs = medicationLogs.slice(-14);
  const taken = recentLogs.filter((l) => l.status === 'taken' || l.status === 'skipped_verified').length;
  const total = recentLogs.length;
  
  if (total === 0) return null;
  
  return Math.round((taken / total) * 100);
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
