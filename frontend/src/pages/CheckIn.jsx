import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Smile, CloudFog, Check, TrendingUp, TrendingDown, Minus, Flame, Lightbulb } from 'lucide-react';
import { addCheckIn, getCheckIns } from '../store/db';
import { useAppStore } from '../store/useAppStore';

export default function CheckIn() {
  const { t } = useTranslation();
  const [values, setValues] = useState({ sleep: 3, mood: 3, confusion: 3 });
  const [saved, setSaved] = useState(false);
  const [wellbeingScore, setWellbeingScore] = useState(0);
  const [trend, setTrend] = useState(null);
  const [streakInfo, setStreakInfo] = useState({ current: 0, message: '' });
  const [microInsight, setMicroInsight] = useState('');
  const [previousScore, setPreviousScore] = useState(null);
  const navigate = useNavigate();
  const { setStreak } = useAppStore();

  const scales = [
    { key: 'sleep', label: t('checkin.sleepDesc'), icon: Moon, low: t('checkin.sleep'), high: t('checkin.energy') },
    { key: 'mood', label: t('checkin.mood'), icon: Smile, low: t('checkin.mood'), high: t('checkin.energy') },
    { key: 'confusion', label: t('checkin.energy'), icon: CloudFog, low: t('checkin.sleep'), high: t('checkin.mood') },
  ];

  const loadPreviousCheckIn = useCallback(async () => {
    const checkIns = await getCheckIns(1);
    if (checkIns.length > 0) {
      setPreviousScore(checkIns[0].wellbeingScore);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPreviousCheckIn();
  }, [loadPreviousCheckIn]);

  useEffect(() => {
    const handleFocus = () => {
      loadPreviousCheckIn();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadPreviousCheckIn]);

  const calculateStreak = async () => {
    const checkIns = await getCheckIns(30);
    if (checkIns.length === 0) return { current: 0, message: '' };

    let streak = 0;
    const dates = checkIns.map(c => c.date.split('T')[0]);

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (dates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      current: streak,
      message: streak > 1 ? `${streak} ${t('dashboard.streak')}!` : t('checkin.takeCare'),
    };
  };

  const handleSave = async () => {
    const score = Math.round(((values.sleep + values.mood + (6 - values.confusion)) / 12) * 100);
    setWellbeingScore(score);

    await addCheckIn({
      date: new Date().toISOString(),
      sleep: values.sleep,
      mood: values.mood,
      confusion: values.confusion,
      wellbeingScore: score,
    });

    if (previousScore !== null) {
      const change = score - previousScore;
      setTrend({
        change,
        changeType: change > 2 ? 'increase' : change < -2 ? 'decrease' : 'stable',
      });
    }

    const streakData = await calculateStreak();
    setStreakInfo(streakData);
    setStreak(streakData.current);

    if (values.sleep <= 2) {
      setMicroInsight(t('checkin.savedSuccess'));
    } else if (values.mood <= 2) {
      setMicroInsight(t('checkin.greatDay'));
    } else if (values.confusion >= 4) {
      setMicroInsight(t('checkin.takeCare'));
    } else {
      setMicroInsight(t('checkin.greatDay'));
    }

    setSaved(true);
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-slate-950 pb-8">
        <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
          <h1 className="text-lg lg:text-xl font-bold text-white">{t('checkin.savedSuccess')}</h1>
        </div>
        <div className="p-4 lg:p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 lg:w-10 lg:h-10 text-emerald-500" />
          </div>
          <p className="text-lg lg:text-xl font-bold text-white">{t('checkin.savedSuccess')}</p>

          <div className="mt-6 w-full max-w-md space-y-4">
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-center">
              <p className="text-sm text-slate-400">{t('checkin.title')}</p>
              <p className="text-3xl lg:text-4xl font-bold text-white mt-1">{wellbeingScore}%</p>
              {trend && (
                <div className={`flex items-center justify-center gap-1 mt-2 text-sm ${
                  trend.changeType === 'increase' ? 'text-emerald-400' : trend.changeType === 'decrease' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {trend.changeType === 'increase' && <TrendingUp className="w-4 h-4" />}
                  {trend.changeType === 'decrease' && <TrendingDown className="w-4 h-4" />}
                  {trend.changeType === 'stable' && <Minus className="w-4 h-4" />}
                  <span>
                    {trend.changeType === 'stable'
                      ? t('insights.stable')
                      : `${trend.changeType === 'increase' ? t('insights.improvement') : t('insights.decline')} ${Math.abs(trend.change)}%`}
                  </span>
                </div>
              )}
            </div>

            {streakInfo.current > 0 && (
              <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20 flex items-center gap-3">
                <Flame className="w-5 h-5 text-orange-400" />
                <p className="text-sm text-white">{streakInfo.message}</p>
              </div>
            )}

            {microInsight && (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300">{microInsight}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 lg:px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
          >
            {t('dashboard.title')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-lg lg:text-xl font-bold text-white">{t('checkin.title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('checkin.subtitle')}</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-3xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {scales.map((s) => (
            <div key={s.key} className="bg-slate-900 rounded-2xl p-4 lg:p-5 border border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                </div>
                <p className="font-medium text-white text-sm">{s.label}</p>
              </div>
              <div className="flex justify-between gap-1 lg:gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setValues({ ...values, [s.key]: v })}
                    className={`flex-1 h-10 lg:h-12 rounded-lg lg:rounded-xl font-semibold text-sm transition-all ${
                      values[s.key] === v
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-slate-500">{t('common.none')}</span>
                <span className="text-[10px] text-slate-500">{t('common.all')}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          className="w-full h-12 lg:h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-base lg:text-lg font-semibold transition-all"
        >
          {t('checkin.save')}
        </button>
      </div>
    </div>
  );
}
