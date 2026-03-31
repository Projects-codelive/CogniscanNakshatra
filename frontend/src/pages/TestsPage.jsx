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
import { useTranslation } from 'react-i18next';

const tests = [
  {
    id: 'clock_drawing',
    nameKey: 'tests.clockDrawing.title',
    descriptionKey: 'tests.clockDrawing.description',
    icon: Clock,
    categoryKey: 'testsPage.category.visuospatial',
    durationKey: 'common.3to5min',
    difficultyKey: 'testsPage.difficulty.medium',
    color: 'from-blue-500 to-indigo-600',
    path: '/tests/clock-drawing',
  },
  {
    id: 'word_recall',
    nameKey: 'tests.wordRecall.title',
    descriptionKey: 'tests.wordRecall.description',
    icon: Brain,
    categoryKey: 'testsPage.category.memory',
    durationKey: 'common.3to4min',
    difficultyKey: 'testsPage.difficulty.medium',
    color: 'from-purple-500 to-pink-600',
    path: '/tests/word-recall',
  },
  {
    id: 'trail_making',
    nameKey: 'tests.trailMaking.title',
    descriptionKey: 'tests.trailMaking.description',
    icon: Grid3X3,
    categoryKey: 'testsPage.category.executive',
    durationKey: 'common.2to3min',
    difficultyKey: 'testsPage.difficulty.easy',
    color: 'from-emerald-500 to-teal-600',
    path: '/tests/trail-making',
  },
  {
    id: 'stroop',
    nameKey: 'tests.stroop.title',
    descriptionKey: 'tests.stroop.description',
    icon: Timer,
    categoryKey: 'testsPage.category.attention',
    durationKey: 'common.2to3min',
    difficultyKey: 'testsPage.difficulty.medium',
    color: 'from-orange-500 to-red-600',
    path: '/tests/stroop',
  },
  {
    id: 'reaction_time',
    nameKey: 'tests.reactionTime.title',
    descriptionKey: 'tests.reactionTime.description',
    icon: Zap,
    categoryKey: 'testsPage.category.processing',
    durationKey: 'common.1to2min',
    difficultyKey: 'testsPage.difficulty.easy',
    color: 'from-yellow-500 to-amber-600',
    path: '/tests/reaction-time',
  },
];

export default function TestsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestResults();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      loadTestResults();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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
    if (days > 0) return `${days}d ${t('common.ago')}`;
    if (hours > 0) return `${hours}h ${t('common.ago')}`;
    return t('common.justNow');
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-xl lg:text-2xl font-bold text-white">{t('testsPage.title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('testsPage.subtitle')}</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
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
                      <h3 className="font-semibold text-white text-sm lg:text-base">{t(test.nameKey)}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{t(test.difficultyKey)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{t(test.descriptionKey)}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t(test.durationKey)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800">{t(test.categoryKey)}</span>
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
                    <span className="text-xs text-slate-500">{t('testsPage.notCompletedYet')}</span>
                  )}
                  <div className="flex items-center gap-1 text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span className="text-sm font-medium">{t('testsPage.start')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-sm mb-1">{t('testsPage.whyCognitiveTests')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('testsPage.whyCognitiveTestsDesc')}
              </p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center px-4">
          {t('dashboard.disclaimer')}
        </p>
      </div>
    </div>
  );
}
