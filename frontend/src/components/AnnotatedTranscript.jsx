import React from 'react';
import { FileText, Pause } from 'lucide-react';

const AnnotatedTranscript = ({ annotatedTranscript, originalTranscript }) => {
  if (!annotatedTranscript || annotatedTranscript.length === 0) {
    return (
      <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
            Annotated Transcript
          </h3>
        </div>
        <p className="text-sm text-slate-500 italic">
          "{originalTranscript || 'No transcript available'}"
        </p>
      </div>
    );
  }

  const getTokenStyle = (token) => {
    switch (token.token_type) {
      case 'filler':
        return 'bg-yellow-500/30 text-yellow-200 rounded px-1 py-0.5';
      case 'repeated':
        return 'bg-orange-500/30 text-orange-200 rounded px-1 py-0.5 underline decoration-wavy decoration-orange-400';
      case 'pause':
        return '';
      default:
        if (token.is_low_coherence) {
          return 'border-b-2 border-red-500/50';
        }
        return '';
    }
  };

  return (
    <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
          Annotated Transcript
        </h3>
      </div>

      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-700/30 mb-6">
        <div className="leading-relaxed text-slate-200">
          {annotatedTranscript.map((token, idx) => (
            <React.Fragment key={idx}>
              <span className={getTokenStyle(token)}>
                {token.word}
              </span>
              {token.pause_duration_ms > 0 && (
                <span
                  className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: token.pause_duration_ms > 2000 
                      ? 'rgba(239, 68, 68, 0.2)' 
                      : token.pause_duration_ms > 1000 
                        ? 'rgba(249, 115, 22, 0.2)'
                        : 'rgba(234, 179, 8, 0.2)',
                    color: token.pause_duration_ms > 2000 
                      ? '#ef4444' 
                      : token.pause_duration_ms > 1000 
                        ? '#f97316'
                        : '#eab308',
                    border: `1px solid ${
                      token.pause_duration_ms > 2000 
                        ? 'rgba(239, 68, 68, 0.4)' 
                        : token.pause_duration_ms > 1000 
                          ? 'rgba(249, 115, 22, 0.4)'
                          : 'rgba(234, 179, 8, 0.4)'
                    }`,
                  }}
                  title={`Pause: ${token.pause_duration_ms}ms`}
                >
                  <Pause className="w-2.5 h-2.5 mr-0.5" />
                  {(token.pause_duration_ms / 1000).toFixed(1)}s
                </span>
              )}
              {' '}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="w-8 h-6 bg-yellow-500/30 rounded flex items-center justify-center">
            <span className="text-yellow-200 text-xs font-bold">um</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">Filler Words</p>
            <p className="text-[10px] text-slate-500">Hesitation markers</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="w-8 h-6 bg-orange-500/30 rounded flex items-center justify-center">
            <span className="text-orange-200 text-xs font-bold underline decoration-wavy">word</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">Repeated Words</p>
            <p className="text-[10px] text-slate-500">Word repetition</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="w-8 h-6 bg-red-500/30 rounded flex items-center justify-center">
            <span className="text-red-200 text-xs font-bold">1.2s</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">Long Pauses</p>
            <p className="text-[10px] text-slate-500">Extended silence</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-600/30 border border-slate-600/20">
          <div className="w-8 h-6 bg-slate-700/50 rounded flex items-center justify-center">
            <span className="text-slate-300 text-xs font-bold border-b border-red-500">text</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">Low Coherence</p>
            <p className="text-[10px] text-slate-500">Topic drift area</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotatedTranscript;
