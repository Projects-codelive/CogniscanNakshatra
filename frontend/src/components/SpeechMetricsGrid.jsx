import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const SpeechMetricsGrid = ({ metrics }) => {
  if (!metrics || metrics.length === 0) {
    return null;
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'normal':
        return {
          icon: CheckCircle2,
          color: '#22c55e',
          bgColor: 'rgba(34, 197, 94, 0.1)',
          label: 'Normal',
        };
      case 'watch':
        return {
          icon: AlertTriangle,
          color: '#eab308',
          bgColor: 'rgba(234, 179, 8, 0.1)',
          label: 'Watch',
        };
      case 'flag':
        return {
          icon: XCircle,
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          label: 'Flag',
        };
      default:
        return {
          icon: CheckCircle2,
          color: '#6b7280',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          label: 'Unknown',
        };
    }
  };

  const getBarPosition = (value, min, max) => {
    const range = max - min;
    const position = ((value - min) / range) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const getBarColor = (status) => {
    switch (status) {
      case 'normal':
        return '#22c55e';
      case 'watch':
        return '#eab308';
      case 'flag':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
          Speech Metrics Breakdown
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          const statusConfig = getStatusConfig(metric.status);
          const StatusIcon = statusConfig.icon;
          const barPosition = getBarPosition(metric.value, metric.min_value, metric.max_value);
          const barColor = getBarColor(metric.status);

          const displayValue = metric.unit === '%' || metric.name.includes('Ratio')
            ? metric.value.toFixed(1)
            : metric.value.toFixed(0);

          return (
            <div
              key={idx}
              className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    {metric.display_label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {metric.name}
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: statusConfig.bgColor,
                    color: statusConfig.color,
                  }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-white">
                  {displayValue}
                </span>
                <span className="text-xs text-slate-500">{metric.unit}</span>
              </div>

              <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barPosition}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 0 8px ${barColor}40`,
                  }}
                />
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg"
                  style={{ left: `calc(${barPosition}% - 4px)` }}
                />
              </div>

              <div className="flex justify-between mt-1 text-[9px] text-slate-600 font-mono">
                <span>{metric.min_value}</span>
                <span>Range</span>
                <span>{metric.max_value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpeechMetricsGrid;
