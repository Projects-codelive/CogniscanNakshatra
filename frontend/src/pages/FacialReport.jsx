import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Brain,
  Clock,
  FileText,
  Activity,
  AlertTriangle,
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
  AlertCircle,
  XCircle,
  Minus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const EMOTION_COLORS = {
  happy: '#22c55e', neutral: '#6b7280', sad: '#3b82f6',
  fear: '#8b5cf6', angry: '#ef4444', surprise: '#f59e0b',
  disgust: '#84cc16', confused: '#eab308', stressed: '#f97316',
  engaged: '#06b6d4', blank: '#9ca3af', not_detected: '#64748b'
};

const CATEGORY_COLORS = {
  memory_recall: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', labelKey: 'facialReport.categoryLabels.memory_recall' },
  orientation: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', labelKey: 'facialReport.categoryLabels.orientation' },
  cognitive_load: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', labelKey: 'facialReport.categoryLabels.cognitive_load' },
  emotional_memory: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', labelKey: 'facialReport.categoryLabels.emotional_memory' }
};

const SectionHeader = ({ icon: Icon, title, count }) => (
  <div className="flex items-center gap-3 mb-6">
    <Icon className="w-5 h-5 text-blue-400" />
    <h3 className="text-base font-bold text-white uppercase tracking-wider">{title}</h3>
    {count !== undefined && (
      <span className="ml-auto text-xs text-slate-500 font-mono">{count}</span>
    )}
  </div>
);

const ScoreCircle = ({ score, size = 'large' }) => {
  if (score === null || score === undefined) {
    return (
      <div className="relative" style={{ width: size === 'large' ? 120 : 80, height: size === 'large' ? 120 : 80 }}>
        <div className="w-full h-full rounded-full bg-slate-700/50 flex items-center justify-center">
          <Minus className="w-8 h-8 text-slate-500" />
        </div>
      </div>
    );
  }
  
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getColor = (s) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };
  
  const color = getColor(score);
  const circleSize = size === 'large' ? 120 : 80;
  const radius = size === 'large' ? 52 : 35;
  const strokeWidth = size === 'large' ? 10 : 6;
  
  return (
    <div className="relative" style={{ width: circleSize, height: circleSize }}>
      <svg width={circleSize} height={circleSize} className="transform -rotate-90">
        <circle cx={circleSize / 2} cy={circleSize / 2} r={radius}
          stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-slate-700" />
        <circle cx={circleSize / 2} cy={circleSize / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-black text-white ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}>
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
};

