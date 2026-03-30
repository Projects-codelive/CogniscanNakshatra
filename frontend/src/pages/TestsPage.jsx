import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Brain, 
  Zap, 
  Grid3X3,
  ChevronRight,
  Timer,
  Award,
  TrendingUp
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { repository } from '../db/database';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';

const tests = [
  {
    id: 'clock_drawing',
    name: 'Clock Drawing Test',
    description: 'Draw a clock with hands showing a specific time',
    icon: Clock,
    category: 'Cognitive — Visuospatial',
    duration: '3-5 min',
    difficulty: 'Medium',
    color: 'from-blue-500 to-indigo-600',
    path: '/tests/clock-drawing',
  },
  {
    id: 'word_recall',
    name: 'Word Recall Test',
    description: 'Memorize and recall a list of words',
    icon: Brain,
    category: 'Cognitive — Memory',
    duration: '3-4 min',
    difficulty: 'Medium',
    color: 'from-purple-500 to-pink-600',
    path: '/tests/word-recall',
  },
  {
    id: 'trail_making',
    name: 'Trail Making Test',
    description: 'Connect numbered circles in sequence',
    icon: Grid3X3,
    category: 'Cognitive — Executive',
    duration: '2-3 min',
    difficulty: 'Easy',
    color: 'from-emerald-500 to-teal-600',
    path: '/tests/trail-making',
  },
  {
    id: 'stroop',
    name: 'Stroop Test',
    description: 'Identify ink colors while reading words',
    icon: Timer,
    category: 'Cognitive — Attention',
    duration: '2-3 min',
    difficulty: 'Medium',
    color: 'from-orange-500 to-red-600',
    path: '/tests/stroop',
  },
  {
    id: 'reaction_time',
    name: 'Reaction Time Test',
    description: 'Tap as fast as possible when the box turns green',
    icon: Zap,
    category: 'Cognitive — Processing',
    duration: '1-2 min',
    difficulty: 'Easy',
    color: 'from-yellow-500 to-amber-600',
    path: '/tests/reaction-time',
  },
];

export default function TestsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestResults();
  }, []);

  const loadTestResults = async () => {
    try {
      const results = await repository.testResults.getByPatientId('default');
      const resultsMap = {};
      results.forEach((result) => {
        if (!resultsMap[result.testType]) {
          resultsMap[result.testType] = result;
        }
      });
      setTestResults(resultsMap);
    } catch (error) {
      console.error('Error loading test results:', error);
    }
    setLoading(false);
  };

  const getLastScore = (testId) => {
    const result = testResults[testId];
    return result ? result.score : null;
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return null;
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-xl lg:text-2xl font-bold text-white">Cognitive Tests</h1>
        <p className="text-slate-400 text-sm mt-1">Track your cognitive performance</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
        {/* Test Selection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tests.map((test) => {
            const Icon = test.icon;
            const lastScore = getLastScore(test.id);
            const timeAgo = getTimeAgo(lastScore?.completedAt);

            return (
              <button
                key={test.id}
                onClick={() => navigate(test.path)}
                className="bg-slate-900 rounded-2xl border border-slate-800 p-5 text-left hover:border-slate-700 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br ${test.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm lg:text-base">{test.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{test.difficulty}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{test.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {test.duration}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800">{test.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                  {lastScore !== null ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-bold text-white">{lastScore}%</span>
                      </div>
                      {timeAgo && (
                        <span className="text-xs text-slate-500">{timeAgo}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Not completed yet</span>
                  )}
                  <div className="flex items-center gap-1 text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span className="text-sm font-medium">Start</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-sm mb-1">Why Cognitive Tests?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Regular cognitive testing helps track your brain health over time. These tests measure memory, 
                attention, processing speed, and executive function. Results contribute to your overall CogniScore 
                and help detect early changes in cognitive performance.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-slate-600 text-center px-4">
          This app does not provide medical advice or diagnosis. Always consult a healthcare professional.
        </p>
      </div>
    </div>
  );
}
