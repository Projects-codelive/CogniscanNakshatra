import { calculateRiskScore, getWeeklySummary, calculateBaseline, calculateTrends, detectDeclineFlags } from './declineEngine';
import { analyzeCorrelations } from './correlationEngine';
import { getCombinedSignalQuality } from './signalQuality';

export async function generateMedicalReport(patientId = 1, patientName = 'Patient') {
  const [riskData, weekly, baseline, trends, correlations, signalQuality] = await Promise.all([
    calculateRiskScore(patientId),
    getWeeklySummary(patientId),
    calculateBaseline(patientId),
    calculateTrends(patientId, baseline),
    analyzeCorrelations(patientId),
    getCombinedSignalQuality(patientId, 30),
  ]);

  const flags = detectDeclineFlags(trends);
  
  const sections = [];
  
  sections.push({
    title: 'Assessment Summary',
    type: 'summary',
    content: generateSummarySection(riskData, patientName),
  });
  
  sections.push({
    title: 'Cognitive Domain Analysis',
    type: 'domains',
    content: generateDomainSection(trends, baseline, flags),
  });
  
  if (correlations.correlations.length > 0) {
    sections.push({
      title: 'Pattern Analysis',
      type: 'patterns',
      content: generatePatternSection(correlations),
    });
  }
  
  if (signalQuality.overalQuality !== 'good' || signalQuality.speech || signalQuality.facial) {
    sections.push({
      title: 'Behavioral Signals',
      type: 'signals',
      content: generateSignalSection(signalQuality),
    });
  }
  
  sections.push({
    title: 'Recommendations',
    type: 'recommendations',
    content: generateRecommendationsSection(flags, correlations),
  });

  return {
    header: {
      patientName,
      assessmentDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      }),
      reportId: `NAK-${Date.now().toString(36).toUpperCase()}`,
      confidenceLevel: `${riskData.confidence}%`,
    },
    sections,
    footer: {
      disclaimer: 'This report is generated for monitoring purposes and should not be used as a substitute for professional medical diagnosis. Please consult with a healthcare provider for clinical assessment.',
      generatedAt: new Date().toISOString(),
    },
  };
}

function generateSummarySection(riskData, patientName) {
  const riskLabel = riskData.riskLevel === 'high' ? 'ELEVATED CONCERN' :
                    riskData.riskLevel === 'monitor' ? 'MODERATE CONCERN' : 'STABLE';
  
  const riskColor = riskData.riskLevel === 'high' ? 'text-red-400' :
                    riskData.riskLevel === 'monitor' ? 'text-yellow-400' : 'text-emerald-400';

  return {
    status: riskLabel,
    statusColor: riskColor,
    overallScore: riskData.weightedScore || 70,
    confidence: riskData.confidence,
    summary: riskData.riskLevel === 'high' 
      ? `${patientName} shows significant cognitive changes requiring attention.`
      : riskData.riskLevel === 'monitor'
        ? `${patientName} exhibits some changes that warrant continued monitoring.`
        : `${patientName}'s cognitive metrics are within expected ranges.`,
    keyFindings: riskData.flags.slice(0, 3).map(f => ({
      domain: f.domain,
      change: `${f.change > 0 ? '+' : ''}${f.change}%`,
      severity: f.severity,
    })),
  };
}

function generateDomainSection(trends, baseline, flags) {
  const domains = [];
  
  const domainOrder = ['memory', 'reaction', 'pattern', 'speech', 'wellbeing'];
  
  domainOrder.forEach(domain => {
    if (trends[domain]) {
      const trend = trends[domain];
      const flag = flags.find(f => f.domain === domain);
      
      const status = Math.abs(trend.change) < 5 ? 'stable' : 
                     trend.change < -10 ? 'declining' : 
                     trend.change > 5 ? 'improving' : 'mild_change';
      
      domains.push({
        name: domain.charAt(0).toUpperCase() + domain.slice(1),
        current: trend.current,
        baseline: trend.baseline,
        change: `${trend.change > 0 ? '+' : ''}${trend.change}%`,
        status,
        severity: flag?.severity || 'none',
        timeWindow: '14 days',
        description: getDomainDescription(domain, trend, status),
      });
    }
  });
  
  return { domains };
}

