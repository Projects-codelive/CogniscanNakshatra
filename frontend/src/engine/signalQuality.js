import { db } from '../store/db';

export async function analyzeSpeechSignalQuality(patientId = 1, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sessions = await db.speechSessions
    .where('patientId')
    .equals(patientId)
    .filter(s => new Date(s.createdAt) >= since)
    .toArray();

  if (sessions.length < 2) {
    return {
      quality: 'insufficient_data',
      message: 'Need more speech sessions for quality assessment',
      sessions: sessions.length,
      metrics: null,
    };
  }

  const hesitationScores = sessions.map(s => s.hesitationScore || 20);
  const wpmScores = sessions.map(s => s.wpm || 120);
  const pauseCounts = sessions.map(s => s.pauseCount || 0);
  const fluencyScores = sessions.map(s => s.fluencyScore || 70);

  const hesitationTrend = calculateTrend(hesitationScores);
  const wpmTrend = calculateTrend(wpmScores);
  const fluencyTrend = calculateTrend(fluencyScores);

  const avgHesitation = hesitationScores.reduce((a, b) => a + b, 0) / hesitationScores.length;
  const avgWpm = wpmScores.reduce((a, b) => a + b, 0) / wpmScores.length;
  const avgFluency = fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length;

  let quality = 'good';
  let concerns = [];
  let score = 100;

  if (hesitationTrend > 25) {
    concerns.push('Hesitation increasing significantly');
    score -= 30;
  } else if (hesitationTrend > 15) {
    concerns.push('Hesitation slightly increasing');
    score -= 15;
  }

  if (wpmTrend < -20) {
    concerns.push('Speech pace noticeably slowing');
    score -= 25;
  } else if (wpmTrend < -10) {
    concerns.push('Speech pace slightly slower');
    score -= 10;
  }

  if (fluencyTrend < -15) {
    concerns.push('Overall fluency declining');
    score -= 25;
  } else if (fluencyTrend < -8) {
    concerns.push('Fluency slightly reduced');
    score -= 10;
  }

  if (avgHesitation > 40) {
    concerns.push('High average hesitation');
    score -= 15;
  }

  if (score >= 80) quality = 'good';
  else if (score >= 60) quality = 'moderate';
  else quality = 'concerning';

  return {
    quality,
    score: Math.max(0, score),
    concerns,
    sessions: sessions.length,
    timeWindow: `${days} days`,
    metrics: {
      hesitation: {
        current: hesitationScores[hesitationScores.length - 1],
        average: Math.round(avgHesitation),
        trend: Math.round(hesitationTrend),
        description: hesitationTrend > 0 ? 'Increasing pauses/fillers' : hesitationTrend < 0 ? 'Improving fluency' : 'Stable',
      },
      pace: {
        current: wpmScores[wpmScores.length - 1],
        average: Math.round(avgWpm),
        trend: Math.round(wpmTrend),
        description: wpmTrend > 0 ? 'Speaking faster' : wpmTrend < 0 ? 'Speaking slower' : 'Stable pace',
      },
      fluency: {
        current: fluencyScores[fluencyScores.length - 1],
        average: Math.round(avgFluency),
        trend: Math.round(fluencyTrend),
        description: fluencyTrend > 0 ? 'Improving' : fluencyTrend < 0 ? 'Declining' : 'Stable',
      },
    },
    recommendations: generateSpeechRecommendations(quality, concerns),
    timestamp: new Date().toISOString(),
  };
}

export async function analyzeFacialSignalQuality(patientId = 1, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sessions = await db.facialSessions
    .where('patientId')
    .equals(patientId)
    .filter(s => new Date(s.createdAt) >= since)
    .toArray();

  if (sessions.length < 2) {
    return {
      quality: 'insufficient_data',
      message: 'Need more facial sessions for quality assessment',
      sessions: sessions.length,
      metrics: null,
    };
  }

  const attentionScores = sessions.map(s => s.attentionScore || 80);
  const emotionalVariance = sessions.map(s => s.emotionalVariance || 30);
  const engagementScores = sessions.map(s => s.engagementScore || 75);
  const eyeContactScores = sessions.map(s => s.eyeContactScore || 70);

  const attentionTrend = calculateTrend(attentionScores);
  const engagementTrend = calculateTrend(engagementScores);
  const eyeContactTrend = calculateTrend(eyeContactScores);

  const avgAttention = attentionScores.reduce((a, b) => a + b, 0) / attentionScores.length;
  const avgEngagement = engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length;
  const avgEyeContact = eyeContactScores.reduce((a, b) => a + b, 0) / eyeContactScores.length;

  let quality = 'good';
  let concerns = [];
  let score = 100;

  if (attentionTrend < -20) {
    concerns.push('Attention significantly declining');
    score -= 30;
  } else if (attentionTrend < -10) {
    concerns.push('Attention slightly decreasing');
    score -= 15;
  }

  if (engagementTrend < -15) {
    concerns.push('Facial engagement notably reduced');
    score -= 25;
  } else if (engagementTrend < -8) {
    concerns.push('Facial engagement slightly lower');
    score -= 10;
  }

  if (avgAttention < 60) {
    concerns.push('Low sustained attention');
    score -= 20;
  }

  if (avgEyeContact < 50) {
    concerns.push('Reduced eye contact');
    score -= 15;
  }

  if (emotionalVariance.length > 0) {
    const avgVariance = emotionalVariance.reduce((a, b) => a + b, 0) / emotionalVariance.length;
    if (avgVariance < 15) {
      concerns.push('Emotional flatness detected');
      score -= 20;
    }
  }

  if (score >= 80) quality = 'good';
  else if (score >= 60) quality = 'moderate';
  else quality = 'concerning';

  return {
    quality,
    score: Math.max(0, score),
    concerns,
    sessions: sessions.length,
    timeWindow: `${days} days`,
    metrics: {
      attention: {
        current: attentionScores[attentionScores.length - 1],
        average: Math.round(avgAttention),
        trend: Math.round(attentionTrend),
        description: attentionTrend > 0 ? 'Improving focus' : attentionTrend < 0 ? 'Decreasing focus' : 'Stable attention',
      },
      engagement: {
        current: engagementScores[engagementScores.length - 1],
        average: Math.round(avgEngagement),
        trend: Math.round(engagementTrend),
        description: engagementTrend > 0 ? 'More expressive' : engagementTrend < 0 ? 'Less expressive' : 'Stable engagement',
      },
      eyeContact: {
        current: eyeContactScores[eyeContactScores.length - 1],
        average: Math.round(avgEyeContact),
        trend: Math.round(eyeContactTrend),
        description: eyeContactTrend > 0 ? 'More eye contact' : eyeContactTrend < 0 ? 'Less eye contact' : 'Stable eye contact',
      },
      emotionalVariance: {
        current: emotionalVariance[emotionalVariance.length - 1],
        average: Math.round(emotionalVariance.reduce((a, b) => a + b, 0) / emotionalVariance.length),
        trend: 0,
        description: 'Range of emotional expressions',
      },
    },
    recommendations: generateFacialRecommendations(quality, concerns),
    timestamp: new Date().toISOString(),
  };
}

