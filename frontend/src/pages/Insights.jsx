import { useState, useEffect } from 'react';
import { Brain, Moon, Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getTestResults, getCheckIns } from '../store/db';
import { useAppStore } from '../store/useAppStore';

function getRiskLevel(score, trend) {
  if (!score) return { level: 'stable', message: '', color: '' };
  if (trend?.changeType === 'decrease' && trend.change < -10) {
    return {
      level: 'urgent',
      message: 'Your cognitive scores have declined significantly.',
      color: 'bg-red-500/10 border-red-500/30 text-red-400',
    };
  }
  if (trend?.changeType === 'decrease') {
    return {
      level: 'warning',
      message: 'A slight decline in scores detected. Monitor closely.',
      color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    };
  }
  return { level: 'stable', message: '', color: '' };
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Needs Attention';
  return 'Concerning';
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
  const [testResults, setTestResults] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState('');
  const { cogniScore } = useAppStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const tests = await getTestResults(10);
    const checks = await getCheckIns(7);
    setTestResults(tests);
    setCheckIns(checks);

    const recs = [];
    if (tests.length < 3) {
      recs.push('Take cognitive tests regularly to build your profile');
    }
    if (checks.length < 5) {
      recs.push('Complete daily check-ins for better tracking');
    }
    recs.push('Maintain consistent daily routines');
    recs.push('Stay mentally active with regular tests');
    setRecommendations(recs.slice(0, 4));

    if (tests.length > 0 && checks.length > 0) {
      const avgWellbeing = checks.reduce((a, c) => a + c.wellbeingScore, 0) / checks.length;
      
      if (avgWellbeing >= 70) {
        setWeeklySummary('You are maintaining good cognitive health. Keep up with your healthy habits.');
      } else if (avgWellbeing < 50) {
        setWeeklySummary('Your wellbeing scores have been low. Focus on better sleep and stress management.');
      } else {
        setWeeklySummary('Your scores are stable. Continue monitoring and maintaining healthy habits.');
      }
    }
  };

  const avgWellbeing = checkIns.length
    ? Math.round(checkIns.reduce((a, c) => a + c.wellbeingScore, 0) / checkIns.length)
    : null;

  const latestByType = (type) => testResults.find((r) => r.type === type);
  const risk = getRiskLevel(cogniScore, null);
  const scoreLabel = getScoreLabel(cogniScore);

  const cogniScoreHistory = testResults.slice(0, 7).map(t => t.score).reverse();
  const wellbeingHistory = checkIns.slice(0, 7).map(c => c.wellbeingScore).reverse();

  const getMemoryTrend = () => {
    const memoryTests = testResults.filter(t => t.type === 'memory');
    if (memoryTests.length < 2) return null;
    const recent = memoryTests[0]?.score || 0;
    const previous = memoryTests[1]?.score || 0;
    const change = recent - previous;
    return { change, changeType: change > 2 ? 'increase' : change < -2 ? 'decrease' : 'stable' };
  };

  const getReactionTrend = () => {
    const reactionTests = testResults.filter(t => t.type === 'reaction');
    if (reactionTests.length < 2) return null;
    const recent = reactionTests[0]?.score || 0;
    const previous = reactionTests[1]?.score || 0;
    const change = recent - previous;
    return { change, changeType: change > 2 ? 'increase' : change < -2 ? 'decrease' : 'stable' };
  };

  const getWellbeingTrend = () => {
    if (checkIns.length < 2) return null;
    const recent = checkIns[0]?.wellbeingScore || 0;
    const previous = checkIns[1]?.wellbeingScore || 0;
    const change = recent - previous;
    return { change, changeType: change > 2 ? 'increase' : change < -2 ? 'decrease' : 'stable' };
  };

  const memoryTrend = getMemoryTrend();
  const reactionTrend = getReactionTrend();
  const wellbeingTrend = getWellbeingTrend();

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-lg lg:text-xl font-bold text-white">Insights</h1>
        <p className="text-slate-400 text-sm mt-1">Your cognitive wellness summary</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto">
        {risk.level !== 'stable' && (
          <div className={`p-4 rounded-2xl border ${risk.color}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{risk.level === 'urgent' ? 'Needs Attention' : 'Monitor Closely'}</p>
                <p className="text-sm mt-1">{risk.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-400">Overall Status</p>
              <p className="text-2xl lg:text-3xl font-bold text-white">{scoreLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl lg:text-4xl font-bold text-white">{cogniScore}</p>
              <p className="text-xs text-slate-500">/100</p>
            </div>
          </div>

          {cogniScoreHistory.length > 1 && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">7-Day Trend</p>
              <MiniTrendChart data={cogniScoreHistory} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-blue-400" />
              {memoryTrend && (
                memoryTrend.changeType === 'increase' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                memoryTrend.changeType === 'decrease' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                <Minus className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-500">Memory</p>
            <p className="text-xl lg:text-2xl font-bold text-white">{latestByType('memory')?.score ?? '—'}</p>
            {memoryTrend && (
              <p className={`text-xs ${
                memoryTrend.changeType === 'increase' ? 'text-emerald-400' : memoryTrend.changeType === 'decrease' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {memoryTrend.changeType === 'stable' ? 'No change' : `${memoryTrend.change > 0 ? '+' : ''}${memoryTrend.change}%`}
              </p>
            )}
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              {reactionTrend && (
                reactionTrend.changeType === 'increase' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                reactionTrend.changeType === 'decrease' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                <Minus className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-500">Reaction</p>
            <p className="text-xl lg:text-2xl font-bold text-white">{latestByType('reaction')?.score ?? '—'}</p>
            {reactionTrend && (
              <p className={`text-xs ${
                reactionTrend.changeType === 'increase' ? 'text-emerald-400' : reactionTrend.changeType === 'decrease' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {reactionTrend.changeType === 'stable' ? 'No change' : `${reactionTrend.change > 0 ? '+' : ''}${reactionTrend.change}%`}
              </p>
            )}
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <Moon className="w-5 h-5 text-blue-400" />
              {wellbeingTrend && (
                wellbeingTrend.changeType === 'increase' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                wellbeingTrend.changeType === 'decrease' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                <Minus className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-500">Wellbeing</p>
            <p className="text-xl lg:text-2xl font-bold text-white">{avgWellbeing ?? '—'}%</p>
            {wellbeingTrend && (
              <p className={`text-xs ${
                wellbeingTrend.changeType === 'increase' ? 'text-emerald-400' : wellbeingTrend.changeType === 'decrease' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {wellbeingTrend.changeType === 'stable' ? 'No change' : `${wellbeingTrend.change > 0 ? '+' : ''}${wellbeingTrend.change}%`}
              </p>
            )}
          </div>
        </div>

        <div className="bg-blue-500/10 rounded-2xl p-5 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-blue-400" />
            <p className="font-semibold text-white">Weekly Summary</p>
          </div>
          <p className="text-sm text-slate-400">
            {weeklySummary || 'Complete more tests and check-ins to see your weekly summary.'}
          </p>
        </div>

        {recommendations.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
              <p className="font-semibold text-white">Recommendations</p>
            </div>
            <ul className="space-y-3">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-400">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-slate-500 text-center px-4">
          This app does not provide medical advice or diagnosis. Always consult a healthcare professional.
        </p>
      </div>
    </div>
  );
}