const QuestionCard = ({ question, expanded, onToggle, t }) => {
  const [isVisible, setIsVisible] = useState(false);
  const barRef = useRef(null);
  
  useEffect(() => {
    if (expanded && barRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
        { threshold: 0.5 }
      );
      observer.observe(barRef.current);
      return () => observer.disconnect();
    }
  }, [expanded]);
  
  const isAnswered = question.answered;
  const qualityScore = question.per_question_score;
  const scoreColor = qualityScore >= 80 ? '#22c55e' : qualityScore >= 60 ? '#3b82f6' : qualityScore >= 40 ? '#eab308' : '#ef4444';
  const catStyle = CATEGORY_COLORS[question.category] || CATEGORY_COLORS.memory_recall;
  
  return (
    <div className={`bg-slate-800/60 rounded-xl border overflow-hidden ${
      question.skipped ? 'border-yellow-500/30' : question.timeout ? 'border-orange-500/30' : 'border-slate-700/50'
    }`}>
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-4 hover:bg-slate-700/30 transition-colors text-left">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${catStyle.bg}`}>
          <span className={`text-sm font-bold ${catStyle.text}`}>{question.index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
              {t(catStyle.labelKey)}
            </span>
            {!isAnswered && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                {t('facialReport.notAnswered')}
              </span>
            )}
          </div>
          <p className="text-sm text-white line-clamp-2">{question.text}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isAnswered && qualityScore !== null && qualityScore !== undefined ? (
            <div className="text-right">
              <p className="text-xs text-slate-500">{t('facialReport.score')}</p>
              <p className="text-lg font-bold" style={{ color: scoreColor }}>{Math.round(qualityScore)}</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-xs text-slate-500">{t('facialReport.score')}</p>
              <p className="text-lg font-bold text-slate-500">—</p>
            </div>
          )}
          {expanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
        </div>
      </button>
      
      {expanded && (
        <div className="p-4 border-t border-slate-700/50 space-y-4">
          {isAnswered && question.transcript ? (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t('facialReport.yourResponse')}</p>
              <p className="text-sm text-slate-300 italic bg-slate-900/50 p-3 rounded-lg">"{question.transcript}"</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t('facialReport.response')}</p>
              <p className="text-sm text-slate-500 italic bg-slate-900/50 p-3 rounded-lg">{t('facialReport.noResponseRecorded')}</p>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/50 p-3 rounded-lg text-center">
              <p className="text-[10px] text-slate-500 uppercase mb-1">{t('facialReport.responseTime')}</p>
              <p className="text-lg font-bold text-white">
                {question.response_latency ? `${(question.response_latency / 1000).toFixed(1)}s` : '—'}
              </p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg text-center">
              <p className="text-[10px] text-slate-500 uppercase mb-1">{t('facialReport.confidence')}</p>
              <p className="text-lg font-bold text-white">
                {question.confidence_ratio !== null && question.confidence_ratio !== undefined 
                  ? `${Math.round(question.confidence_ratio * 100)}%` 
                  : '—'}
              </p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-lg text-center">
              <p className="text-[10px] text-slate-500 uppercase mb-1">{t('facialReport.fillerWordsLabel')}</p>
              <p className="text-lg font-bold text-yellow-400">
                {question.filler_count !== null && question.filler_count !== undefined ? question.filler_count : '—'}
              </p>
            </div>
          </div>
          
          {isAnswered && question.expression_journey && question.expression_journey.length > 0 && (
            <div ref={barRef}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t('facialReport.expressionJourney')}</p>
              <div className="flex gap-0.5 items-end h-16 bg-slate-900/30 rounded-lg p-2">
                {question.expression_journey.slice(0, 30).map((frame, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-t-sm min-w-[4px] transition-all duration-300"
                    style={{
                      height: isVisible ? `${frame.attention || 50}%` : '0%',
                      backgroundColor: EMOTION_COLORS[frame.emotion] || '#6b7280'
                    }}
                    title={`${frame.emotion} (${Math.round(frame.attention)}%)`}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {isAnswered ? (
              <>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  question.congruence_status === 'matched' ? 'bg-emerald-500/20 text-emerald-400' : 
                  question.congruence_status === 'varied' ? 'bg-yellow-500/20 text-yellow-400' : 
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {question.congruence_status === 'matched' ? t('facialReport.matched') : 
                   question.congruence_status === 'varied' ? t('facialReport.varied') : t('facialReport.unknown')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 capitalize">
                  {t(`facialReport.emotionLabels.${question.dominant_emotion}`) || 'neutral'}
                </span>
              </>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400">
                {t('facialReport.notAnswered')}
              </span>
            )}
            {question.skipped && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400">
                {t('facialReport.skippedLabel')}
              </span>
            )}
            {question.timeout && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">
                {t('facialReport.timedOut')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DomainScoreBar = ({ label, score, description, t }) => {
  const [isVisible, setIsVisible] = useState(false);
  const barRef = useRef(null);
  
  useEffect(() => {
    if (barRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
        { threshold: 0.5 }
      );
      observer.observe(barRef.current);
      return () => observer.disconnect();
    }
  }, []);
  
  if (score === null || score === undefined) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-lg font-bold text-slate-500">{t('facialReport.na')}</span>
        </div>
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="h-full bg-slate-600 w-full opacity-30" />
        </div>
        <p className="text-xs text-slate-500">{description} ({t('facialReport.noAnsweredInCategory')})</p>
      </div>
    );
  }
  
  const getColor = (s) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };
  
  const color = getColor(score);
  
  return (
    <div ref={barRef} className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-lg font-bold" style={{ color }}>{Math.round(score)}</span>
      </div>
      <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: isVisible ? `${score}%` : '0%',
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}40`
          }}
        />
      </div>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
};

const RiskFlagCard = ({ flag }) => {
  const getConfig = (severity) => {
    switch (severity) {
      case 'High': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' };
      case 'Moderate': return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)' };
      case 'Low': return { color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)' };
      default: return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)' };
    }
  };
  
  const config = getConfig(flag.severity);
  
  return (
    <div className="p-4 rounded-xl border-l-4" style={{ backgroundColor: config.bg, borderLeftColor: config.color }}>
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle size={18} style={{ color: config.color }} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-white">{flag.name}</h4>
            {flag.severity !== 'None' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: config.color, color: '#fff' }}>
                {flag.severity}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{flag.explanation}</p>
        </div>
      </div>
      {flag.severity !== 'None' && (
        <div className="ml-8 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Recommendation</p>
          <p className="text-xs text-slate-300">{flag.recommendation}</p>
        </div>
      )}
    </div>
  );
};

const FacialReport = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [report, setReport] = useState(location.state?.report || null);
  const [loading, setLoading] = useState(!location.state?.report);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  
  useEffect(() => {
    if (!report && sessionId) {
      fetchReport();
    }
  }, [sessionId]);
  
  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/facial/report/${sessionId}`);
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setReport(location.state?.report);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleQuestion = (index) => {
    setExpandedQuestions(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (isoString) => {
    if (!isoString) return new Date().toLocaleDateString();
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">{t('facialReport.loading')}</p>
        </div>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t('facialReport.reportNotFound')}</h2>
          <p className="text-slate-400 mb-6">{t('facialReport.reportNotFoundDesc')}</p>
          <button
            onClick={() => navigate('/facial')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
          >
            {t('facialReport.startNewSession')}
          </button>
        </div>
      </div>
    );
  }
  
  const scoreLabel = report.composite_score >= 80 ? { textKey: 'facialReport.scoreLabels.optimal', color: '#22c55e' } :
                    report.composite_score >= 60 ? { textKey: 'facialReport.scoreLabels.good', color: '#3b82f6' } :
                    report.composite_score >= 40 ? { textKey: 'facialReport.scoreLabels.moderateConcern', color: '#eab308' } :
                    { textKey: 'facialReport.scoreLabels.highRisk', color: '#ef4444' };
  
  const activeRiskFlags = report.risk_flags?.filter(f => f.severity !== 'None') || [];
  const answeredCount = report.questions_answered || 0;
  const skippedCount = report.questions_skipped || 0;
  
  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{t('facialReport.title')}</h1>
              <p className="text-xs text-slate-500">{formatDate(report.timestamp)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/facial')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
            >
              {t('facialReport.newSession')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/30"
            >
              {t('facialReport.dashboard')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl border border-slate-700/50">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <ScoreCircle score={report.composite_score || 0} size="large" />
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="px-4 py-1.5 rounded-full text-sm font-bold" style={{
                  backgroundColor: `${scoreLabel.color}20`, color: scoreLabel.color,
                  border: `1px solid ${scoreLabel.color}40`
                }}>
                  {t(scoreLabel.textKey)}
                </span>
                <span className="text-sm text-slate-500">{t('facialReport.ofQuestions', { count: answeredCount, total: report.total_questions })}</span>
                {skippedCount > 0 && (
                  <span className="text-sm text-yellow-400">({skippedCount} {t('facialReport.skipped')})</span>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase">{t('facialReport.duration')}</p>
                  <p className="text-xl font-bold text-white">{formatDuration(report.duration_seconds)}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase">{t('facialReport.questions')}</p>
                  <p className="text-xl font-bold text-white">{report.total_questions}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase">{t('facialReport.frames')}</p>
                  <p className="text-xl font-bold text-white">{report.facial_behavior?.total_frames_analyzed || 0}</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase">{t('facialReport.riskFlags')}</p>
                  <p className="text-xl font-bold text-white">{activeRiskFlags.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
          <SectionHeader icon={FileText} title={t('facialReport.perQuestionBreakdown')} count={report.questions?.length} />
          <div className="space-y-3">
            {report.questions?.map((q, idx) => (
              <QuestionCard key={idx} question={q} expanded={expandedQuestions[idx]} onToggle={() => toggleQuestion(idx)} t={t} />
            ))}
          </div>
        </section>

        <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
          <SectionHeader icon={Activity} title={t('facialReport.facialExpressionTimeline')} />
          <div className="relative h-20 bg-slate-800/50 rounded-xl overflow-hidden">
            {report.questions?.map((q, idx) => {
              const journey = q.expression_journey || [];
              const dominantEmotion = journey.length > 0 ? journey[Math.floor(journey.length / 2)]?.emotion || 'neutral' : 'not_detected';
              return (
                <div key={idx} className="absolute top-0 bottom-0 flex items-center justify-center border-r border-white/10"
                  style={{
                    left: `${(idx / (report.questions.length || 1)) * 100}%`,
                    width: `${100 / (report.questions.length || 1)}%`,
                    backgroundColor: `${EMOTION_COLORS[dominantEmotion]}20`
                  }}>
                  <span className="text-xs font-bold text-white/80">{idx + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {Object.entries(EMOTION_COLORS).slice(0, 8).map(([emotion, color]) => (
              <div key={emotion} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-400 capitalize">{t(`facialReport.emotionLabels.${emotion}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
          <SectionHeader icon={Brain} title={t('facialReport.cognitiveDomainScores')} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DomainScoreBar label={t('facialReport.domainScores.memoryRecallIndex')} score={report.domain_scores?.memory_recall_index}
              description={t('facialReport.domainScores.memoryRecallDesc')} t={t} />
            <DomainScoreBar label={t('facialReport.domainScores.orientationAccuracy')} score={report.domain_scores?.orientation_accuracy}
              description={t('facialReport.domainScores.orientationDesc')} t={t} />
            <DomainScoreBar label={t('facialReport.domainScores.workingMemory')} score={report.domain_scores?.working_memory_tolerance}
              description={t('facialReport.domainScores.workingMemoryDesc')} t={t} />
            <DomainScoreBar label={t('facialReport.domainScores.emotionalProcessing')} score={report.domain_scores?.emotional_processing_health}
              description={t('facialReport.domainScores.emotionalProcessingDesc')} t={t} />
            <DomainScoreBar label={t('facialReport.domainScores.attentionConsistency')} score={report.domain_scores?.attention_consistency}
              description={t('facialReport.domainScores.attentionConsistencyDesc')} t={t} />
          </div>
        </section>

        <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
          <SectionHeader icon={Eye} title={t('facialReport.facialBehavioralAnalysis')} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{t('facialReport.emotionDistribution')}</h4>
              <div className="space-y-3">
                {Object.entries(report.facial_behavior?.emotion_distribution || {}).map(([emotion, data]) => (
                  <div key={emotion} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EMOTION_COLORS[emotion] || '#6b7280' }} />
                    <span className="text-sm text-slate-400 capitalize flex-1">{t(`facialReport.emotionLabels.${emotion}`)}</span>
                    <span className="text-sm font-bold text-white w-12 text-right">{data.percentage}%</span>
                    <span className="text-xs text-slate-500 w-12 text-right">{data.seconds}s</span>
                  </div>
                ))}
                {Object.keys(report.facial_behavior?.emotion_distribution || {}).length === 0 && (
                  <p className="text-sm text-slate-500 italic">{t('facialReport.noEmotionData')}</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{t('facialReport.gazePattern')}</h4>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(report.facial_behavior?.gaze_pattern_summary || {}).map(([direction, percentage]) => (
                  <div key={direction} className="bg-slate-800/50 p-3 rounded-xl text-center">
                    <p className="text-lg font-bold text-white capitalize">{direction === 'center' ? 'C' : direction[0].toUpperCase()}</p>
                    <p className="text-xs text-slate-500">{percentage}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
          <SectionHeader icon={MessageSquare} title={t('facialReport.verbalFacialCongruence')} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-[10px] font-bold text-slate-500 uppercase pb-2">{t('facialReport.question')}</th>
                  <th className="text-left text-[10px] font-bold text-slate-500 uppercase pb-2">{t('facialReport.verbal')}</th>
                  <th className="text-left text-[10px] font-bold text-slate-500 uppercase pb-2">{t('facialReport.facial')}</th>
                  <th className="text-left text-[10px] font-bold text-slate-500 uppercase pb-2">{t('facialReport.status')}</th>
                </tr>
              </thead>
              <tbody>
                {report.congruence_analysis?.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-800">
                    <td className="py-3 text-xs text-slate-300 max-w-[200px] truncate">{item.question_topic}</td>
                    <td className="py-3 text-xs text-slate-400 capitalize">
                      {item.verbal_sentiment === 'not_given' ? (
                        <span className="text-red-400 italic">{t('facialReport.notGiven')}</span>
                      ) : (
                        item.verbal_sentiment || t('facialReport.unknown')
                      )}
                    </td>
                    <td className="py-3 text-xs text-slate-400 capitalize">{t(`facialReport.emotionLabels.${item.dominant_facial_emotion}`) || t('facialReport.unknown')}</td>
                    <td className="py-3">
                      {item.congruence_status === 'not_given' ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">{t('facialReport.notGiven')}</span>
                      ) : item.congruence_status === 'matched' ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">{t('facialReport.matched')}</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">{t('facialReport.varied')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
          <SectionHeader icon={TrendingUp} title={t('facialReport.sessionProgression')} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase mb-2">{t('facialReport.pattern')}</p>
              <p className="text-sm font-bold text-white capitalize">{report.session_progression?.pattern?.replace(/_/g, ' ')}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase mb-2">{t('facialReport.firstHalfQuality')}</p>
              <p className="text-sm font-bold text-white">
                {report.session_progression?.first_half_quality !== null 
                  ? `${Math.round(report.session_progression.first_half_quality)}%` 
                  : t('facialReport.na')}
              </p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase mb-2">{t('facialReport.secondHalfQuality')}</p>
              <p className="text-sm font-bold text-white">
                {report.session_progression?.second_half_quality !== null 
                  ? `${Math.round(report.session_progression.second_half_quality)}%` 
                  : t('facialReport.na')}
              </p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-[10px] text-slate-500 uppercase mb-2">{t('facialReport.change')}</p>
              <p className={`text-sm font-bold ${
                (report.session_progression?.degradation_percentage || 0) > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {(report.session_progression?.degradation_percentage || 0) > 0 ? '+' : ''}
                {report.session_progression?.degradation_percentage?.toFixed(1)}%
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
          <SectionHeader icon={AlertTriangle} title={t('facialReport.riskFlags')} count={activeRiskFlags.length} />
          <div className="space-y-4">
            {activeRiskFlags.map((flag, idx) => (
              <RiskFlagCard key={idx} flag={flag} />
            ))}
            {activeRiskFlags.length === 0 && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="text-emerald-500" size={24} />
                <div>
                  <p className="text-sm font-bold text-emerald-400">{t('facialReport.allClear')}</p>
                  <p className="text-xs text-emerald-500/70">{t('facialReport.noRiskFlags')}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-8 rounded-3xl border border-blue-500/20">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <Brain size={16} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">{t('facialReport.assessmentSummary')}</h3>
              <p className="text-base text-slate-200 leading-relaxed">{report.summary_paragraph}</p>
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-4 pb-8">
          <button className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700 flex items-center justify-center gap-2">
            <Download size={18} />
            {t('facialReport.downloadPdf')}
          </button>
          <button className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2">
            <Share2 size={18} />
            {t('facialReport.shareDoctor')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacialReport;
