import { calculateRiskScore, getWeeklySummary, detectDeclineFlags } from './declineEngine';
import { analyzeCorrelations, getCorrelationAlerts } from './correlationEngine';

const INTERVENTIONS = {
  memory: {
    exercises: [
      { name: 'Word Recall Practice', duration: '10 min', frequency: 'Daily' },
      { name: 'List Memorization', duration: '5 min', frequency: 'Daily' },
      { name: 'Name-Face Association', duration: '5 min', frequency: '3x/week' },
    ],
    lifestyle: [
      { name: 'Memory Palace Technique', duration: '15 min', frequency: 'Daily' },
      { name: 'Spaced Repetition Review', duration: '10 min', frequency: 'Daily' },
    ],
    threshold: 10,
  },
  reaction: {
    exercises: [
      { name: 'Reaction Time Games', duration: '5 min', frequency: 'Daily' },
      { name: 'Video-based Reflex Training', duration: '10 min', frequency: '3x/week' },
      { name: 'Simple Simon Says', duration: '5 min', frequency: 'Daily' },
    ],
    lifestyle: [
      { name: 'Aerobic Exercise', duration: '30 min', frequency: 'Daily' },
      { name: 'Eye-Hand Coordination Tasks', duration: '15 min', frequency: 'Daily' },
    ],
    threshold: 10,
  },
  speech: {
    exercises: [
      { name: 'Reading Aloud', duration: '10 min', frequency: 'Daily' },
      { name: 'Story Retelling', duration: '10 min', frequency: 'Daily' },
      { name: 'Word Association Games', duration: '5 min', frequency: '3x/week' },
    ],
    lifestyle: [
      { name: 'Sing Along Sessions', duration: '15 min', frequency: 'Daily' },
      { name: 'Conversation Practice', duration: '20 min', frequency: 'Daily' },
    ],
    threshold: 10,
  },
  pattern: {
    exercises: [
      { name: 'Puzzle Solving (Jigsaw)', duration: '20 min', frequency: 'Daily' },
      { name: 'Pattern Recognition Tasks', duration: '10 min', frequency: 'Daily' },
      { name: 'Sudoku or Crosswords', duration: '15 min', frequency: 'Daily' },
    ],
    lifestyle: [
      { name: 'Strategic Board Games', duration: '30 min', frequency: '3x/week' },
      { name: 'Navigation Exercises', duration: '15 min', frequency: 'Daily' },
    ],
    threshold: 10,
  },
  wellbeing: {
    exercises: [
      { name: 'Relaxation Breathing', duration: '5 min', frequency: '2x/day' },
      { name: 'Gentle Stretching', duration: '15 min', frequency: 'Daily' },
    ],
    lifestyle: [
      { name: 'Consistent Sleep Schedule', duration: '8 hrs', frequency: 'Nightly' },
      { name: 'Social Engagement', duration: '30 min', frequency: 'Daily' },
      { name: 'Stress Management', duration: '10 min', frequency: 'Daily' },
    ],
    threshold: 10,
  },
  behavior: {
    exercises: [],
    lifestyle: [
      { name: 'Daily Check-in Routine', duration: '2 min', frequency: 'Daily' },
      { name: 'Activity Scheduling', duration: '5 min', frequency: 'Daily' },
    ],
    threshold: 2,
  },
};

export async function generateInterventions(patientId = 1) {
  const riskData = await calculateRiskScore(patientId);
  const interventions = [];

  riskData.flags.forEach(flag => {
    const domain = flag.domain;
    const intervention = INTERVENTIONS[domain];

    if (intervention) {
      interventions.push({
        domain,
        severity: flag.severity,
        change: flag.change,
        exercises: intervention.exercises.slice(0, 2),
        lifestyle: intervention.lifestyle.slice(0, 2),
        priority: flag.severity === 'severe' ? 'high' : flag.severity === 'moderate' ? 'medium' : 'low',
      });
    }
  });

  if (interventions.length === 0) {
    interventions.push({
      domain: 'maintenance',
      severity: 'positive',
      change: 0,
      exercises: [
        { name: 'Continue Current Routine', duration: 'Ongoing', frequency: 'Daily' },
      ],
      lifestyle: [
        { name: 'Maintain Healthy Lifestyle', duration: 'Ongoing', frequency: 'Daily' },
      ],
      priority: 'low',
    });
  }

  return {
    interventions,
    focusArea: interventions[0]?.domain || 'maintenance',
    urgency: interventions.some(i => i.priority === 'high') ? 'high' : 'normal',
    timestamp: new Date().ISOString(),
  };
}

export function getInterventionForDomain(domain, severity = 'mild') {
  const intervention = INTERVENTIONS[domain];
  
  if (!intervention) {
    return {
      domain,
      recommendations: [
        { name: 'Continue Regular Monitoring', frequency: 'Ongoing' },
      ],
    };
  }

  const count = severity === 'severe' ? 3 : severity === 'moderate' ? 2 : 1;

  return {
    domain,
    recommendations: [
      ...intervention.exercises.slice(0, count),
      ...intervention.lifestyle.slice(0, count),
    ],
  };
}

