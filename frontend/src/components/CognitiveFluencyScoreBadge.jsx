import React from 'react';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const getScoreConfig = (score) => {
  if (score >= 80) {
    return {
      label: 'Optimal',
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      gradient: 'from-emerald-500/20 to-emerald-600/10',
    };
  } else if (score >= 60) {
    return {
      label: 'Good',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      gradient: 'from-blue-500/20 to-blue-600/10',
    };
  } else if (score >= 40) {
    return {
      label: 'Moderate Concern',
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      gradient: 'from-yellow-500/20 to-yellow-600/10',
    };
  }
  return {
    label: 'High Risk',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gradient: 'from-red-500/20 to-red-600/10',
  };
};

const CognitiveFluencyScoreBadge = ({ score, interpretation, comparisonDelta }) => {
  const config = getScoreConfig(score);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-gradient-to-br bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="relative">
          <svg className="w-36 h-36 transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-slate-700"
            />
            <circle
              cx="72"
              cy="72"
              r="45"
              stroke={config.color}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 8px ${config.color}40)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-white">{Math.round(score)}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">/ 100</span>
          </div>
        </div>

        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5" style={{ color: config.color }} />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Cognitive Fluency Score
            </span>
          </div>

          <div
            className="inline-block px-3 py-1.5 rounded-full text-sm font-bold mb-4"
            style={{
              backgroundColor: config.bgColor,
              color: config.color,
              border: `1px solid ${config.borderColor}`,
            }}
          >
            {config.label}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
            {interpretation}
          </p>

          {comparisonDelta?.has_previous_session && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                {comparisonDelta.score_change > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-500">
                      +{comparisonDelta.score_change.toFixed(1)}
                    </span>
                  </>
                ) : comparisonDelta.score_change < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-red-500">
                      {comparisonDelta.score_change.toFixed(1)}
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-bold text-slate-500">No change</span>
                  </>
                )}
                <span className="text-xs text-slate-500">vs last session</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CognitiveFluencyScoreBadge;
