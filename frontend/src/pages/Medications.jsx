import { useState, useEffect } from 'react';
import { Plus, Pill, Check, AlertTriangle, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { addMedication, updateMedication, deleteMedication, getMedications } from '../store/db';

function sanitizeInput(str) {
  return str.replace(/[<>"'&]/g, '');
}

function getAdherenceStats(meds) {
  if (meds.length === 0) return { overall: 0, missedThisWeek: 0, suggestion: '' };

  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  let totalDoses = 0;
  let takenDoses = 0;
  let missedDoses = 0;

  meds.forEach(med => {
    const weekTaken = med.taken.filter(t => last7Days.includes(t.date));
    totalDoses += last7Days.length;
    takenDoses += weekTaken.filter(t => t.taken).length;
    missedDoses += weekTaken.filter(t => !t.taken).length;
  });

  const overall = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  let suggestion = '';
  if (overall < 50) {
    suggestion = 'Your medication adherence is low. Consider setting reminders.';
  } else if (overall < 80) {
    suggestion = 'You\'re making progress! Try to take medications at the same time.';
  } else if (overall >= 95) {
    suggestion = 'Excellent adherence! Keep up the great work.';
  }

  return { overall, missedThisWeek: missedDoses, suggestion };
}

export default function Medications() {
  const [meds, setMeds] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState('');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    const medications = await getMedications();
    setMeds(medications);
  };

  const stats = getAdherenceStats(meds);

  const addMed = async () => {
    if (!name) return;
    await addMedication({
      name: sanitizeInput(name),
      dosage: sanitizeInput(dosage),
      schedule: sanitizeInput(schedule),
      taken: [],
    });
    setName('');
    setDosage('');
    setSchedule('');
    setShowAdd(false);
    loadMedications();
  };

  const toggleTaken = async (med) => {
    const existing = med.taken.find((t) => t.date === today);
    const updated = existing
      ? med.taken.map((t) => t.date === today ? { ...t, taken: !t.taken } : t)
      : [...med.taken, { date: today, taken: true }];
    await updateMedication(med.id, { taken: updated });
    loadMedications();
  };

  const handleDelete = async (id) => {
    await deleteMedication(id);
    loadMedications();
  };

  const adherence = (med) => {
    if (med.taken.length === 0) return 0;
    const taken = med.taken.filter((t) => t.taken).length;
    return Math.round((taken / med.taken.length) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="bg-slate-900 p-5 lg:p-6 border-b border-slate-800">
        <h1 className="text-lg lg:text-xl font-bold text-white">Medications</h1>
        <p className="text-slate-400 text-sm mt-1">Track your daily medications</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto">
        {meds.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-400">Weekly Adherence</p>
                <p className="text-2xl lg:text-3xl font-bold text-white">{stats.overall}%</p>
              </div>
              <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center ${
                stats.overall >= 80 ? 'bg-emerald-500/10' : stats.overall >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'
              }`}>
                {stats.overall >= 80 ? (
                  <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
                ) : stats.overall >= 50 ? (
                  <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-red-500" />
                )}
              </div>
            </div>

            {stats.missedThisWeek > 0 && (
              <div className="bg-red-500/10 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">
                  Missed {stats.missedThisWeek} dose{stats.missedThisWeek > 1 ? 's' : ''} this week
                </p>
              </div>
            )}

            {stats.overall < 80 && stats.missedThisWeek > 0 && (
              <div className="bg-yellow-500/10 rounded-xl p-3 mt-2 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300">{stats.suggestion}</p>
              </div>
            )}

            {stats.overall >= 80 && (
              <div className="bg-emerald-500/10 rounded-xl p-3 mt-2 flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300">{stats.suggestion}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {meds.map((med) => {
            const takenToday = med.taken.find((t) => t.date === today)?.taken;
            const medAdherence = adherence(med);

            return (
              <div key={med.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Pill className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{med.name}</p>
                    <p className="text-xs text-slate-400 truncate">{med.dosage} · {med.schedule}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleTaken(med)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        takenToday ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(med.id)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Adherence</span>
                    <span className={`text-xs font-semibold ${
                      medAdherence >= 80 ? 'text-emerald-400' : medAdherence >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{medAdherence}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        medAdherence >= 80 ? 'bg-emerald-500' : medAdherence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${medAdherence}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showAdd && (
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <input
              type="text"
              placeholder="Medication name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Dosage (e.g. 10mg)"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Schedule (e.g. 8am daily)"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addMed}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
            >
              Add Medication
            </button>
          </div>
        )}

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> {showAdd ? 'Cancel' : 'Add Medication'}
        </button>
      </div>
    </div>
  );
}