export async function getCombinedSignalQuality(patientId = 1, days = 30) {
  const speech = await analyzeSpeechSignalQuality(patientId, days);
  const facial = await analyzeFacialSignalQuality(patientId, days);

  const speechScore = speech.quality === 'good' ? 100 : speech.quality === 'moderate' ? 70 : 40;
  const facialScore = facial.quality === 'good' ? 100 : facial.quality === 'moderate' ? 70 : 40;
  const combinedScore = (speechScore + facialScore) / 2;

  let overallQuality = 'good';
  if (combinedScore < 50) overallQuality = 'concerning';
  else if (combinedScore < 80) overallQuality = 'moderate';

  return {
    overallQuality,
    combinedScore: Math.round(combinedScore),
    speech: speech.metrics ? speech : null,
    facial: facial.metrics ? facial : null,
    alerts: getSignalAlerts(speech, facial),
    timestamp: new Date().toISOString(),
  };
}

function getSignalAlerts(speech, facial) {
  const alerts = [];

  if (speech.quality === 'concerning') {
    alerts.push({
      type: 'speech',
      severity: 'high',
      message: speech.concerns[0] || 'Speech quality concerning',
      action: 'Consider speech therapy evaluation',
    });
  } else if (speech.quality === 'moderate') {
    alerts.push({
      type: 'speech',
      severity: 'moderate',
      message: speech.concerns[0] || 'Speech quality moderate',
      action: 'Continue monitoring speech patterns',
    });
  }

  if (facial.quality === 'concerning') {
    alerts.push({
      type: 'facial',
      severity: 'high',
      message: facial.concerns[0] || 'Facial engagement concerning',
      action: 'Consider emotional wellness check',
    });
  } else if (facial.quality === 'moderate') {
    alerts.push({
      type: 'facial',
      severity: 'moderate',
      message: facial.concerns[0] || 'Facial engagement moderate',
      action: 'Continue monitoring engagement levels',
    });
  }

  return alerts;
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

function generateSpeechRecommendations(quality, concerns) {
  if (quality === 'good') {
    return ['Continue regular speech practice activities'];
  }
  
  const recs = [];
  if (concerns.some(c => c.includes('Hesitation'))) {
    recs.push('Practice reading aloud for 10 minutes daily');
    recs.push('Try word association games to reduce fillers');
  }
  if (concerns.some(c => c.includes('pace') || c.includes('slower'))) {
    recs.push('Engage in conversation practice sessions');
    recs.push('Consider speech rhythm exercises');
  }
  if (concerns.some(c => c.includes('Fluency'))) {
    recs.push('Work with speech therapy exercises');
    recs.push('Practice tongue twisters and articulation');
  }
  
  return recs.length > 0 ? recs : ['Monitor speech patterns closely'];
}

function generateFacialRecommendations(quality, concerns) {
  if (quality === 'good') {
    return ['Continue social engagement activities'];
  }
  
  const recs = [];
  if (concerns.some(c => c.includes('Attention'))) {
    recs.push('Practice focused attention exercises');
    recs.push('Try mindfulness activities for 5 minutes daily');
  }
  if (concerns.some(c => c.includes('engagement') || c.includes('expressive'))) {
    recs.push('Engage in more face-to-face conversations');
    recs.push('Practice expressing emotions through facial expressions');
  }
  if (concerns.some(c => c.includes('eye contact'))) {
    recs.push('Work on eye contact during conversations');
    recs.push('Practice looking at faces in photos and videos');
  }
  if (concerns.some(c => c.includes('flatness'))) {
    recs.push('Try emotional expression exercises');
    recs.push('Watch emotional content and practice matching expressions');
  }
  
  return recs.length > 0 ? recs : ['Continue monitoring facial engagement'];
}
