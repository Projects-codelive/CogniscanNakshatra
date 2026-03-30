import React, { useState } from 'react';
import {
  Brain,
  Clock,
  FileText,
  Activity,
  AlertTriangle,
  History,
  Eye,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  RotateCcw,
  Home,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PieChart,
  Users,
  Zap
} from 'lucide-react';

const EMOTION_COLORS = {
  happy: '#22c55e',
  neutral: '#6b7280',
  sad: '#3b82f6',
  fear: '#8b5cf6',
  angry: '#ef4444',
  surprise: '#f59e0b',
  disgust: '#84cc16',
  confused: '#eab308',
  stressed: '#f97316',
  engaged: '#06b6d4',
  blank: '#9ca3af'
};

const SectionHeader = ({ icon: Icon, title, count }) => (
  <div className="flex items-center gap-3 mb-4">
    <Icon className="w-5 h-5 text-blue-400" />
    <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">{title}</h3>
    {count !== undefined && (
      <span className="ml-auto text-xs text-slate-500 font-mono">{count}</span>
    )}
  </div>
);

const ScoreCircle = ({ score, label, size = 'large' }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getColor = (s) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };
  
  const color = getColor(score);
  const circleSize = size === 'large' ? 100 : 60;
  const radius = size === 'large' ? 45 : 27;
  const strokeWidth = size === 'large' ? 8 : 5;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: circleSize, height: circleSize }}>
        <svg
          width={circleSize}
          height={circleSize}
          className="transform -rotate-90"
        >
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-700"
          />
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-black text-white ${size === 'large' ? 'text-3xl' : 'text-lg'}`}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-400 mt-2 uppercase tracking-wider">{label}</span>
    </div>
  );
};

const QuestionBreakdownCard = ({ question, expanded, onToggle }) => {
  const qualityScore = question.per_question_score || 50;
  
  const getScoreColor = (s) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };
  
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'memory_recall': return <Brain size={14} className="text-purple-400" />;
      case 'orientation': return <Clock size={14} className="text-blue-400" />;
      case 'cognitive_load': return <Zap size={14} className="text-yellow-400" />;
      case 'emotional_memory': return <Users size={14} className="text-pink-400" />;
      default: return <Activity size={14} className="text-slate-400" />;
    }
  };
  
  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
            {getCategoryIcon(question.category)}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              {question.category.replace('_', ' ')}
            </p>
            <p className="text-sm text-white line-clamp-2">{question.text}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-shrink-0">
          <div
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: `${getScoreColor(qualityScore)}20`,
              color: getScoreColor(qualityScore)
            }}
          >
            {Math.round(qualityScore)}/100
          </div>
          {expanded ? (
            <ChevronUp size={20} className="text-slate-500" />
          ) : (
            <ChevronDown size={20} className="text-slate-500" />
          )}
        </div>
      </button>
      
      {expanded && (
        <div className="p-4 border-t border-slate-700/50 space-y-4">
          {question.transcript && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Verbal Response</p>
              <p className="text-sm text-slate-300 italic">"{question.transcript}"</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-3 rounded-lg">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Response Latency</p>
              <p className="text-lg font-bold text-white">{(question.response_latency / 1000).toFixed(1)}s</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Congruence</p>
              <p className="text-lg font-bold text-white">{Math.round(question.congruence_score || 50)}%</p>
            </div>
          </div>
          
          {question.expression_journey && question.expression_journey.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Expression Journey</p>
              <div className="flex gap-1 items-end h-12">
                {question.expression_journey.map((frame, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-t-sm min-w-[4px]"
                    style={{
                      height: `${(frame.attention || 50)}%`,
                      backgroundColor: EMOTION_COLORS[frame.emotion] || '#6b7280'
                    }}
                    title={`${frame.emotion} (${Math.round(frame.attention)}%)`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                <span>Start</span>
                <span>End</span>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
              question.congruence === 'matched'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {question.congruence === 'matched' ? 'Matched' : 'Varied'}
            </span>
            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400">
              {question.sentiment || 'neutral'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const DomainScoreBar = ({ label, score, description }) => {
  const getColor = (s) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };
  
  const color = getColor(score);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-white">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{Math.round(score)}</span>
      </div>
      <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${score}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}40`
          }}
        />
      </div>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
};