function getDomainDescription(domain, trend, status) {
  const descriptions = {
    memory: status === 'declining' ? 'Recall ability decreased compared to baseline' :
            status === 'improving' ? 'Recall ability improved from baseline' :
            'Memory performance stable',
    reaction: status === 'declining' ? 'Processing speed slowed compared to baseline' :
              status === 'improving' ? 'Reaction time improved from baseline' :
              'Reaction time stable',
    pattern: status === 'declining' ? 'Executive function decreased from baseline' :
             status === 'improving' ? 'Executive function improved from baseline' :
             'Pattern recognition stable',
    speech: status === 'declining' ? 'Verbal fluency decreased from baseline' :
            status === 'improving' ? 'Verbal fluency improved from baseline' :
            'Speech metrics stable',
    wellbeing: status === 'declined' ? 'Mood/sleep quality decreased from baseline' :
               status === 'improving' ? 'Mood/sleep quality improved from baseline' :
               'Wellbeing metrics stable',
  };
  return descriptions[domain] || 'Domain metrics stable';
}

function generatePatternSection(correlations) {
  return {
    patterns: correlations.correlations.slice(0, 3).map(c => ({
      type: c.type,
      domains: c.domains,
      severity: c.severity,
      confidence: `${c.confidence}%`,
      observation: c.observation,
      timeWindow: '30 days',
    })),
  };
}

function generateSignalSection(signalQuality) {
  const signals = [];
  
  if (signalQuality.speech) {
    const sq = signalQuality.speech;
    if (sq.quality !== 'good') {
      signals.push({
        type: 'Speech Analysis',
        quality: sq.quality,
        score: sq.score,
        metrics: [
          { label: 'Hesitation', value: `${sq.metrics.hesitation.trend > 0 ? '+' : ''}${sq.metrics.hesitation.trend}%`, status: sq.metrics.hesitation.trend > 10 ? 'concern' : 'normal' },
          { label: 'Pace', value: `${sq.metrics.pace.trend > 0 ? '+' : ''}${sq.metrics.pace.trend}%`, status: sq.metrics.pace.trend < -10 ? 'concern' : 'normal' },
          { label: 'Fluency', value: `${sq.metrics.fluency.trend > 0 ? '+' : ''}${sq.metrics.fluency.trend}%`, status: sq.metrics.fluency.trend < -10 ? 'concern' : 'normal' },
        ],
        concerns: sq.concerns,
      });
    }
  }
  
  if (signalQuality.facial) {
    const fq = signalQuality.facial;
    if (fq.quality !== 'good') {
      signals.push({
        type: 'Facial Analysis',
        quality: fq.quality,
        score: fq.score,
        metrics: [
          { label: 'Attention', value: `${fq.metrics.attention.trend > 0 ? '+' : ''}${fq.metrics.attention.trend}%`, status: fq.metrics.attention.trend < -10 ? 'concern' : 'normal' },
          { label: 'Engagement', value: `${fq.metrics.engagement.trend > 0 ? '+' : ''}${fq.metrics.engagement.trend}%`, status: fq.metrics.engagement.trend < -10 ? 'concern' : 'normal' },
          { label: 'Eye Contact', value: `${fq.metrics.eyeContact.trend > 0 ? '+' : ''}${fq.metrics.eyeContact.trend}%`, status: fq.metrics.eyeContact.trend < -10 ? 'concern' : 'normal' },
        ],
        concerns: fq.concerns,
      });
    }
  }
  
  return { signals };
}

function generateRecommendationsSection(flags, correlations) {
  const recommendations = [];
  
  flags.forEach(flag => {
    if (flag.severity === 'severe' || flag.severity === 'moderate') {
      recommendations.push({
        priority: flag.severity === 'severe' ? 'HIGH' : 'MODERATE',
        domain: flag.domain,
        action: getActionForFlag(flag),
        reason: `${flag.domain} changed ${flag.change > 0 ? '+' : ''}${flag.change}% from baseline`,
      });
    }
  });
  
  correlations.correlations.forEach(c => {
    if (c.severity === 'high' || c.severity === 'moderate') {
      recommendations.push({
        priority: c.severity === 'high' ? 'HIGH' : 'MODERATE',
        domain: c.domains.join(', '),
        action: getActionForCorrelation(c),
        reason: c.observation,
      });
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'ROUTINE',
      domain: 'General',
      action: 'Continue regular monitoring and maintain current activities',
      reason: 'All metrics within normal ranges',
    });
  }
  
  return { recommendations };
}

