import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pill, Check, AlertTriangle, Clock, X, ChevronRight } from 'lucide-react';
import { addMedication, updateMedication, deleteMedication, getMedications } from '../store/db';

const TIME_LABELS_KEYS = {
  1: ['medications.timeLabels.morning'],
  2: ['medications.timeLabels.morning', 'medications.timeLabels.evening'],
  3: ['medications.timeLabels.morning', 'medications.timeLabels.afternoon', 'medications.timeLabels.night'],
  4: ['medications.timeLabels.morning', 'medications.timeLabels.noon', 'medications.timeLabels.evening', 'medications.timeLabels.night']
};

const DEFAULT_TIMES = {
  1: ['09:00'],
  2: ['09:00', '21:00'],
  3: ['09:00', '14:00', '21:00']
};

function formatTime(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function getAdherenceStats(meds) {
  if (meds.length === 0) return { overall: 0, missedThisWeek: 0 };

  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  let totalDoses = 0;
  let takenDoses = 0;

  meds.forEach(med => {
    const freq = med.frequency || 1;
    totalDoses += last7Days.length * freq;
    const weekTaken = med.taken.filter(t => last7Days.includes(t.date));
    takenDoses += weekTaken.filter(t => t.taken).length;
  });

  const overall = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;
  const missedThisWeek = totalDoses - takenDoses;

  return { overall, missedThisWeek };
}

export default function Medications() {
  const { t } = useTranslation();
  const [meds, setMeds] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState(1);
  const [times, setTimes] = useState(['09:00']);
  const [errors, setErrors] = useState({});
  const [justAdded, setJustAdded] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  const loadMedications = useCallback(async () => {
    const medications = await getMedications();
    setMeds(medications);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMedications();
  }, [loadMedications]);

  useEffect(() => {
    const handleFocus = () => {
      loadMedications();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadMedications]);

  const stats = getAdherenceStats(meds);

  const handleFrequencySelect = (freq) => {
    setFrequency(freq);
    const defaults = DEFAULT_TIMES[freq] || Array(freq).fill('09:00');
    setTimes(defaults.slice(0, freq));
    if (!defaults[freq]) {
      const newTimes = [...defaults];
      while (newTimes.length < freq) {
        newTimes.push('09:00');
      }
      setTimes(newTimes);
    }
    setStep(3);
    setErrors({});
  };

  const handleTimeChange = (index, value) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
    setErrors(prev => ({ ...prev, times: false }));
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1 && !name.trim()) {
      newErrors.name = t('medications.form.pleaseEnterName');
    }
    
    if (step === 3) {
      if (times.some(time => !time)) {
        newErrors.times = t('medications.form.pleaseSetTimes');
      }
      const uniqueTimes = new Set(times);
      if (uniqueTimes.size !== times.length) {
        newErrors.times = t('medications.form.timesCannotSame');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step === 1) setStep(2);
      else if (step === 3) setStep(4);
    }
  };

  const handleSave = async () => {
    if (!validateStep()) return;
    
    const medication = {
      name: name.trim(),
      frequency,
      times: [...times],
      taken: []
    };
    
    await addMedication(medication);
    setJustAdded(medication);
    setName('');
    setFrequency(1);
    setTimes(['09:00']);
    setStep(1);
    setShowAdd(false);
    setErrors({});
    loadMedications();
    
    setTimeout(() => setJustAdded(null), 5000);
  };

  const toggleTaken = async (med) => {
    const existing = med.taken.find((time) => time.date === today);
    const updated = existing
      ? med.taken.map((time) => time.date === today ? { ...time, taken: !time.taken } : time)
      : [...med.taken, { date: today, taken: true }];
    await updateMedication(med.id, { taken: updated });
    loadMedications();
  };

  const handleDelete = async (id) => {
    await deleteMedication(id);
    loadMedications();
  };

  const adherence = (med) => {
    if (!med.taken || med.taken.length === 0) return 0;
    const taken = med.taken.filter((time) => time.taken).length;
    return Math.round((taken / med.taken.length) * 100);
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setFrequency(1);
    setTimes(['09:00']);
    setErrors({});
  };

  const timeLabels = TIME_LABELS_KEYS[frequency] || TIME_LABELS_KEYS[1];

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-xl lg:text-2xl font-bold text-white">{t('medications.title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('medications.subtitle')}</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4 max-w-lg mx-auto">
        {stats.overall > 0 && (
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{t('medications.weeklyProgress')}</p>
                <p className="text-3xl font-bold text-white">{stats.overall}%</p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                stats.overall >= 80 ? 'bg-emerald-500/20' : stats.overall >= 50 ? 'bg-yellow-500/20' : 'bg-red-500/20'
              }`}>
                <div className={`w-8 h-8 rounded-full ${
                  stats.overall >= 80 ? 'bg-emerald-500' : stats.overall >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`} style={{ 
                  background: `conic-gradient(${stats.overall >= 80 ? '#10b981' : stats.overall >= 50 ? '#eab308' : '#ef4444'} ${stats.overall}%, #1e293b 0%)`
                }}>
                  <div className="w-full h-full rounded-full bg-slate-800" style={{ 
                    clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)'
                  }} />
                </div>
              </div>
            </div>
            {stats.missedThisWeek > 0 && (
              <p className="text-sm text-slate-400 mt-3">
                {stats.missedThisWeek} {stats.missedThisWeek > 1 ? t('medications.dosesMissed_plural') : t('medications.dosesMissed')} {t('common.thisWeek')}
              </p>
            )}
          </div>
        )}

        {justAdded && (
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-emerald-400 text-lg">{t('medications.addedSuccess')}</p>
                <p className="text-emerald-400/70 text-sm">{t('medications.savedSuccess')}</p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-white font-bold text-lg">{justAdded.name}</p>
              <p className="text-slate-400 mt-1">
                {justAdded.frequency} {justAdded.frequency > 1 ? t('medications.timesDaily_plural') : t('medications.timesDaily')}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {justAdded.times.map((time, i) => (
                  <span key={i} className="bg-slate-800 px-3 py-1 rounded-full text-sm text-slate-300">
                    {formatTime(time)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {meds.map((med) => {
            const takenToday = med.taken?.find((time) => time.date === today)?.taken;
            const medAdherence = adherence(med);

            return (
              <div key={med.id} className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Pill className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-lg">{med.name}</p>
                    <p className="text-slate-400 mt-1">
                      {med.frequency} {med.frequency > 1 ? t('medications.timesDaily_plural') : t('medications.timesDaily')}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(med.times || ['09:00']).map((time, i) => (
                        <span key={i} className="bg-slate-800 px-3 py-1.5 rounded-full text-sm text-slate-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(time)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => toggleTaken(med)}
                    className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-2 text-lg font-bold transition-all ${
                      takenToday 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Check className="w-5 h-5" />
                    {takenToday ? t('medications.takenToday') : t('medications.markAsTaken')}
                  </button>
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="w-14 h-14 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {medAdherence > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500">{t('medications.adherence')}</span>
                      <span className={`font-bold ${
                        medAdherence >= 80 ? 'text-emerald-400' : medAdherence >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{medAdherence}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          medAdherence >= 80 ? 'bg-emerald-500' : medAdherence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${medAdherence}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
            <div className="bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{t('medications.addMedication')}</h2>
                <button
                  onClick={() => { setShowAdd(false); resetForm(); }}
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <Pill className="w-8 h-8 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{t('medications.form.whatMedicine')}</h3>
                      <p className="text-slate-400">{t('medications.form.enterMedicineName')}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">{t('medications.form.medicineName')}</label>
                      <input
                        type="text"
                        placeholder={t('medications.form.medicinePlaceholder')}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setErrors({}); }}
                        className={`w-full h-16 px-5 text-xl bg-slate-800 border-2 rounded-2xl text-white placeholder-slate-500 focus:outline-none ${
                          errors.name ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
                        }`}
                        autoFocus
                      />
                      {errors.name && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> {errors.name}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleNext}
                      disabled={!name.trim()}
                      className={`w-full h-16 rounded-2xl text-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        name.trim() 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {t('medications.next')} <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{t('medications.form.howOften')}</h3>
                      <p className="text-slate-400">{t('medications.form.timesPerDay')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((freq) => (
                        <button
                          key={freq}
                          onClick={() => handleFrequencySelect(freq)}
                          className={`h-24 rounded-2xl text-2xl font-bold transition-all ${
                            frequency === freq
                              ? 'bg-blue-600 text-white scale-105'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <div>{freq}</div>
                          <div className="text-sm font-normal opacity-70">
                            {freq > 1 ? t('medications.form.times') : t('medications.form.time')}
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setStep(1)}
                      className="w-full h-14 rounded-2xl bg-slate-800 text-slate-300 font-bold"
                    >
                      {t('medications.back')}
                    </button>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{t('medications.form.setTimes')}</h3>
                      <p className="text-slate-400">{t('medications.form.whenTake', { name })}</p>
                    </div>

                    <div className="space-y-4">
                      {times.map((time, index) => (
                        <div key={index} className="bg-slate-800 rounded-2xl p-4">
                          <label className="text-slate-400 text-sm mb-2 block">
                            {t(timeLabels[index])}
                          </label>
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => handleTimeChange(index, e.target.value)}
                            className="w-full h-14 px-4 bg-slate-700 border-2 border-slate-600 rounded-xl text-white text-lg focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      ))}
                    </div>

                    {errors.times && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400">{errors.times}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(2)}
                        className="w-1/3 h-14 rounded-2xl bg-slate-800 text-slate-300 font-bold"
                      >
                        {t('medications.back')}
                      </button>
                      <button
                        onClick={handleNext}
                        className="w-2/3 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
                      >
                        {t('medications.review')} <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{t('medications.form.reviewSave')}</h3>
                      <p className="text-slate-400">{t('medications.form.lookRight')}</p>
                    </div>

                    <div className="bg-slate-800 rounded-2xl p-5">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                          <Pill className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xl">{name}</p>
                          <p className="text-slate-400">{frequency} {frequency > 1 ? t('medications.timesDaily_plural') : t('medications.timesDaily')}</p>
                        </div>
                      </div>
                      
                      <div className="border-t border-slate-700 pt-4 mt-4">
                        <p className="text-slate-400 text-sm mb-3">{t('medications.form.yourSchedule')}</p>
                        <div className="space-y-2">
                          {times.map((time, index) => (
                            <div key={index} className="flex items-center gap-3 bg-slate-700/50 rounded-xl p-3">
                              <Clock className="w-5 h-5 text-slate-400" />
                              <span className="text-slate-300 font-medium w-24">{t(timeLabels[index])}</span>
                              <span className="text-white font-bold text-lg">{formatTime(time)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(3)}
                        className="w-1/3 h-14 rounded-2xl bg-slate-800 text-slate-300 font-bold"
                      >
                        {t('medications.edit')}
                      </button>
                      <button
                        onClick={handleSave}
                        className="w-2/3 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-2"
                      >
                        <Check className="w-6 h-6" /> {t('medications.save')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!showAdd && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setShowAdd(true)}
              className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-6 h-6" /> {t('medications.addNew')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
