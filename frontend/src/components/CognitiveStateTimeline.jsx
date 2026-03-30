import React from 'react';
import { 
  Search, 
  Zap, 
  RefreshCw, 
  GitBranch, 
  CheckCircle2,
  Brain,
  AlertCircle
} from 'lucide-react';

const stateConfig = {
  retrieval_struggle: {
    icon: Search,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    label: 'Retrieval Struggle',
  },
  fluent_recall: {
    icon: Zap,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    label: 'Fluent Recall',
  },
  repetition: {
    icon: RefreshCw,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    label: 'Repetition Detected',
  },
  topic_drift: {
    icon: GitBranch,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    label: 'Topic Drift',
  },
  coherence_recovery: {
    icon: CheckCircle2,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    label: 'Coherence Recovery',
  },
};

const formatTimestamp = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const CognitiveStateTimeline = ({ cognitiveStates }) => {
  if (!cognitiveStates || cognitiveStates.length === 0) {
    return (
      <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
            Cognitive State Analysis
          </h3>
        </div>
        <div className="flex items-center justify-center py-8 text-slate-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">No significant cognitive states detected</span>
        </div>
      </div>
    );
  }

  const sortedStates = [...cognitiveStates].sort((a, b) => 
    (a.timestamp || a.start_time_ms / 1000) - (b.timestamp || b.start_time_ms / 1000)
  );

  return (
    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
          Cognitive State Analysis
        </h3>
        <span className="ml-auto text-xs text-slate-500 font-mono">
          {sortedStates.length} event{sortedStates.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-slate-600 to-slate-700" />

        <div className="space-y-4 pl-10">
          {sortedStates.map((state, idx) => {
            const config = stateConfig[state.state_type] || stateConfig.retrieval_struggle;
            const Icon = config.icon;
            const timestamp = state.timestamp || state.start_time_ms / 1000;

            return (
              <div key={idx} className="relative">
                <div
                  className="absolute -left-10 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: config.bgColor,
                    border: `2px solid ${config.borderColor}`,
                    top: '2px',
                  }}
                >
                  <Icon className="w-3 h-3" style={{ color: config.color }} />
                </div>

                <div
                  className="p-4 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.01]"
                  style={{
                    backgroundColor: config.bgColor,
                    borderColor: config.borderColor,
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: config.color,
                          color: '#fff',
                        }}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {formatTimestamp(timestamp)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {Math.round(state.confidence * 100)}% confidence
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {state.description}
                  </p>

                  {state.phrase && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Phrase:</span>
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: config.borderColor,
                          color: config.color,
                        }}
                      >
                        "{state.phrase}"
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CognitiveStateTimeline;
