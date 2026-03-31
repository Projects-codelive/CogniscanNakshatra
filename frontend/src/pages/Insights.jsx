import { useState, useEffect } from 'react';
import { Brain, Moon, Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus, BarChart3, Target, Mic, Smile, FileText } from 'lucide-react';
import { getTestResults, getCheckIns, getSpeechSessions, getFacialSessions } from '../store/db';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from 'react-i18next';
import { calculateRiskScore, getWeeklySummary } from '../engine/declineEngine';
import { analyzeCorrelations } from '../engine/correlationEngine';
import { generateInterventions } from '../engine/interventionEngine';
import { analyzeSpeechSignalQuality, analyzeFacialSignalQuality } from '../engine/signalQuality';

function getRiskLevel(score) {
  if (!score) return { level: 'stable', message: '', color: '' };
  if (score < 40) {
    return {
      level: 'urgent',
      message: 'High risk - immediate attention needed',
      color: 'bg-red-500/10 border-red-500/30 text-red-400',
    };
  }
  if (score < 60) {
    return {
      level: 'warning',
      message: 'Moderate decline - monitor closely',
      color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    };
  }
  return { level: 'stable', message: 'Metrics within normal range', color: '' };
}

function getScoreLabel(score, t) {
  if (score >= 90) return t('insights.scoreLabel.excellent');
  if (score >= 80) return t('insights.scoreLabel.good');
  if (score >= 70) return t('insights.scoreLabel.fair');
  if (score >= 60) return t('insights.scoreLabel.needsAttention');
  return t('insights.scoreLabel.concerning');
}

