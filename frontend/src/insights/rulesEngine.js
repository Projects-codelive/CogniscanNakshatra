export const INSIGHT_TYPES = {
  TREND: 'trend',
  WARNING: 'warning',
  ACHIEVEMENT: 'achievement',
  RECOMMENDATION: 'recommendation',
  PATTERN: 'pattern',
};

export const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const rules = [
  {
    id: 'low_cogniscore',
    name: 'Low CogniScore Alert',
    type: INSIGHT_TYPES.WARNING,
    severity: SEVERITY.HIGH,
    condition: (data) => data.cogniScore !== null && data.cogniScore < 50,
    message: 'Your CogniScore has dropped below 50. Consider consulting a healthcare professional.',
    action: 'Schedule an appointment with your doctor',
  },
  {
    id: 'declining_trend',
    name: 'Declining Score Trend',
    type: INSIGHT_TYPES.TREND,
    severity: SEVERITY.MEDIUM,
    condition: (data) => {
      if (!data.scoreHistory || data.scoreHistory.length < 3) return false;
      const recent = data.scoreHistory.slice(-3);
      return recent.every((s, i) => i === 0 || s <= recent[i - 1]);
    },
    message: 'Your scores have been declining over the past few assessments.',
    action: 'Consider increasing cognitive exercises or consulting a professional',
  },
  {
    id: 'improving_trend',
    name: 'Improving Score Trend',
    type: INSIGHT_TYPES.TREND,
    severity: SEVERITY.LOW,
    condition: (data) => {
      if (!data.scoreHistory || data.scoreHistory.length < 3) return false;
      const recent = data.scoreHistory.slice(-3);
      return recent.every((s, i) => i === 0 || s >= recent[i - 1] - 2);
    },
    message: 'Great progress! Your scores have been consistently improving.',
    action: 'Keep up the good work with your daily activities',
  },
  {
    id: 'missed_checkins',
    name: 'Inconsistent Check-ins',
    type: INSIGHT_TYPES.PATTERN,
    severity: SEVERITY.MEDIUM,
    condition: (data) => {
      if (!data.checkIns || data.checkIns.length < 7) return false;
      const last7 = data.checkIns.slice(-7);
      const missedDays = last7.filter(c => !c.completed).length;
      return missedDays >= 3;
    },
    message: 'You have missed several daily check-ins recently.',
    action: 'Try to complete daily check-ins for better tracking',
  },
  {
    id: 'sleep_pattern',
    name: 'Sleep Pattern Detected',
    type: INSIGHT_TYPES.PATTERN,
    severity: SEVERITY.MEDIUM,
    condition: (data) => {
      if (!data.checkIns || data.checkIns.length < 7) return false;
      const last7 = data.checkIns.slice(-7);
      const avgSleep = last7.reduce((sum, c) => sum + (c.sleep || 0), 0) / last7.length;
      return avgSleep < 3;
    },
    message: 'Your average sleep quality has been below normal.',
    action: 'Consider improving sleep habits - aim for 7-8 hours',
  },
  {
    id: 'mood_correlation',
    name: 'Mood-Score Correlation',
    type: INSIGHT_TYPES.PATTERN,
    severity: SEVERITY.LOW,
    condition: (data) => {
      if (!data.checkIns || data.checkIns.length < 5) return false;
      const recent = data.checkIns.slice(-5);
      const avgMood = recent.reduce((sum, c) => sum + (c.mood || 0), 0) / recent.length;
      return avgMood >= 4;
    },
    message: 'Your mood has been consistently positive lately!',
    action: 'Keep maintaining your positive mindset',
  },
  {
    id: 'medication_adherence',
    name: 'Medication Adherence',
    type: INSIGHT_TYPES.RECOMMENDATION,
    severity: SEVERITY.HIGH,
    condition: (data) => {
      if (!data.medicationLogs || data.medicationLogs.length < 7) return false;
      const last14 = data.medicationLogs.slice(-14);
      const taken = last14.filter(l => l.status === 'taken').length;
      const adherence = (taken / last14.length) * 100;
      return adherence < 80;
    },
    message: 'Your medication adherence has dropped below 80%.',
    action: 'Set reminders to take your medications on time',
  },
  {
    id: 'test_completion',
    name: 'Test Completion Streak',
    type: INSIGHT_TYPES.ACHIEVEMENT,
    severity: SEVERITY.LOW,
    condition: (data) => {
      if (!data.testResults || data.testResults.length < 5) return false;
      const recent = data.testResults.slice(-5);
      return recent.length >= 5;
    },
    message: 'You have completed 5 cognitive tests!',
    action: 'Keep challenging yourself with different tests',
  },
  {
    id: 'speech_fluency',
    name: 'Speech Analysis Complete',
    type: INSIGHT_TYPES.PATTERN,
    severity: SEVERITY.LOW,
    condition: (data) => {
      if (!data.speechSessions || data.speechSessions.length < 3) return false;
      const recent = data.speechSessions.slice(-3);
      const avgFluency = recent.reduce((sum, s) => sum + (s.fluencyScore || 0), 0) / 3;
      return avgFluency >= 75;
    },
    message: 'Your speech fluency is showing improvement!',
    action: 'Continue with regular speech exercises',
  },
  {
    id: 'streak_achievement',
    name: 'Check-in Streak',
    type: INSIGHT_TYPES.ACHIEVEMENT,
    severity: SEVERITY.LOW,
    condition: (data) => data.streak >= 7,
    message: 'Amazing! You have maintained a 7-day check-in streak.',
    action: 'Keep up the excellent work!',
  },
  {
    id: 'low_energy',
    name: 'Low Energy Warning',
    type: INSIGHT_TYPES.WARNING,
    severity: SEVERITY.MEDIUM,
    condition: (data) => {
      if (!data.checkIns || data.checkIns.length < 3) return false;
      const last3 = data.checkIns.slice(-3);
      const avgEnergy = last3.reduce((sum, c) => sum + (c.energy || 0), 0) / 3;
      return avgEnergy < 2.5;
    },
    message: 'Your energy levels have been consistently low.',
    action: 'Consider light exercise and proper nutrition',
  },
  {
    id: 'good_adherence',
    name: 'Medication Adherence Good',
    type: INSIGHT_TYPES.ACHIEVEMENT,
    severity: SEVERITY.LOW,
    condition: (data) => {
      if (!data.medicationLogs || data.medicationLogs.length < 7) return false;
      const last14 = data.medicationLogs.slice(-14);
      const taken = last14.filter(l => l.status === 'taken').length;
      const adherence = (taken / last14.length) * 100;
      return adherence >= 90;
    },
    message: 'Excellent! Your medication adherence is above 90%.',
    action: 'Keep taking your medications consistently',
  },
];