export async function generateAIRecommendation(patientId = 1) {
  const riskData = await calculateRiskScore(patientId);
  const weeklySummary = await getWeeklySummary(patientId);
  const correlations = await analyzeCorrelations(patientId);

  const lines = [];
  let summary = '';

  if (riskData.riskLevel === 'high') {
    summary = `${riskData.flags[0]?.domain || 'Overall'} performance declined ${Math.abs(riskData.flags[0]?.change || 0)}% over assessment period.`;
  } else if (riskData.riskLevel === 'monitor') {
    summary = `${riskData.flags[0]?.domain || 'Some metrics'} showing ${Math.abs(riskData.flags[0]?.change || 0)}% change.`;
  } else {
    summary = 'Cognitive health metrics stable. Continue regular assessments.';
  }

  lines.push(summary);

  const observations = [];
  
  if (riskData.trends) {
    const { memory, reaction, speech, wellbeing } = riskData.trends;
    
    if (memory && Math.abs(memory.change) >= 5) {
      observations.push(`Memory ${memory.change > 0 ? '↑' : '↓'} ${Math.abs(memory.change)}% (current: ${memory.current}, baseline: ${memory.baseline})`);
    }
    if (reaction && Math.abs(reaction.change) >= 5) {
      observations.push(`Reaction ${reaction.change > 0 ? '↑' : '↓'} ${Math.abs(reaction.change)}% (current: ${reaction.current}, baseline: ${reaction.baseline})`);
    }
    if (speech && Math.abs(speech.change) >= 5) {
      observations.push(`Speech ${speech.change > 0 ? '↑' : '↓'} ${Math.abs(speech.change)}% (current: ${speech.current}, baseline: ${speech.baseline})`);
    }
    if (wellbeing && Math.abs(wellbeing.change) >= 5) {
      observations.push(`Wellbeing ${wellbeing.change > 0 ? '↑' : '↓'} ${Math.abs(wellbeing.change)}% (current: ${wellbeing.current}, baseline: ${wellbeing.baseline})`);
    }
  }

  if (correlations.correlations.length > 0) {
    const strongest = correlations.correlations.reduce((max, c) => 
      c.confidence > max.confidence ? c : max
    , correlations.correlations[0]);
    
    if (strongest && strongest.severity !== 'positive') {
      observations.push(strongest.observation);
    }
  }

  const recommendations = [];
  const flaggedDomains = new Set(riskData.flags.map(f => f.domain));

  if (flaggedDomains.has('memory')) {
    recommendations.push('Practice memory exercises daily for 10 minutes');
  }
  if (flaggedDomains.has('reaction')) {
    recommendations.push('Try reaction time games to improve processing speed');
  }
  if (flaggedDomains.has('speech')) {
    recommendations.push('Read aloud for 10 minutes to maintain verbal fluency');
  }
  if (flaggedDomains.has('wellbeing') || flaggedDomains.has('behavior')) {
    recommendations.push('Maintain consistent sleep schedule and daily routine');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue current activities and regular assessments');
  }

  return {
    summary,
    observations: observations.slice(0, 3),
    recommendations: recommendations.slice(0, 2),
    riskLevel: riskData.riskLevel,
    confidence: riskData.confidence,
    weeklyStats: {
      checkIns: `${weeklySummary.checkInsCompleted}/7`,
      tests: weeklySummary.testsCompleted,
      adherence: `${weeklySummary.adherence}%`,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function generateCaregiverInsight(patientId = 1, patientName = 'Patient') {
  const riskData = await calculateRiskScore(patientId);
  const weeklySummary = await getWeeklySummary(patientId);
  const correlations = await analyzeCorrelations(patientId);

  let status = 'stable';
  let alertMessage = '';
  let action = 'Continue regular monitoring';

  if (riskData.riskLevel === 'high') {
    status = 'declining';
    const topFlag = riskData.flags[0];
    alertMessage = `${patientName}'s ${topFlag?.domain || 'cognitive'} score dropped ${Math.abs(topFlag?.change || 0)}% this week.`;
    action = 'Consider scheduling a comprehensive assessment';
  } else if (riskData.riskLevel === 'monitor') {
    status = 'monitor';
    const flags = riskData.flags.filter(f => f.severity !== 'mild');
    if (flags.length > 0) {
      alertMessage = `${patientName} shows changes in ${flags.map(f => f.domain).join(', ')}.`;
      action = 'Continue monitoring closely';
    }
  }

  if (correlations.highestSeverity === 'high') {
    const highCorr = correlations.correlations.find(c => c.severity === 'high');
    if (highCorr) {
      alertMessage += ` Pattern: ${highCorr.description}.`;
    }
  }

  return {
    status,
    alertMessage: alertMessage || `No significant concerns detected for ${patientName}.`,
    action,
    metrics: {
      cognitiveScore: riskData.weightedScore,
      weeklyCheckins: `${weeklySummary.checkInsCompleted}/7`,
      weeklyTests: weeklySummary.testsCompleted,
      adherence: `${weeklySummary.adherence}%`,
    },
    alerts: riskData.flags.map(f => ({
      domain: f.domain,
      severity: f.severity,
      message: f.message,
    })),
    timestamp: new Date().toISOString(),
  };
}