const RiskFlagCard = ({ flag }) => {
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'High':
        return { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' };
      case 'Moderate':
        return { color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.3)' };
      case 'Low':
        return { color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' };
      default:
        return { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' };
    }
  };
  
  const config = getSeverityConfig(flag.severity);
  
  return (
    <div
      className="p-4 rounded-xl border-l-4"
      style={{ backgroundColor: config.bgColor, borderLeftColor: config.color }}
    >
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle size={18} style={{ color: config.color }} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-white">{flag.name}</h4>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: config.color, color: '#fff' }}
            >
              {flag.severity}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{flag.explanation}</p>
        </div>
      </div>
      <div className="ml-8 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Recommendation</p>
        <p className="text-xs text-slate-300">{flag.recommendation}</p>
      </div>
    </div>
  );
};

const FacialReport = ({ report, onClose, onRetake }) => {
  const [expandedQuestions, setExpandedQuestions] = useState({});
  
  const toggleQuestion = (index) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return { text: 'Optimal', color: '#22c55e' };
    if (score >= 60) return { text: 'Good', color: '#3b82f6' };
    if (score >= 40) return { text: 'Moderate Concern', color: '#eab308' };
    return { text: 'High Risk', color: '#ef4444' };
  };

  const scoreLabel = getScoreLabel(report.composite_score);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Multimodal Cognitive Assessment</h2>
                  <p className="text-xs text-slate-500">{formatDate(report.timestamp)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onRetake}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Retake
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2"
                >
                  <Home size={16} />
                  Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <ScoreCircle score={report.composite_score} label="Composite Score" size="large" />
              
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="px-4 py-1.5 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: `${scoreLabel.color}20`,
                      color: scoreLabel.color,
                      border: `1px solid ${scoreLabel.color}40`
                    }}
                  >
                    {scoreLabel.text}
                  </span>
                  <span className="text-sm text-slate-500">
                    {report.questions_answered} of {report.total_questions} questions
                  </span>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-900/50 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Duration</p>
                    <p className="text-lg font-bold text-white">{formatDuration(report.duration_seconds)}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Questions</p>
                    <p className="text-lg font-bold text-white">{report.total_questions}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Frames</p>
                    <p className="text-lg font-bold text-white">{report.facial_behavior?.total_frames_analyzed || 0}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Flags</p>
                    <p className="text-lg font-bold text-white">{report.risk_flags?.filter(f => f.severity !== 'None').length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm">
            <SectionHeader icon={FileText} title="Per-Question Breakdown" count={report.questions.length} />
            <div className="space-y-3">
              {report.questions.map((question, idx) => (
                <QuestionBreakdownCard
                  key={idx}
                  question={question}
                  expanded={expandedQuestions[idx]}
                  onToggle={() => toggleQuestion(idx)}
                />
              ))}
            </div>
          </section>

          <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm">
            <SectionHeader icon={Activity} title="Facial Expression Heatmap" />
            <div className="space-y-4">
              <div className="relative h-16 bg-slate-800/50 rounded-xl overflow-hidden">
                {report.questions.map((q, idx) => {
                  const expressionJourney = q.expression_journey || [];
                  const dominantEmotion = expressionJourney.length > 0
                    ? expressionJourney[Math.floor(expressionJourney.length / 2)]?.emotion || 'neutral'
                    : 'neutral';
                  
                  return (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 flex items-center justify-center text-xs font-bold text-white/80 border-r border-white/10"
                      style={{
                        left: `${(idx / report.questions.length) * 100}%`,
                        width: `${100 / report.questions.length}%`,
                        backgroundColor: EMOTION_COLORS[dominantEmotion] + '40',
                        borderLeft: idx === 0 ? 'none' : '1px dashed rgba(255,255,255,0.2)'
                      }}
                    >
                      Q{idx + 1}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex flex-wrap gap-4">
                {Object.entries(EMOTION_COLORS).slice(0, 8).map(([emotion, color]) => (
                  <div key={emotion} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-slate-400 capitalize">{emotion}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm">
            <SectionHeader icon={Brain} title="Cognitive Domain Scores" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DomainScoreBar
                label="Memory Recall Index"
                score={report.domain_scores?.memory_recall_index || 50}
                description="Performance on memory retrieval tasks"
              />
              <DomainScoreBar
                label="Orientation Accuracy"
                score={report.domain_scores?.orientation_accuracy || 50}
                description="Time and place awareness"
              />
              <DomainScoreBar
                label="Working Memory"
                score={report.domain_scores?.working_memory_tolerance || 50}
                description="Cognitive load tolerance"
              />
              <DomainScoreBar
                label="Emotional Processing"
                score={report.domain_scores?.emotional_processing_health || 50}
                description="Emotional congruence and regulation"
              />
              <DomainScoreBar
                label="Attention Consistency"
                score={report.domain_scores?.attention_consistency || 50}
                description="Sustained engagement levels"
              />
            </div>
          </section>

          <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm">
            <SectionHeader icon={Eye} title="Facial Behavioral Analysis" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Emotion Distribution</h4>
                <div className="space-y-3">
                  {Object.entries(report.facial_behavior?.emotion_distribution || {}).map(([emotion, data]) => (
                    <div key={emotion} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: EMOTION_COLORS[emotion] || '#6b7280' }}
                      />
                      <span className="text-sm text-slate-400 capitalize flex-1">{emotion}</span>
                      <span className="text-sm font-bold text-white w-12 text-right">{data.percentage?.toFixed(0)}%</span>
                      <span className="text-xs text-slate-500 w-16 text-right">{data.seconds?.toFixed(0)}s</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Gaze Pattern</h4>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(report.facial_behavior?.gaze_pattern_summary || {}).map(([direction, count]) => (
                    <div key={direction} className="bg-slate-800/50 p-3 rounded-xl text-center">
                      <p className="text-lg font-bold text-white capitalize">{direction === 'center' ? 'C' : direction[0].toUpperCase()}</p>
                      <p className="text-xs text-slate-500">{count}%</p>
                    </div>
                  ))}
                </div>
                
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-6">Micro-Expressions</h4>
                {report.facial_behavior?.micro_expression_frequency?.length > 0 ? (
                  <div className="space-y-2">
                    {report.facial_behavior.micro_expression_frequency.map((expr, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-800/30 p-2 rounded-lg">
                        <span className="text-sm text-white capitalize">{expr.expression}</span>
                        <span className="text-xs text-slate-500">{expr.times_detected}x</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No significant micro-expressions detected</p>
                )}
              </div>
            </div>
          </section>

          <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm">
            <SectionHeader icon={MessageSquare} title="Verbal-Facial Congruence" />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-wider pb-2">Question</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-wider pb-2">Verbal</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-wider pb-2">Facial</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-wider pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.congruence_analysis?.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-800">
                      <td className="py-3 text-xs text-slate-300 max-w-[200px] truncate">{item.question_topic}</td>
                      <td className="py-3 text-xs text-slate-400 capitalize">{item.verbal_sentiment}</td>
                      <td className="py-3 text-xs text-slate-400 capitalize">{item.dominant_facial_emotion}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          item.congruence_status === 'matched'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {item.congruence_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm">
            <SectionHeader icon={TrendingUp} title="Session Progression" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Pattern</p>
                <p className="text-sm font-bold text-white capitalize">
                  {report.session_progression?.pattern?.replace('_', ' ')}
                </p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">First Half Quality</p>
                <p className="text-sm font-bold text-white">{Math.round(report.session_progression?.first_half_quality || 0)}%</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Second Half Quality</p>
                <p className="text-sm font-bold text-white">{Math.round(report.session_progression?.second_half_quality || 0)}%</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Change</p>
                <p className={`text-sm font-bold ${(report.session_progression?.degradation_percentage || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(report.session_progression?.degradation_percentage || 0) > 0 ? '+' : ''}{report.session_progression?.degradation_percentage?.toFixed(1)}%
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm">
            <SectionHeader icon={AlertTriangle} title="Risk Flags" count={report.risk_flags?.filter(f => f.severity !== 'None').length || 0} />
            <div className="space-y-4">
              {report.risk_flags?.filter(f => f.severity !== 'None').map((flag, idx) => (
                <RiskFlagCard key={idx} flag={flag} />
              ))}
              {(!report.risk_flags || report.risk_flags.filter(f => f.severity !== 'None').length === 0) && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="text-emerald-500" size={24} />
                  <div>
                    <p className="text-sm font-bold text-emerald-400">All Clear</p>
                    <p className="text-xs text-emerald-500/70">No significant risk flags detected</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-8 rounded-3xl border border-blue-500/20 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Brain size={16} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-3">Assessment Summary</h3>
                <p className="text-base text-slate-200 leading-relaxed">{report.summary_paragraph}</p>
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-4 pb-8">
            <button className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700 flex items-center justify-center gap-2">
              <Download size={18} />
              Download PDF Report
            </button>
            <button className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2">
              <Share2 size={18} />
              Share with Doctor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacialReport;