export function evaluateRules(data) {
  const insights = [];
  
  for (const rule of rules) {
    try {
      if (rule.condition(data)) {
        insights.push({
          id: rule.id,
          name: rule.name,
          type: rule.type,
          severity: rule.severity,
          message: rule.message,
          action: rule.action,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
    }
  }

  insights.sort((a, b) => {
    const severityOrder = {
      [SEVERITY.CRITICAL]: 0,
      [SEVERITY.HIGH]: 1,
      [SEVERITY.MEDIUM]: 2,
      [SEVERITY.LOW]: 3,
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return insights;
}

export function getInsightIcon(type) {
  switch (type) {
    case INSIGHT_TYPES.TREND:
      return '📈';
    case INSIGHT_TYPES.WARNING:
      return '⚠️';
    case INSIGHT_TYPES.ACHIEVEMENT:
      return '🏆';
    case INSIGHT_TYPES.RECOMMENDATION:
      return '💡';
    case INSIGHT_TYPES.PATTERN:
      return '🔍';
    default:
      return '📊';
  }
}

export function getSeverityColor(severity) {
  switch (severity) {
    case SEVERITY.CRITICAL:
      return '#ef4444';
    case SEVERITY.HIGH:
      return '#f59e0b';
    case SEVERITY.MEDIUM:
      return '#3b82f6';
    case SEVERITY.LOW:
      return '#10b981';
    default:
      return '#64748b';
  }
}

export function generateInsightsFromData(data) {
  const scoreHistory = [];
  if (data.testResults) {
    const sorted = [...data.testResults].sort((a, b) => 
      new Date(a.completedAt) - new Date(b.completedAt)
    );
    scoreHistory.push(...sorted.map(t => t.score));
  }

  const enrichedData = {
    ...data,
    scoreHistory,
  };

  return evaluateRules(enrichedData);
}
