import React from 'react';
import { Clock, Pause, AlertTriangle } from 'lucide-react';

const SpeechTimelineVisualizer = ({ pauseTimeline, durationMs, transcript }) => {
  const words = transcript?.split(' ') || [];
  const totalTime = durationMs || 60000;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'short':
        return '#eab308';
      case 'long':
        return '#f97316';
      case 'critical':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getPausePosition = (pause) => {
    return (pause.start_ms / totalTime) * 100;
  };

  const getWordPosition = (index) => {
    const timePerWord = totalTime / words.length;
    return ((index * timePerWord) / totalTime) * 100;
  };

  const formatDuration = (ms) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  return (
    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
          Speech Timeline
        </h3>
        <span className="ml-auto text-xs text-slate-500 font-mono">
          {formatDuration(totalTime)} total
        </span>
      </div>

      <div className="relative overflow-x-auto pb-4">
        <div className="min-w-[600px]">
          <div className="relative h-20 bg-slate-900/60 rounded-xl border border-slate-700/30 overflow-hidden mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-1 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-slate-500 font-mono">
              <span>0:00</span>
              <span>{formatDuration(totalTime / 3)}</span>
              <span>{formatDuration((totalTime * 2) / 3)}</span>
              <span>{formatDuration(totalTime)}</span>
            </div>

            {pauseTimeline.map((pause, idx) => {
              const left = getPausePosition(pause);
              const width = Math.max(2, (pause.duration_ms / totalTime) * 100);

              return (
                <div
                  key={idx}
                  className="absolute top-1/2 transform -translate-y-1/2 flex flex-col items-center"
                  style={{ left: `${left}%` }}
                >
                  <div
                    className="w-1 rounded-full animate-pulse"
                    style={{
                      height: '60px',
                      backgroundColor: getSeverityColor(pause.severity),
                      boxShadow: `0 0 8px ${getSeverityColor(pause.severity)}60`,
                    }}
                    title={`${pause.severity} pause: ${formatDuration(pause.duration_ms)}${pause.word_after ? ` → "${pause.word_after}"` : ''}`}
                  />
                  <div
                    className="absolute -bottom-1 text-[8px] font-bold px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: getSeverityColor(pause.severity),
                      color: '#fff',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDuration(pause.duration_ms)}
                  </div>
                </div>
              );
            })}

            {words.length > 0 && (
              <div className="absolute top-2 left-0 right-0 flex justify-between px-1">
                {words.slice(0, Math.min(8, words.length)).map((word, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] text-slate-500 truncate max-w-[60px]"
                    style={{ opacity: 0.6 + (idx / words.length) * 0.4 }}
                  >
                    {word.length > 8 ? word.slice(0, 6) + '…' : word}
                  </span>
                ))}
                {words.length > 8 && (
                  <span className="text-[9px] text-slate-500">…</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-slate-400">Short (&lt;1s)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-slate-400">Long (1-2s)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-slate-400">Critical (&gt;2s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechTimelineVisualizer;
