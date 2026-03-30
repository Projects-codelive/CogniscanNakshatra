import React from 'react';
import { AlertTriangle, Shield, Info } from 'lucide-react';

const RiskFlagsSummary = ({ riskFlags }) => {
  if (!riskFlags || riskFlags.length === 0) {
    return (
      <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
            Risk Flags Summary
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-emerald-400">All Clear</p>
              <p className="text-xs text-emerald-500/70">No risk flags detected</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeFlags = riskFlags.filter(f => f.severity !== 'None');
  const allClearFlag = riskFlags.find(f => f.severity === 'None');

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'High':
        return {
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          icon: AlertTriangle,
        };
      case 'Moderate':
        return {
          color: '#f97316',
          bgColor: 'rgba(249, 115, 22, 0.1)',
          borderColor: 'rgba(249, 115, 22, 0.3)',
          icon: AlertTriangle,
        };
      case 'Low':
        return {
          color: '#eab308',
          bgColor: 'rgba(234, 179, 8, 0.1)',
          borderColor: 'rgba(234, 179, 8, 0.3)',
          icon: Info,
        };
      default:
        return {
          color: '#6b7280',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          borderColor: 'rgba(107, 114, 128, 0.3)',
          icon: Info,
        };
    }
  };

  return (
    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
          Risk Flags Summary
        </h3>
        <span className="ml-auto text-xs text-slate-500 font-mono">
          {activeFlags.length} flag{activeFlags.length !== 1 ? 's' : ''}
        </span>
      </div>

      {allClearFlag && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 mb-6">
          <Shield className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-sm font-bold text-emerald-400">{allClearFlag.name}</p>
            <p className="text-xs text-emerald-500/70">{allClearFlag.explanation}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {activeFlags.map((flag, idx) => {
          const config = getSeverityConfig(flag.severity);
          const Icon = config.icon;

          return (
            <div
              key={idx}
              className="p-4 rounded-xl border transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: config.borderColor }}
                >
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-white">{flag.name}</h4>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: config.color,
                        color: '#fff',
                      }}
                    >
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {flag.explanation}
                  </p>
                </div>
              </div>

              <div className="ml-11 p-3 bg-slate-900/60 rounded-lg border border-slate-700/30">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Recommendation
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {flag.recommendation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskFlagsSummary;