function BaselineComparison({ current, baseline, label, change }) {
  const isDecline = change < 0;
  const changeColor = isDecline ? 'text-red-400' : change > 0 ? 'text-emerald-400' : 'text-slate-400';
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`text-sm font-semibold ${changeColor}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${isDecline ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, current)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-slate-500">
            <span>Baseline: {baseline}</span>
            <span>Current: {current}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InterventionCard({ intervention }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-white capitalize">{intervention.domain}</span>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${
          intervention.priority === 'high' ? 'bg-red-500/20 text-red-400' :
          intervention.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-emerald-500/20 text-emerald-400'
        }`}>
          {intervention.priority}
        </span>
      </div>
      <ul className="space-y-1">
        {intervention.recommendations?.slice(0, 2).map((rec, i) => (
          <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
            <span className="text-blue-400">•</span>
            {rec.name} ({rec.frequency})
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniTrendChart({ data }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-1 h-12 lg:h-16">
      {data.map((value, i) => {
        const height = ((value - min) / range) * 100;
        const isHigh = value >= 70;
        const isLow = value < 40;

        return (
          <div
            key={i}
            className={`flex-1 rounded-t ${
              isHigh ? 'bg-emerald-500/60' : isLow ? 'bg-red-500/60' : 'bg-blue-500/60'
            }`}
            style={{ height: `${Math.max(height, 10)}%` }}
          />
        );
      })}
    </div>
  );
}

export default function Insights() {
  const { t } = useTranslation();
  const [testResults, setTestResults] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [correlations, setCorrelations] = useState(null);
  const [interventions, setInterventions] = useState(null);
  const [speechQuality, setSpeechQuality] = useState(null);
  const [facialQuality, setFacialQuality] = useState(null);
  const { cogniScore } = useAppStore();

  const loadData = async () => {
    const [tests, checks, risk, weeklyData, corr, interv, sq, fq] = await Promise.all([
      getTestResults(50),
      getCheckIns(30),
      calculateRiskScore(1),
      getWeeklySummary(1),
      analyzeCorrelations(1),
      generateInterventions(1),
      analyzeSpeechSignalQuality(1, 30),
      analyzeFacialSignalQuality(1, 30),
    ]);
    
    setTestResults(tests);
    setCheckIns(checks);
    setRiskData(risk);
    setWeekly(weeklyData);
    setCorrelations(corr);
    setInterventions(interv);
    setSpeechQuality(sq);
    setFacialQuality(fq);
  };

  useEffect(() => {
    loadData();
  }, []);

  const latestByType = (type) => testResults.find((r) => r.type === type);
  const risk = getRiskLevel(riskData?.weightedScore || cogniScore);
  const scoreLabel = getScoreLabel(riskData?.weightedScore || cogniScore, t);

  const cogniScoreHistory = testResults.slice(0, 7).map(item => item.score).reverse();

  const getTrend = (current, baseline) => {
    if (!baseline) return { change: 0, type: 'stable' };
    const change = Math.round(((current - baseline) / baseline) * 100);
    return {
      change,
      type: change > 2 ? 'increase' : change < -2 ? 'decrease' : 'stable'
    };
  };

  const memoryTrend = getTrend(
    riskData?.trends?.memory?.current || latestByType('word-recall')?.score || 0,
    riskData?.baseline?.memoryScore || 0
  );
  
  const reactionTrend = getTrend(
    riskData?.trends?.reaction?.current || latestByType('reaction-time')?.score || 0,
    riskData?.baseline?.reactionScore || 0
  );

  const wellbeingTrend = getTrend(
    riskData?.trends?.wellbeing?.current || weekly?.avgMood * 20 || 0,
    riskData?.baseline?.wellbeingScore || 0
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-lg lg:text-xl font-bold text-white">{t('insights.title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('insights.subtitle')}</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto">
        {risk.level !== 'stable' && (
          <div className={`p-4 rounded-2xl border ${risk.color}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">
                  {risk.level === 'urgent' ? 'Attention Required' : 'Monitor Closely'}
                </p>
                <p className="text-sm mt-1 opacity-80">{risk.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-400">{t('insights.overallStatus')}</p>
              <p className="text-2xl lg:text-3xl font-bold text-white">{scoreLabel}</p>
              <p className="text-xs text-slate-500 mt-1">
                Confidence: {riskData?.confidence || 50}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl lg:text-5xl font-bold text-white">{riskData?.weightedScore ?? (cogniScore > 0 ? cogniScore : 0)}</p>
              <p className="text-xs text-slate-500">{t('insights.of100')}</p>
            </div>
          </div>

          {cogniScoreHistory.length > 1 && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">{t('insights.sevenDayTrend')}</p>
              <MiniTrendChart data={cogniScoreHistory} />
            </div>
          )}
        </div>

        {riskData?.baseline && riskData?.trends && (
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <p className="font-semibold text-white">Baseline vs Current</p>
              <span className="ml-auto text-xs text-slate-500">Last 7 days</span>
            </div>
            <div className="space-y-3">
              <BaselineComparison 
                label="Memory" 
                current={riskData.trends.memory.current}
                baseline={riskData.baseline.memoryScore}
                change={riskData.trends.memory.change}
              />
              <BaselineComparison 
                label="Reaction" 
                current={riskData.trends.reaction.current}
                baseline={riskData.baseline.reactionScore}
                change={riskData.trends.reaction.change}
              />
              <BaselineComparison 
                label="Speech" 
                current={riskData.trends.speech.current}
                baseline={riskData.baseline.speechScore}
                change={riskData.trends.speech.change}
              />
              <BaselineComparison 
                label="Wellbeing" 
                current={riskData.trends.wellbeing.current}
                baseline={riskData.baseline.wellbeingScore}
                change={riskData.trends.wellbeing.change}
              />
            </div>
          </div>
        )}

        {(speechQuality?.metrics || facialQuality?.metrics) && (
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-400" />
              <p className="font-semibold text-white">Signal Quality Analysis</p>
              <span className="ml-auto text-xs text-slate-500">Last 30 days</span>
            </div>
            <div className="space-y-3">
              {speechQuality?.metrics && (
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">Speech Analysis</span>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${
                      speechQuality.quality === 'good' ? 'bg-emerald-500/20 text-emerald-400' :
                      speechQuality.quality === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {speechQuality.quality}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">{speechQuality.metrics.hesitation.trend > 0 ? '+' : ''}{speechQuality.metrics.hesitation.trend}%</p>
                      <p className="text-[10px] text-slate-500">Hesitation</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{speechQuality.metrics.pace.trend > 0 ? '+' : ''}{speechQuality.metrics.pace.trend}%</p>
                      <p className="text-[10px] text-slate-500">Pace</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{speechQuality.metrics.fluency.trend > 0 ? '+' : ''}{speechQuality.metrics.fluency.trend}%</p>
                      <p className="text-[10px] text-slate-500">Fluency</p>
                    </div>
                  </div>
                  {speechQuality.concerns.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2">{speechQuality.concerns[0]}</p>
                  )}
                </div>
              )}
              {facialQuality?.metrics && (
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Smile className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">Facial Analysis</span>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${
                      facialQuality.quality === 'good' ? 'bg-emerald-500/20 text-emerald-400' :
                      facialQuality.quality === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {facialQuality.quality}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">{facialQuality.metrics.attention.trend > 0 ? '+' : ''}{facialQuality.metrics.attention.trend}%</p>
                      <p className="text-[10px] text-slate-500">Attention</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{facialQuality.metrics.engagement.trend > 0 ? '+' : ''}{facialQuality.metrics.engagement.trend}%</p>
                      <p className="text-[10px] text-slate-500">Engagement</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{facialQuality.metrics.eyeContact.trend > 0 ? '+' : ''}{facialQuality.metrics.eyeContact.trend}%</p>
                      <p className="text-[10px] text-slate-500">Eye Contact</p>
                    </div>
                  </div>
                  {facialQuality.concerns.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2">{facialQuality.concerns[0]}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-blue-400" />
              {memoryTrend.type !== 'stable' && (
                memoryTrend.type === 'increase' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <p className="text-xs text-slate-500">{t('insights.memory')}</p>
            <p className="text-xl lg:text-2xl font-bold text-white">
              {riskData?.trends?.memory?.current ?? latestByType('word-recall')?.score ?? '—'}
            </p>
            <p className={`text-xs ${memoryTrend.type === 'increase' ? 'text-emerald-400' : memoryTrend.type === 'decrease' ? 'text-red-400' : 'text-slate-400'}`}>
              {memoryTrend.type === 'stable' ? t('insights.noChange') : `${memoryTrend.change > 0 ? '+' : ''}${memoryTrend.change}%`}
            </p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              {reactionTrend.type !== 'stable' && (
                reactionTrend.type === 'increase' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <p className="text-xs text-slate-500">{t('insights.reaction')}</p>
            <p className="text-xl lg:text-2xl font-bold text-white">
              {riskData?.trends?.reaction?.current ?? latestByType('reaction-time')?.score ?? '—'}
            </p>
            <p className={`text-xs ${reactionTrend.type === 'increase' ? 'text-emerald-400' : reactionTrend.type === 'decrease' ? 'text-red-400' : 'text-slate-400'}`}>
              {reactionTrend.type === 'stable' ? t('insights.noChange') : `${reactionTrend.change > 0 ? '+' : ''}${reactionTrend.change}%`}
            </p>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <Moon className="w-5 h-5 text-blue-400" />
              {wellbeingTrend.type !== 'stable' && (
                wellbeingTrend.type === 'increase' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <p className="text-xs text-slate-500">{t('insights.wellbeing')}</p>
            <p className="text-xl lg:text-2xl font-bold text-white">
              {riskData?.trends?.wellbeing?.current ?? Math.round(weekly?.avgMood * 20) ?? '—'}
            </p>
            <p className={`text-xs ${wellbeingTrend.type === 'increase' ? 'text-emerald-400' : wellbeingTrend.type === 'decrease' ? 'text-red-400' : 'text-slate-400'}`}>
              {wellbeingTrend.type === 'stable' ? t('insights.noChange') : `${wellbeingTrend.change > 0 ? '+' : ''}${wellbeingTrend.change}%`}
            </p>
          </div>
        </div>

        {interventions && interventions.interventions.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-400" />
              <p className="font-semibold text-white">Recommended Actions</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {interventions.interventions.slice(0, 4).map((interv, i) => (
                <InterventionCard key={i} intervention={interv} />
              ))}
            </div>
          </div>
        )}

        {correlations && correlations.correlations.length > 0 && (
          <div className="bg-blue-500/10 rounded-2xl p-5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-blue-400" />
              <p className="font-semibold text-white">Pattern Analysis</p>
            </div>
            {correlations.correlations.slice(0, 2).map((corr, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 ${
                  corr.severity === 'high' ? 'bg-red-500' :
                  corr.severity === 'moderate' ? 'bg-yellow-500' :
                  corr.severity === 'positive' ? 'bg-emerald-500' : 'bg-slate-500'
                }`} />
                <p className="text-sm text-slate-300">{corr.observation}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
          <p className="text-sm font-medium text-slate-400 mb-3">{t('insights.weeklySummary')}</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{weekly?.checkInsCompleted ?? 0}/7</p>
              <p className="text-xs text-slate-500">Check-ins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{weekly?.testsCompleted ?? 0}</p>
              <p className="text-xs text-slate-500">Tests</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{weekly?.adherence ?? 0}%</p>
              <p className="text-xs text-slate-500">Adherence</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 text-center px-4">
          {t('dashboard.disclaimer')}
        </p>
      </div>
    </div>
  );
}
