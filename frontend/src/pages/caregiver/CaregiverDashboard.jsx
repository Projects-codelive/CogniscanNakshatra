import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useCaregiverStore from '../../store/useCaregiverStore';
import { 
  ShieldCheck, 
  Bell,
  BellOff,
  User,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Brain,
  Mic,
  FileText,
  Download,
  Plus,
  X,
  Loader2,
  Users,
  LogOut,
  Settings,
  Fingerprint,
  Trash2,
  Globe
} from 'lucide-react';

const getScoreColor = (score) => {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

const getScoreStatus = (score, t) => {
  if (score >= 70) return { label: t('caregiver.stable', 'Stable'), color: 'bg-emerald-500', textColor: 'text-emerald-400' };
  if (score >= 50) return { label: t('caregiver.monitor', 'Monitor'), color: 'bg-yellow-500', textColor: 'text-yellow-400' };
  return { label: t('caregiver.urgent', 'Urgent'), color: 'bg-red-500', textColor: 'text-red-400' };
};

const getTrendIcon = (trend) => {
  if (trend > 5) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend < -5) return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
};

export default function CaregiverDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { caregiver, logout, linkedPatients, addLinkedPatient, removeLinkedPatient } = useCaregiverStore();
  
  const [activeTab, setActiveTab] = useState('patients');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [patientCode, setPatientCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const loadPatientData = (patient) => {
    const storedUser = localStorage.getItem(`nakshatra-user-${patient.code}`);
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        return {
          name: userData.name || t('caregiver.patient'),
          email: userData.email,
          cogniScore: userData.cogniScore || 72,
          trend: userData.cogniTrend || 0,
          lastCheckin: userData.lastCheckin || null,
          weeklyData: userData.weeklyData || [65, 68, 70, 72, 70, 73, 72],
          testsCompleted: userData.testsCompleted || 0,
          checkinsCompleted: userData.checkinsCompleted || 0,
          medicationAdherence: userData.medicationAdherence || 0,
          alerts: userData.alerts || [],
          aiInsight: userData.aiInsight || t('caregiver.patientMaintainingActivity', 'Patient is maintaining regular activity levels.'),
          speechScore: userData.speechScore || 78,
          memoryScore: userData.memoryScore || 70,
          attentionScore: userData.attentionScore || 75,
        };
      } catch (e) {
        console.error('Error parsing patient data:', e);
      }
    }
    return null;
  };

  const selectedPatientData = selectedPatient ? loadPatientData(selectedPatient) : null;

  useEffect(() => {
    if (linkedPatients.length > 0 && !selectedPatient) {
      setSelectedPatient(linkedPatients[0]);
    }
  }, [linkedPatients, selectedPatient]);

  useEffect(() => {
    if (selectedPatientData?.alerts?.length > 0) {
      setNotifications(selectedPatientData.alerts);
    }
  }, [selectedPatient]);

  const handleAddPatient = async () => {
    setError('');
    if (!patientCode.trim() || patientCode.length !== 8) {
      setError(t('caregiver.enterValidCode'));
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    const code = patientCode.trim().toUpperCase();
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('nakshatra-user-'));
    let foundPatient = null;

    for (const key of allKeys) {
      const userData = JSON.parse(localStorage.getItem(key));
      if (userData.shareCode === code) {
        foundPatient = {
          email: key.replace('nakshatra-user-', ''),
          name: userData.name || t('caregiver.patient'),
          shareCode: code,
        };
        break;
      }
    }

    if (!foundPatient) {
      setError(t('caregiver.invalidCode'));
      setIsLoading(false);
      return;
    }

    if (linkedPatients.find(p => p.code === code)) {
      setError(t('caregiver.alreadyLinked'));
      setIsLoading(false);
      return;
    }

    addLinkedPatient(code, foundPatient.name);
    setPatientCode('');
    setShowAddModal(false);
    setIsLoading(false);
  };

  const handleRemovePatient = (code) => {
    removeLinkedPatient(code);
    if (selectedPatient?.code === code) {
      setSelectedPatient(linkedPatients.length > 1 ? linkedPatients.find(p => p.code !== code) : null);
    }
  };

  const handleExportReport = () => {
    if (!selectedPatientData) return;
    
    const report = `
Nakshatra Weekly Report
Patient: ${selectedPatientData.name}
Generated: ${new Date().toLocaleDateString()}

COGNITIVE SCORE: ${selectedPatientData.cogniScore}
Status: ${getScoreStatus(selectedPatientData.cogniScore).label}

WEEKLY SUMMARY
- Tests Completed: ${selectedPatientData.testsCompleted}
- Check-ins: ${selectedPatientData.checkinsCompleted}/7
- Medication Adherence: ${selectedPatientData.medicationAdherence}%

AI INSIGHT
${selectedPatientData.aiInsight}

${notifications.length > 0 ? 'ALERTS\n' + notifications.map(n => `- ${n}`).join('\n') : 'No significant alerts this week.'}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nakshatra-report-${selectedPatientData.name.replace(' ', '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const unreadCount = notifications.length;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">{t('caregiver.headerTitle')}</h1>
                <p className="text-slate-500 text-xs">{caregiver?.name || t('caregiver.headerTitle')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {notificationsEnabled ? (
                  <Bell className="w-5 h-5 text-slate-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-500" />
                )}
                {unreadCount > 0 && notificationsEnabled && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'patients' ? 'profile' : 'patients')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'profile' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {showNotifications && notificationsEnabled && (
          <div className="absolute right-4 top-16 w-80 bg-slate-900 rounded-xl border border-slate-700 shadow-xl z-50">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-white">{t('caregiver.notifications')}</h3>
              <button onClick={() => setNotificationsEnabled(false)} className="text-xs text-slate-500 hover:text-white">
                {t('caregiver.disable')}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif, i) => (
                  <div key={i} className="p-3 border-b border-slate-800 last:border-0 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300">{notif}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">{t('caregiver.noConcernsDetected')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {activeTab === 'patients' ? (
          <>
            {linkedPatients.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{t('caregiver.noPatientsLinked')}</h2>
                <p className="text-slate-400 mb-6">{t('caregiver.askForShareCode')}</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  {t('caregiver.linkPatient')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <select
                    value={selectedPatient?.code || ''}
                    onChange={(e) => {
                      const patient = linkedPatients.find(p => p.code === e.target.value);
                      setSelectedPatient(patient);
                    }}
                    className="flex-1 h-12 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {linkedPatients.map(patient => (
                      <option key={patient.code} value={patient.code}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="h-12 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {selectedPatientData && (
                  <div className="space-y-4">
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                            <span className="text-2xl font-bold text-emerald-400">
                              {selectedPatientData.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white">{selectedPatientData.name}</h2>
                            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${getScoreStatus(selectedPatientData.cogniScore, t).textColor}`}>
                              <span className={`w-2 h-2 rounded-full ${getScoreStatus(selectedPatientData.cogniScore, t).color}`} />
                              {getScoreStatus(selectedPatientData.cogniScore, t).label}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemovePatient(selectedPatient.code)}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className={`text-5xl font-bold ${getScoreColor(selectedPatientData.cogniScore)}`}>
                            {selectedPatientData.cogniScore}
                          </p>
                          <p className="text-slate-500 text-sm mt-1">{t('caregiver.cogniScoreLabel')}</p>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTrendIcon(selectedPatientData.trend)}
                            <span className={`text-sm font-medium ${
                              selectedPatientData.trend > 0 ? 'text-emerald-400' : selectedPatientData.trend < 0 ? 'text-red-400' : 'text-slate-400'
                            }`}>
                              {selectedPatientData.trend > 0 ? '+' : ''}{selectedPatientData.trend}% {t('caregiver.thisWeek')}
                            </span>
                          </div>
                          <div className="flex items-end gap-1 h-12">
                            {selectedPatientData.weeklyData.map((score, i) => (
                              <div key={i} className="flex-1 bg-slate-700 rounded-t" style={{ height: `${score * 0.6}%` }} />
                            ))}
                          </div>
                          <p className="text-slate-500 text-xs mt-2">{t('caregiver.sevenDayTrend')}</p>
                        </div>
                      </div>
                    </div>

                    {notifications.length > 0 && (
                      <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                        <h3 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          {t('caregiver.alerts')}
                        </h3>
                        <div className="space-y-2">
                          {notifications.map((alert, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-yellow-400">•</span>
                              <span className="text-slate-300">{alert}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {notifications.length === 0 && (
                      <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">{t('caregiver.noConcernsDetected')}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-center">
                        <Brain className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{selectedPatientData.testsCompleted}</p>
                        <p className="text-xs text-slate-500">{t('caregiver.tests')}</p>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-center">
                        <Calendar className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{selectedPatientData.checkinsCompleted}/7</p>
                        <p className="text-xs text-slate-500">{t('caregiver.checkins')}</p>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-center">
                        <Activity className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{selectedPatientData.medicationAdherence}%</p>
                        <p className="text-xs text-slate-500">{t('caregiver.adherence')}</p>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                      <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Mic className="w-5 h-5 text-blue-400" />
                        {t('caregiver.aiInsight')}
                      </h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {selectedPatientData.aiInsight}
                      </p>
                    </div>

                    <button
                      onClick={() => setExpandedSection(expandedSection === 'details' ? null : 'details')}
                      className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="font-medium text-white">{t('caregiver.viewDetails')}</span>
                      {expandedSection === 'details' ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    {expandedSection === 'details' && (
                      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-slate-400 mb-2">{t('caregiver.cognitiveBreakdown')}</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">{t('caregiver.memory')}</span>
                              <span className="font-semibold text-white">{selectedPatientData.memoryScore}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">{t('caregiver.attention')}</span>
                              <span className="font-semibold text-white">{selectedPatientData.attentionScore}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">{t('caregiver.speech')}</span>
                              <span className="font-semibold text-white">{selectedPatientData.speechScore}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleExportReport}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      {t('caregiver.exportWeeklyReport')}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
              <h3 className="font-semibold text-white mb-4">{t('caregiver.account')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">{t('caregiver.name')}</span>
                  <span className="text-white font-medium">{caregiver?.name}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">{t('caregiver.email')}</span>
                  <span className="text-white font-medium">{caregiver?.email}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
              <h3 className="font-semibold text-white mb-4">{t('caregiver.linkedPatients')} ({linkedPatients.length})</h3>
                  {linkedPatients.length > 0 ? (
                    <div className="space-y-2">
                      {linkedPatients.map(patient => (
                        <div key={patient.code} className="flex items-center justify-between py-2">
                          <span className="text-white">{patient.name}</span>
                          <button
                            onClick={() => handleRemovePatient(patient.code)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            {t('caregiver.remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">{t('caregiver.noPatientsLinkedYet')}</p>
                  )}
            </div>

            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
              <h3 className="font-semibold text-white mb-4">{t('caregiver.notifications')}</h3>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-between px-4 ${
                  notificationsEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <span>{notificationsEnabled ? t('caregiver.notificationsOn') : t('caregiver.notificationsOff')}</span>
                <span className={`w-3 h-3 rounded-full ${notificationsEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </button>
            </div>

            <button
              onClick={() => { logout(); navigate('/caregiver/login'); }}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              {t('caregiver.signOut')}
            </button>
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{t('caregiver.linkPatient')}</h2>
              <button onClick={() => { setShowAddModal(false); setPatientCode(''); setError(''); }} className="p-2 rounded-lg bg-slate-800">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-4">{t('caregiver.enterPatientCode')}</p>

            <input
              type="text"
              placeholder={t('caregiver.patientCodePlaceholder')}
              value={patientCode}
              onChange={(e) => setPatientCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="w-full h-14 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder:text-slate-600 placeholder:tracking-normal focus:outline-none focus:border-emerald-500 mb-4"
            />

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              onClick={handleAddPatient}
              disabled={isLoading || patientCode.length !== 8}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('caregiver.linkPatient')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
