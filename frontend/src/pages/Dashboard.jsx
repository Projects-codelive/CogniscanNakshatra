import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Pill,
  ClipboardCheck,
  Camera,
  ChevronRight,
  Flame,
  AlertTriangle,
  Mic,
  User,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import useAuthStore from '../store/useAuthStore';
import { db } from '../store/db';
import { calculateRiskScore, getWeeklySummary } from '../engine/declineEngine';
import { generateAIRecommendation } from '../engine/interventionEngine';
import { useSyncStore } from '../store/useSyncStore';
import CogniScoreGauge from '../components/gauge/CogniScoreGauge';
import { calculateAllScores, getScoreCategory } from '../engine/cogniScore';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { cogniScore: storeScore, streak } = useAppStore();
  const { isOnline, isOfflineMode, getQueueStats } = useSyncStore();
  const patientName = user?.name || user?.email?.split('@')[0] || 'User';
  
  const [cogniScore, setCogniScore] = useState(storeScore || 0);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    avgSleep: 0,
    medicationAdherence: 0,
  });
  const [riskData, setRiskData] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  }, [t]);

  const getStatusColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-500';
      case 'monitor': return 'bg-yellow-500';
      default: return 'bg-emerald-500';
    }
  };

  const getStatusTextColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-400';
      case 'monitor': return 'text-yellow-400';
      default: return 'text-emerald-400';
    }
  };

  const getStatusLabel = (level) => {
    switch (level) {
      case 'high': return 'Declining';
      case 'monitor': return 'Monitor';
      default: return 'Stable';
    }
  };

  const getPrimaryReason = (flags) => {
    if (!flags || flags.length === 0) return null;
    const severe = flags.find(f => f.severity === 'severe');
    const moderate = flags.find(f => f.severity === 'moderate');
    const flag = severe || moderate || flags[0];
    return `${flag.domain.charAt(0).toUpperCase() + flag.domain.slice(1)} ${flag.change > 0 ? '↑' : '↓'} ${Math.abs(flag.change)}%`;
  };

  const getRecommendedAction = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'Schedule assessment with doctor';
      case 'monitor': return 'Continue monitoring closely';
      default: return 'Continue regular activities';
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const patientId = 'default';
      
      const [checkIns, testResults, speechSessions, facialSessions, medicationLogs, risk, weekly, insight] = await Promise.all([
        db.checkIns.where('patientId').equals(patientId).reverse().limit(30).toArray(),
        db.testResults.where('patientId').equals(patientId).reverse().limit(50).toArray(),
        db.speechSessions.where('patientId').equals(patientId).reverse().limit(10).toArray(),
        db.facialSessions.where('patientId').equals(patientId).reverse().limit(10).toArray(),
        db.medications.where('patientId').equals(patientId).reverse().limit(30).toArray(),
        calculateRiskScore(patientId),
        getWeeklySummary(patientId),
        generateAIRecommendation(patientId),
      ]);

      setRiskData(risk);
      setAiInsight(insight);

      const scores = calculateAllScores({
        testResults,
        speechSessions,
        facialSessions,
        checkIns,
        medicationLogs,
      });

      const effectiveScore = risk?.weightedScore || scores.overall || storeScore || 0;

      setCogniScore(effectiveScore);
      setScoreBreakdown(scores.breakdown);

      const activities = [];
      
      checkIns.slice(0, 5).forEach(c => {
        activities.push({
          id: `checkin-${c.id}`,
          type: 'checkin',
          title: t('dashboard.activityTypes.dailyCheckin'),
          description: `Sleep: ${c.sleep}/5, Mood: ${c.mood}/5`,
          time: c.date,
          icon: ClipboardCheck,
          color: 'bg-blue-500',
        });
      });

      testResults.slice(0, 5).forEach(t_result => {
        const testNames = {
          'clock-drawing': t('dashboard.activityTypes.clockDrawing'),
          'word-recall': t('dashboard.activityTypes.wordRecall'),
          'trail-making': t('dashboard.activityTypes.trailMaking'),
          'stroop': t('dashboard.activityTypes.stroopTest'),
          'reaction-time': t('dashboard.activityTypes.reactionTime'),
        };
        activities.push({
          id: `test-${t_result.id}`,
          type: 'test',
          title: testNames[t_result.testType] || t_result.testType,
          description: `Score: ${t_result.score}%`,
          time: t_result.completedAt,
          icon: Brain,
          color: 'bg-violet-500',
        });
      });

      speechSessions.slice(0, 3).forEach(s => {
        activities.push({
          id: `speech-${s.id}`,
          type: 'speech',
          title: t('dashboard.activityTypes.speechAnalysis'),
          description: `Fluency: ${s.fluencyScore || 0}%`,
          time: s.createdAt,
          icon: Mic,
          color: 'bg-purple-500',
        });
      });

      facialSessions.slice(0, 3).forEach(f => {
        activities.push({
          id: `facial-${f.id}`,
          type: 'facial',
          title: t('dashboard.activityTypes.facialAnalysis'),
          description: `Mood: ${f.moodScore || 0}%`,
          time: f.createdAt,
          icon: User,
          color: 'bg-indigo-500',
        });
      });

      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivities(activities.slice(0, 8));

      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayCheckIns = checkIns.filter(c => 
          c.date && c.date.startsWith(dateStr)
        );
        const dayTests = testResults.filter(t_result =>
          t_result.completedAt && t_result.completedAt.startsWith(dateStr)
        );

        let dayScore = null;
        if (dayCheckIns.length > 0) {
          dayScore = Math.round(
            dayCheckIns.reduce((sum, c) => sum + (c.mood / 5 + c.sleep / 5) * 50, 0) / dayCheckIns.length
          );
        }

        last7Days.push({
          day: weekDays[date.getDay()],
          score: dayScore,
          hasData: dayCheckIns.length > 0 || dayTests.length > 0,
        });
      }
      setWeeklyData(last7Days);

      const recentCheckIns = checkIns.slice(0, 7);
      const avgSleep = recentCheckIns.length > 0
        ? Math.round(recentCheckIns.reduce((sum, c) => sum + c.sleep, 0) / recentCheckIns.length * 10) / 10
        : weekly.avgSleep || 0;

      const adherence = weekly.adherence || 0;

      setStats({
        testsCompleted: weekly.testsCompleted || testResults.length,
        avgSleep,
        medicationAdherence: adherence,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [t, storeScore]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const handleFocus = () => {
      loadDashboardData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDashboardData]);

  const quickActions = [
    { icon: ClipboardCheck, label: t('dashboard.quickActions.checkin'), desc: t('dashboard.quickActions.checkinDesc'), path: '/checkin', color: 'bg-blue-500' },
    { icon: Activity, label: t('dashboard.quickActions.speech'), desc: t('dashboard.quickActions.speechDesc'), path: '/speech', color: 'bg-purple-500' },
    { icon: Camera, label: t('dashboard.quickActions.facial'), desc: t('dashboard.quickActions.facialDesc'), path: '/facial', color: 'bg-indigo-500' },
    { icon: Brain, label: t('dashboard.quickActions.tests'), desc: t('dashboard.quickActions.testsDesc'), path: '/tests', color: 'bg-cyan-500' },
  ];

  const scoreCategory = getScoreCategory(cogniScore);
  const riskLevel = riskData?.riskLevel || 'stable';
  const primaryReason = getPrimaryReason(riskData?.flags);
  const recommendedAction = getRecommendedAction(riskLevel);

  return (
    <div className="space-y-4 lg:space-y-6">
      {(isOfflineMode || !isOnline) && (
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-amber-400" />
          <div className="flex-1">
            <p className="text-amber-400 font-medium text-sm">Offline Mode Active</p>
            <p className="text-amber-400/70 text-xs">Changes will sync when online</p>
          </div>
          <RefreshCw className="w-4 h-4 text-amber-400" />
        </div>
      )}

      <header className={`p-5 lg:p-6 rounded-2xl lg:rounded-3xl shadow-lg ${
        riskLevel === 'high' ? 'bg-gradient-to-br from-red-700 to-red-900' :
        riskLevel === 'monitor' ? 'bg-gradient-to-br from-yellow-700 to-yellow-900' :
        'bg-gradient-to-br from-blue-700 to-blue-900'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${getStatusColor(riskLevel)}`} />
              <span className={`text-sm font-semibold ${getStatusTextColor(riskLevel)}`}>
                Status: {getStatusLabel(riskLevel)}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">
              {greeting}, {patientName}
            </h1>
            <p className="text-white/80 text-sm lg:text-base mt-1">
              {t('dashboard.tagline')}
            </p>
            {primaryReason && (
              <p className="text-white/60 text-xs mt-2">
                Reason: {primaryReason}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-white font-semibold">{streak}-{t('dashboard.streak')}</span>
              </div>
            )}
            <div className="bg-white/10 px-4 py-2 rounded-full">
              <span className="text-white font-semibold text-sm">
                Action: {recommendedAction}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 lg:p-6 rounded-2xl border border-slate-800 lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <CogniScoreGauge score={cogniScore} size={160} />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-slate-400 text-sm">{t('dashboard.cogniScore')}</p>
                <p className="text-lg font-bold" style={{ color: scoreCategory.color }}>
                  {scoreCategory.label}
                </p>
              </div>
              
              {scoreBreakdown && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {[
                    { key: 'cognitiveTests', label: t('dashboard.categories.cognitiveTests'), weight: 35 },
                    { key: 'speechAnalysis', label: t('dashboard.categories.speechAnalysis'), weight: 25 },
                    { key: 'facialAnalysis', label: t('dashboard.categories.facialAnalysis'), weight: 15 },
                    { key: 'checkIns', label: t('dashboard.categories.checkIns'), weight: 15 },
                    { key: 'medications', label: t('dashboard.categories.medications'), weight: 10 },
                  ].map(({ key, label, weight }) => (
                    <div key={key} className="bg-slate-800/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{label}</span>
                        <span className="text-xs text-slate-500">{weight}%</span>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {scoreBreakdown[key] !== null ? `${scoreBreakdown[key]}%` : '--'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => navigate('/insights')}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mt-2"
              >
                <span className="text-sm font-medium">{t('dashboard.viewInsights')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">{t('dashboard.weeklyOverview')}</h3>
            <div className="flex items-end justify-between h-20 gap-1">
              {weeklyData.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={`w-full rounded-t-md transition-all ${day.hasData ? 'bg-blue-500' : 'bg-slate-700/50'}`}
                    style={{ height: day.score ? `${day.score * 0.7}%` : '20%' }}
                  />
                  <span className="text-[10px] text-slate-500">{day.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
              <p className="text-lg font-bold text-white">{stats.testsCompleted}</p>
              <p className="text-[10px] text-slate-500">{t('dashboard.tests')}</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
              <p className="text-lg font-bold text-white">{stats.avgSleep}</p>
              <p className="text-[10px] text-slate-500">{t('dashboard.avgSleep')}</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
              <p className="text-lg font-bold text-white">{stats.medicationAdherence}%</p>
              <p className="text-[10px] text-slate-500">{t('dashboard.adherence')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="bg-slate-900 p-4 lg:p-5 rounded-xl lg:rounded-2xl border border-slate-800 hover:border-slate-700 transition-all text-left group"
          >
            <div className={`w-10 h-10 lg:w-12 lg:h-12 ${action.color} rounded-xl flex items-center justify-center mb-3`}>
              <action.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <p className="font-semibold text-white text-sm lg:text-base">{action.label}</p>
            <p className="text-slate-500 text-xs mt-0.5">{action.desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            {t('dashboard.recentActivity')}
          </h3>
          <button 
            onClick={() => navigate('/insights')}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            {t('dashboard.viewAll')}
          </button>
        </div>
        
        {recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                <div className={`w-10 h-10 ${activity.color} rounded-lg flex items-center justify-center shrink-0`}>
                  <activity.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{activity.title}</p>
                  <p className="text-xs text-slate-400 truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">
                  {new Date(activity.time).toLocaleDateString(i18n.language === 'mr' ? 'mr-IN' : i18n.language === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">{t('dashboard.noRecentActivity')}</p>
            <p className="text-sm text-slate-500">{t('dashboard.getStarted')}</p>
          </div>
        )}
      </div>

      {aiInsight && riskLevel !== 'stable' && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          riskLevel === 'high' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
        }`}>
          <Brain className={`w-5 h-5 shrink-0 mt-0.5 ${getStatusTextColor(riskLevel)}`} />
          <div>
            <p className={`font-semibold text-sm ${getStatusTextColor(riskLevel)}`}>AI Insight</p>
            <p className="text-slate-300 text-sm mt-1">{aiInsight.summary}</p>
            {aiInsight.observations?.length > 0 && (
              <ul className="text-xs text-slate-400 mt-2 space-y-1">
                {aiInsight.observations.slice(0, 2).map((obs, i) => (
                  <li key={i}>• {obs}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {riskLevel === 'stable' && (
        <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-400 text-sm">All Clear</p>
            <p className="text-slate-300 text-sm">Your cognitive health metrics are stable.</p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center px-4 pb-4">
        {t('dashboard.disclaimer')}
      </p>
    </div>
  );
};

export default Dashboard;
