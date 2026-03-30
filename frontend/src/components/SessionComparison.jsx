import React from 'react';
import { TrendingUp, TrendingDown, Minus, History, Database } from 'lucide-react';

const SessionComparison = ({ comparisonDelta, pauseClustering }) => {
  if (!comparisonDelta?.has_previous_session) {
    return (
      <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
            Session Comparison
          </h3>
        </div>

        <div className="flex items-center justify-center py-8 text-center">
          <div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <History className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm font-bold text-slate-300 mb-1">Baseline Established</p>
            <p className="text-xs text-slate-500 max-w-xs">
              This is the first speech analysis session. Future sessions will show comparison trends.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getTrendConfig = (change, inverse = false) => {
    const isPositive = inverse ? change < 0 : change > 0;
    const isNegative = inverse ? change > 0 : change < 0;

    if (Math.abs(change) < 0.1) {
      return {
        icon: Minus,
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        label: 'No change',
      };
    } else if (isPositive) {
      return {
        icon: TrendingUp,
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        label: 'Improved',
      };
    } else {
      return {
        icon: TrendingDown,
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        label: 'Declined',
      };
    }
  };

  const scoreTrend = getTrendConfig(comparisonDelta.score_change);
  const pauseTrend = getTrendConfig(comparisonDelta.pause_change_ms, true);
  const fillerTrend = getTrendConfig(comparisonDelta.filler_change, true);

  const ScoreIcon = scoreTrend.icon;
  const PauseIcon = pauseTrend.icon;
  const FillerIcon = fillerTrend.icon;

  return (
    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
          Session Comparison
        </h3>
        <span className="ml-auto text-xs text-slate-500">vs Previous Session</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: scoreTrend.bgColor,
            borderColor: `${scoreTrend.color}30`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ScoreIcon className="w-4 h-4" style={{ color: scoreTrend.color }} />
            <span className="text-xs font-bold text-slate-400">Fluency Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold"
              style={{ color: scoreTrend.color }}
            >
              {comparisonDelta.score_change > 0 ? '+' : ''}
              {comparisonDelta.score_change.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">points</span>
          </div>
          <div
            className="mt-2 text-[10px] font-bold px-2 py-1 rounded-full inline-block"
            style={{
              backgroundColor: scoreTrend.bgColor,
              color: scoreTrend.color,
            }}
          >
            {scoreTrend.label}
          </div>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: pauseTrend.bgColor,
            borderColor: `${pauseTrend.color}30`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <PauseIcon className="w-4 h-4" style={{ color: pauseTrend.color }} />
            <span className="text-xs font-bold text-slate-400">Avg Pause Duration</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold"
              style={{ color: pauseTrend.color }}
            >
              {comparisonDelta.pause_change_ms > 0 ? '+' : ''}
              {comparisonDelta.pause_change_ms.toFixed(0)}
            </span>
            <span className="text-xs text-slate-500">ms</span>
          </div>
          <div
            className="mt-2 text-[10px] font-bold px-2 py-1 rounded-full inline-block"
            style={{
              backgroundColor: pauseTrend.bgColor,
              color: pauseTrend.color,
            }}
          >
            {pauseTrend.label}
          </div>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: fillerTrend.bgColor,
            borderColor: `${fillerTrend.color}30`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FillerIcon className="w-4 h-4" style={{ color: fillerTrend.color }} />
            <span className="text-xs font-bold text-slate-400">Filler Words</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-bold"
              style={{ color: fillerTrend.color }}
            >
              {comparisonDelta.filler_change > 0 ? '+' : ''}
              {comparisonDelta.filler_change}
            </span>
            <span className="text-xs text-slate-500">count</span>
          </div>
          <div
            className="mt-2 text-[10px] font-bold px-2 py-1 rounded-full inline-block"
            style={{
              backgroundColor: fillerTrend.bgColor,
              color: fillerTrend.color,
            }}
          >
            {fillerTrend.label}
          </div>
        </div>
      </div>

      {pauseClustering && (
        <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700/30">
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-300">Pattern Analysis:</span>{' '}
            {pauseClustering.clinical_interpretation}
          </p>
        </div>
      )}
    </div>
  );
};

export default SessionComparison;