function getActionForFlag(flag) {
  const actions = {
    memory: 'Schedule memory exercises; review medications affecting cognition',
    reaction: 'Consider reaction time training games; evaluate processing speed',
    pattern: 'Engage in puzzles and pattern recognition activities',
    speech: 'Practice reading aloud; consider speech therapy evaluation',
    wellbeing: 'Focus on sleep hygiene and stress management',
    behavior: 'Establish consistent daily routine and check-in schedule',
  };
  return actions[flag.domain] || 'Continue monitoring';
}

function getActionForCorrelation(correlation) {
  const actions = {
    strong_cognitive_signal: 'Comprehensive cognitive assessment recommended',
    behavioral_concern: 'Address mood and sleep quality factors',
    speech_decline: 'Speech evaluation and word-finding exercises',
    speech_pace_decline: 'Evaluate for processing slowdown',
    global_decline: 'Urgent comprehensive neurological evaluation',
    sleep_mood_link: 'Focus on sleep hygiene and mood management',
    early_indicator: 'Increased monitoring frequency recommended',
  };
  return actions[correlation.type] || 'Continue monitoring patterns';
}

export async function generateQuickAssessment(patientId = 1) {
  const riskData = await calculateRiskScore(patientId);
  
  return {
    score: riskData.weightedScore,
    status: riskData.riskLevel,
    topConcern: riskData.flags[0]?.domain || 'None',
    change: riskData.flags[0]?.change ? `${riskData.flags[0].change > 0 ? '+' : ''}${riskData.flags[0].change}%` : '0%',
    confidence: riskData.confidence,
    timestamp: new Date().toISOString(),
  };
}

export async function exportReportAsText(patientId = 1, patientName = 'Patient') {
  const report = await generateMedicalReport(patientId, patientName);
  
  let text = '';
  text += '═══════════════════════════════════════════════════════════════\n';
  text += '                    NAKSHATRA COGNITIVE ASSESSMENT\n';
  text += '═══════════════════════════════════════════════════════════════\n\n';
  
  text += `Patient: ${report.header.patientName}\n`;
  text += `Date: ${report.header.assessmentDate}\n`;
  text += `Report ID: ${report.header.reportId}\n`;
  text += `Assessment Confidence: ${report.header.confidenceLevel}\n`;
  text += '\n───────────────────────────────────────────────────────────────\n\n';
  
  report.sections.forEach(section => {
    text += `## ${section.title}\n\n`;
    
    if (section.type === 'summary') {
      text += `STATUS: ${section.content.status}\n`;
      text += `OVERALL SCORE: ${section.content.overallScore}/100\n`;
      text += `SUMMARY: ${section.content.summary}\n`;
      if (section.content.keyFindings.length > 0) {
        text += '\nKey Changes:\n';
        section.content.keyFindings.forEach(f => {
          text += `  • ${f.domain}: ${f.change} (${f.severity})\n`;
        });
      }
    }
    
    if (section.type === 'domains') {
      section.content.domains.forEach(d => {
        text += `${d.name}:\n`;
        text += `  Current: ${d.current} | Baseline: ${d.baseline}\n`;
        text += `  Change: ${d.change} (${d.status}) | Time: ${d.timeWindow}\n`;
        text += `  ${d.description}\n\n`;
      });
    }
    
    if (section.type === 'patterns') {
      section.content.patterns.forEach(p => {
        text += `[${p.severity.toUpperCase()}] ${p.type}\n`;
        text += `  Domains: ${p.domains.join(', ')}\n`;
        text += `  Confidence: ${p.confidence} | Time: ${p.timeWindow}\n`;
        text += `  ${p.observation}\n\n`;
      });
    }
    
    if (section.type === 'recommendations') {
      section.content.recommendations.forEach(r => {
        text += `[${r.priority}] ${r.domain}\n`;
        text += `  Action: ${r.action}\n`;
        text += `  Reason: ${r.reason}\n\n`;
      });
    }
  });
  
  text += '───────────────────────────────────────────────────────────────\n';
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += '\nDISCLAIMER: This report is for monitoring purposes only.\n';
  text += 'Consult a healthcare professional for clinical diagnosis.\n';
  text += '═══════════════════════════════════════════════════════════════\n';
  
  return text;
}
