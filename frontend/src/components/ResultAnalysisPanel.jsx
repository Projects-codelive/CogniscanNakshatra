import React from 'react';
import { 
  Brain, 
  Clock, 
  FileText, 
  Activity, 
  AlertTriangle,
  History,
  BarChart3,
  X,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import CognitiveFluencyScoreBadge from './CognitiveFluencyScoreBadge';
import SpeechTimelineVisualizer from './SpeechTimelineVisualizer';
import CognitiveStateTimeline from './CognitiveStateTimeline';
import SpeechMetricsGrid from './SpeechMetricsGrid';
import AnnotatedTranscript from './AnnotatedTranscript';
import SessionComparison from './SessionComparison';
import RiskFlagsSummary from './RiskFlagsSummary';

const SectionHeader = ({ icon: Icon, title, count }) => (
  <div className="flex items-center gap-3 mb-4">
    <Icon className="w-5 h-5 text-blue-400" />
    <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
      {title}
    </h3>
    {count !== undefined && (
      <span className="ml-auto text-xs text-slate-500 font-mono">
        {count}
      </span>
    )}
  </div>
);

const PauseStatsCards = ({ pauseClustering }) => {
  if (!pauseClustering) return null;

  const formatDuration = (ms) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  const cards = [
    {
      label: 'Total Pauses',
      value: pauseClustering.total_pauses,
      unit: 'detected',
      icon: Clock,
      color: '#3b82f6',
    },
    {
      label: 'Avg Duration',
      value: formatDuration(pauseClustering.average_duration_ms),
      unit: 'per pause',
      icon: Clock,
      color: '#8b5cf6',
    },
    {
      label: 'Longest Pause',
      value: formatDuration(pauseClustering.longest_pause_ms),
      unit: pauseClustering.longest_pause_word ? `→ "${pauseClustering.longest_pause_word}"` : '',
      icon: AlertTriangle,
      color: pauseClustering.longest_pause_ms > 2000 ? '#ef4444' : '#f97316',
    },
    {
      label: 'Pause Ratio',
      value: `${(pauseClustering.pause_to_speech_ratio * 100).toFixed(1)}%`,
      unit: 'silence time',
      icon: Activity,
      color: '#06b6d4',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5" style={{ color: card.color }} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <p className="text-lg font-bold text-white">{card.value}</p>
            {card.unit && (
              <p className="text-[10px] text-slate-500 truncate">{card.unit}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ResultAnalysisPanel = ({ 
  analysisResult, 
  onClose, 
  onRetake,
  onNextChallenge 
}) => {
  const [expandedSections, setExpandedSections] = React.useState({
    score: true,
    timeline: true,
    cognitive: true,
    metrics: true,
    transcript: true,
    comparison: true,
    flags: true,
  });

  if (!analysisResult) {
    return null;
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const {
    cognitive_fluency_score,
    score_label,
    score_interpretation,
    pause_timeline,
    cognitive_states,
    speech_metrics,
    annotated_transcript,
    pause_clustering,
    risk_flags,
    comparison_delta,
    transcript,
    duration_ms,
    word_count,
  } = analysisResult;

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Analysis Report</h2>
                <p className="text-xs text-slate-500">
                  {word_count} words • {formatDuration(duration_ms)} duration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onRetake}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={onNextChallenge}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2"
              >
                Next Challenge
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm">
            <button
              onClick={() => toggleSection('score')}
              className="w-full flex items-center justify-between mb-4"
            >
              <SectionHeader icon={BarChart3} title="Cognitive Fluency Score" />
              {expandedSections.score ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {expandedSections.score && (
              <CognitiveFluencyScoreBadge
                score={cognitive_fluency_score}
                interpretation={score_interpretation}
                comparisonDelta={comparison_delta}
              />
            )}
          </section>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm">
            <button
              onClick={() => toggleSection('timeline')}
              className="w-full flex items-center justify-between mb-4"
            >
              <SectionHeader 
                icon={Clock} 
                title="Pause & Hesitation Analysis" 
                count={`${pause_timeline?.length || 0} pauses`}
              />
              {expandedSections.timeline ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {expandedSections.timeline && (
              <>
                <SpeechTimelineVisualizer
                  pauseTimeline={pause_timeline}
                  durationMs={duration_ms}
                  transcript={transcript}
                />
                <PauseStatsCards pauseClustering={pause_clustering} />
              </>
            )}
          </section>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm">
            <button
              onClick={() => toggleSection('cognitive')}
              className="w-full flex items-center justify-between mb-4"
            >
              <SectionHeader 
                icon={Brain} 
                title="Cognitive State Detection" 
                count={cognitive_states?.length || 0}
              />
              {expandedSections.cognitive ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {expandedSections.cognitive && (
              <CognitiveStateTimeline cognitiveStates={cognitive_states} />
            )}
          </section>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm">
            <button
              onClick={() => toggleSection('metrics')}
              className="w-full flex items-center justify-between mb-4"
            >
              <SectionHeader icon={Activity} title="Speech Metrics Breakdown" />
              {expandedSections.metrics ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {expandedSections.metrics && (
              <SpeechMetricsGrid metrics={speech_metrics} />
            )}
          </section>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm">
            <button
              onClick={() => toggleSection('transcript')}
              className="w-full flex items-center justify-between mb-4"
            >
              <SectionHeader icon={FileText} title="Annotated Transcript" />
              {expandedSections.transcript ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {expandedSections.transcript && (
              <AnnotatedTranscript
                annotatedTranscript={annotated_transcript}
                originalTranscript={transcript}
              />
            )}
          </section>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm">
            <button
              onClick={() => toggleSection('comparison')}
              className="w-full flex items-center justify-between mb-4"
            >
              <SectionHeader icon={History} title="Comparative Insight" />
              {expandedSections.comparison ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {expandedSections.comparison && (
              <SessionComparison
                comparisonDelta={comparison_delta}
                pauseClustering={pause_clustering}
              />
            )}
          </section>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 backdrop-blur-sm">
            <button
              onClick={() => toggleSection('flags')}
              className="w-full flex items-center justify-between mb-4"
            >
              <SectionHeader 
                icon={AlertTriangle} 
                title="Risk Flags Summary" 
                count={risk_flags?.filter(f => f.severity !== 'None').length || 0}
              />
              {expandedSections.flags ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {expandedSections.flags && (
              <RiskFlagsSummary riskFlags={risk_flags} />
            )}
          </section>

          <div className="flex justify-center py-8">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              V8.2 Secure Medical Protocol • Report Generated
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultAnalysisPanel;
