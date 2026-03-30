import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { db } from '../store/db';
import CogniScoreGauge from '../components/gauge/CogniScoreGauge';
import { calculateAllScores, getScoreCategory } from '../engine/cogniScore';

const Dashboard = () => {
  const navigate = useNavigate();
  const { patientName, cogniScore: storeScore, streak } = useAppStore();
  const [greeting, setGreeting] = useState('');
  const [cogniScore, setCogniScore] = useState(storeScore || 75);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    avgSleep: 0,
    medicationAdherence: 0,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const patientId = 1;
      
      const [checkIns, testResults, speechSessions, facialSessions, medicationLogs] = await Promise.all([
        db.checkIns.where('patientId').equals(patientId).reverse().limit(30).toArray(),
        db.testResults.where('patientId').equals(patientId).reverse().limit(50).toArray(),
        db.speechSessions.where('patientId').equals(patientId).reverse().limit(10).toArray(),
        db.facialSessions.where('patientId').equals(patientId).reverse().limit(10).toArray(),
        db.medicationLogs.where('patientId').equals(patientId).reverse().limit(30).toArray(),
      ]);

      const scores = calculateAllScores({
        testResults,
        speechSessions,
        facialSessions,
        checkIns,
        medicationLogs,
      });

      setCogniScore(scores.overall || storeScore || 75);
      setScoreBreakdown(scores.breakdown);

      const activities = [];
      
      checkIns.slice(0, 5).forEach(c => {
        activities.push({
          id: `checkin-${c.id}`,
          type: 'checkin',
          title: 'Daily Check-in',
          description: `Sleep: ${c.sleep}/5, Mood: ${c.mood}/5`,
          time: c.date,
          icon: ClipboardCheck,
          color: 'bg-blue-500',
        });
      });

      testResults.slice(0, 5).forEach(t => {
        const testNames = {
          'clock-drawing': 'Clock Drawing',
          'word-recall': 'Word Recall',
          'trail-making': 'Trail Making',
          'stroop': 'Stroop Test',
          'reaction-time': 'Reaction Time',
        };
        activities.push({
          id: `test-${t.id}`,
          type: 'test',
          title: testNames[t.testType] || t.testType,
          description: `Score: ${t.score}%`,
          time: t.completedAt,
          icon: Brain,
          color: 'bg-violet-500',
        });
      });

      speechSessions.slice(0, 3).forEach(s => {
        activities.push({
          id: `speech-${s.id}`,
          type: 'speech',
          title: 'Speech Analysis',
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
          title: 'Facial Analysis',
          description: `Mood: ${f.moodScore || 0}%`,
          time: f.createdAt,
          icon: User,
          color: 'bg-indigo-500',
        });
      });

      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivities(activities.slice(0, 8));

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayCheckIns = checkIns.filter(c => 
          c.date && c.date.startsWith(dateStr)
        );
        const dayTests = testResults.filter(t =>
          t.completedAt && t.completedAt.startsWith(dateStr)
        );

        let dayScore = null;
        if (dayCheckIns.length > 0) {
          dayScore = Math.round(
            dayCheckIns.reduce((sum, c) => sum + (c.mood / 5 + c.sleep / 5) * 50, 0) / dayCheckIns.length
          );
        }

        last7Days.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          score: dayScore,
          hasData: dayCheckIns.length > 0 || dayTests.length > 0,
        });
      }
      setWeeklyData(last7Days);

      const recentCheckIns = checkIns.slice(0, 7);
      const avgSleep = recentCheckIns.length > 0
        ? Math.round(recentCheckIns.reduce((sum, c) => sum + c.sleep, 0) / recentCheckIns.length * 10) / 10
        : 0;

      const takenMeds = medicationLogs.filter(l => l.status === 'taken').length;
      const adherence = medicationLogs.length > 0
        ? Math.round((takenMeds / medicationLogs.length) * 100)
        : 0;

      setStats({
        testsCompleted: testResults.length,
        avgSleep,
        medicationAdherence: adherence,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const getTrendIcon = (current, previous) => {
    if (!previous) return <Minus className="w-4 h-4 text-slate-400" />;
    const diff = current - previous;
    if (diff > 2) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (diff < -2) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const quickActions = [
    { icon: ClipboardCheck, label: 'Check-in', desc: 'Log daily wellbeing', path: '/checkin', color: 'bg-blue-500' },
    { icon: Activity, label: 'Speech', desc: 'Voice analysis', path: '/speech', color: 'bg-purple-500' },
    { icon: Camera, label: 'Facial', desc: 'Face analysis', path: '/facial', color: 'bg-indigo-500' },
    { icon: Brain, label: 'Tests', desc: 'Cognitive games', path: '/tests', color: 'bg-cyan-500' },
  ];

  const scoreCategory = getScoreCategory(cogniScore);

  return (
    <div className="space-y-4 lg:space-y-6">
      <header className="bg-gradient-to-br from-blue-700 to-blue-900 p-5 lg:p-8 rounded-2xl lg:rounded-3xl shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">
              {greeting}, {patientName}
            </h1>
            <p className="text-blue-100 text-sm lg:text-base mt-1">
              Your cognitive wellness companion
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-white font-semibold">{streak}-day streak</span>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 lg:p-6 rounded-2xl border border-slate-800 lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <CogniScoreGauge score={cogniScore} size={160} />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Overall CogniScore</p>
                <p className="text-lg font-bold" style={{ color: scoreCategory.color }}>
                  {scoreCategory.label}
                </p>
              </div>
              
              {scoreBreakdown && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {[
                    { key: 'cognitiveTests', label: 'Cognitive Tests', weight: 35 },
                    { key: 'speechAnalysis', label: 'Speech', weight: 25 },
                    { key: 'facialAnalysis', label: 'Facial', weight: 15 },
                    { key: 'checkIns', label: 'Check-ins', weight: 15 },
                    { key: 'medications', label: 'Medications', weight: 10 },
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
                <span className="text-sm font-medium">View Detailed Insights</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Weekly Overview</h3>
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
              <p className="text-[10px] text-slate-500">Tests</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
              <p className="text-lg font-bold text-white">{stats.avgSleep}</p>
              <p className="text-[10px] text-slate-500">Avg Sleep</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
              <p className="text-lg font-bold text-white">{stats.medicationAdherence}%</p>
              <p className="text-[10px] text-slate-500">Adherence</p>
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
            Recent Activity
          </h3>
          <button 
            onClick={() => navigate('/insights')}
            className="text-blue-400 text-sm hover:text-blue-300"
          >
            View All
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
                  {new Date(activity.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No recent activity</p>
            <p className="text-sm text-slate-500">Complete a check-in or test to get started</p>
          </div>
        )}
      </div>

      {cogniScore < 60 && (
        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-400">Monitor Closely</p>
            <p className="text-sm text-yellow-400/70">Consider consulting a healthcare professional about your scores.</p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center px-4 pb-4">
        This app does not provide medical advice or diagnosis. Always consult a healthcare professional.
      </p>
    </div>
  );
};

export default Dashboard;
