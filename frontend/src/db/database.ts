import Dexie from 'dexie';

export interface Patient {
  id?: number;
  userId: string;
  name: string;
  dateOfBirth: string;
  caregiverId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CogniScore {
  id?: number;
  patientId: string;
  score: number;
  breakdown: {
    cognitiveTests: number;
    speechMetrics: number;
    checkIn: number;
    medicationAdherence: number;
  };
  timestamp: string;
}

export interface CheckIn {
  id?: number;
  patientId: string;
  mood: number;
  sleep: number;
  sleepHours?: number;
  symptoms: string[];
  energy: number;
  activity: 'none' | 'light' | 'moderate' | 'active';
  notes?: string;
  wellbeingScore: number;
  timestamp: string;
}

export interface TestResult {
  id?: number;
  patientId: string;
  testType: 'clock_drawing' | 'word_recall' | 'trail_making' | 'stroop' | 'reaction_time';
  score: number;
  breakdown: Record<string, number>;
  rawData: Record<string, unknown>;
  duration: number;
  completedAt: string;
}

export interface SpeechSession {
  id?: number;
  patientId: string;
  score: number;
  metrics: {
    totalPauses: number;
    pausePercentage: number;
    fillerCount: number;
    fillerPercentage: number;
    speechRate: number;
    articulationRate: number;
    totalDuration: number;
    totalWords: number;
    fluencyScore: number;
  };
  transcript?: string;
  riskFlags: string[];
  timestamp: string;
}

export interface FacialSession {
  id?: number;
  patientId: string;
  score: number;
  questionsAnswered: number;
  questionsSkipped: number;
  questionResults: Array<{
    questionIndex: number;
    answered: boolean;
    skipped: boolean;
    timeout: boolean;
    transcript?: string;
    perQuestionScore?: number;
    responseLatency?: number;
    confidenceRatio?: number;
    fillerCount?: number;
    congruenceStatus?: string;
    dominantEmotion?: string;
    expressionJourney?: Array<{
      emotion: string;
      attention: number;
    }>;
  }>;
  domainScores: {
    memoryRecallIndex?: number;
    orientationAccuracy?: number;
    workingMemoryTolerance?: number;
    emotionalProcessingHealth?: number;
    attentionConsistency?: number;
  };
  facialBehavior: {
    totalFramesAnalyzed: number;
    emotionDistribution: Record<string, { percentage: number; seconds: number }>;
    gazePatternSummary: Record<string, number>;
  };
  riskFlags: Array<{
    name: string;
    severity: string;
    explanation: string;
    recommendation: string;
  }>;
  timestamp: string;
}

export interface Medication {
  id?: number;
  patientId: string;
  name: string;
  dosage: string;
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'as_needed';
  times: string[];
  startDate: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MedicationLog {
  id?: number;
  medicationId: number;
  patientId: string;
  scheduledTime: string;
  takenAt?: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  timestamp: string;
}

export interface Insight {
  id?: number;
  patientId: string;
  source: 'ai' | 'rules_engine';
  type: 'observation' | 'recommendation' | 'alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  recommendation?: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id?: number;
  tableName: string;
  recordId: number;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
  synced: boolean;
  syncedAt?: string;
}

export interface ActivityItem {
  id?: number;
  patientId: string;
  type: 'test_completed' | 'checkin_completed' | 'speech_session' | 'medication_taken' | 'medication_missed';
  description: string;
  score?: number;
  metadata: Record<string, unknown>;
  timestamp: string;
}

class NakshatraDB extends Dexie {
  patients!: Dexie.Table<Patient, number>;
  cogniScores!: Dexie.Table<CogniScore, number>;
  checkIns!: Dexie.Table<CheckIn, number>;
  testResults!: Dexie.Table<TestResult, number>;
  speechSessions!: Dexie.Table<SpeechSession, number>;
  facialSessions!: Dexie.Table<FacialSession, number>;
  medications!: Dexie.Table<Medication, number>;
  medicationLogs!: Dexie.Table<MedicationLog, number>;
  insights!: Dexie.Table<Insight, number>;
  syncQueue!: Dexie.Table<SyncQueueItem, number>;
  activities!: Dexie.Table<ActivityItem, number>;

  constructor() {
    super('NakshatraDB');
    
    this.version(1).stores({
      patients: '++id, userId, caregiverId',
      cogniScores: '++id, patientId, timestamp',
      checkIns: '++id, patientId, timestamp',
      testResults: '++id, patientId, testType, completedAt',
      speechSessions: '++id, patientId, timestamp',
      facialSessions: '++id, patientId, timestamp',
      medications: '++id, patientId, isActive',
      medicationLogs: '++id, medicationId, patientId, scheduledTime, status',
      insights: '++id, patientId, source, createdAt',
      syncQueue: '++id, tableName, recordId, synced, timestamp',
      activities: '++id, patientId, type, timestamp',
    });
  }
}

export const db = new NakshatraDB();

export const addToSyncQueue = async (
  tableName: string,
  recordId: number,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>
) => {
  await db.syncQueue.add({
    tableName,
    recordId,
    operation,
    data,
    timestamp: new Date().toISOString(),
    synced: false,
  });
};

export const repository = {
  patients: {
    async add(patient: Omit<Patient, 'id'>) {
      const id = await db.patients.add(patient as Patient);
      await addToSyncQueue('patients', id, 'create', patient as Record<string, unknown>);
      return id;
    },
    async getByUserId(userId: string) {
      return await db.patients.where('userId').equals(userId).first();
    },
    async update(id: number, changes: Partial<Patient>) {
      await db.patients.update(id, changes);
      await addToSyncQueue('patients', id, 'update', changes as Record<string, unknown>);
    },
  },

  cogniScores: {
    async add(score: Omit<CogniScore, 'id'>) {
      const id = await db.cogniScores.add(score as CogniScore);
      await addToSyncQueue('cogniScores', id, 'create', score as Record<string, unknown>);
      return id;
    },
    async getByPatientId(patientId: string, limit = 30) {
      return await db.cogniScores
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(limit)
        .toArray();
    },
    async getLatest(patientId: string) {
      return await db.cogniScores
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(1)
        .first();
    },
  },

  checkIns: {
    async add(checkIn: Omit<CheckIn, 'id'>) {
      const id = await db.checkIns.add(checkIn as CheckIn);
      await addToSyncQueue('checkIns', id, 'create', checkIn as Record<string, unknown>);
      return id;
    },
    async getByPatientId(patientId: string, limit = 30) {
      return await db.checkIns
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(limit)
        .toArray();
    },
    async getByDateRange(patientId: string, startDate: string, endDate: string) {
      return await db.checkIns
        .where('patientId')
        .equals(patientId)
        .filter((item) => item.timestamp >= startDate && item.timestamp <= endDate)
        .toArray();
    },
    async getToday(patientId: string) {
      const today = new Date().toISOString().split('T')[0];
      return await db.checkIns
        .where('patientId')
        .equals(patientId)
        .filter((item) => item.timestamp.split('T')[0] === today)
        .first();
    },
  },

  testResults: {
    async add(result: Omit<TestResult, 'id'>) {
      const id = await db.testResults.add(result as TestResult);
      await addToSyncQueue('testResults', id, 'create', result as Record<string, unknown>);
      return id;
    },
    async getByPatientId(patientId: string, limit = 50) {
      return await db.testResults
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(limit)
        .toArray();
    },
    async getByTestType(patientId: string, testType: TestResult['testType']) {
      return await db.testResults
        .where('patientId')
        .equals(patientId)
        .filter((item) => item.testType === testType)
        .reverse()
        .toArray();
    },
    async getRecentByType(patientId: string, testType: TestResult['testType'], limit = 5) {
      return await db.testResults
        .where('patientId')
        .equals(patientId)
        .filter((item) => item.testType === testType)
        .reverse()
        .limit(limit)
        .toArray();
    },
    async getThisWeek(patientId: string) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return await db.testResults
        .where('patientId')
        .equals(patientId)
        .filter((item) => new Date(item.completedAt) >= weekAgo)
        .toArray();
    },
  },

  medications: {
    async add(medication: Omit<Medication, 'id'>) {
      const id = await db.medications.add(medication as Medication);
      await addToSyncQueue('medications', id, 'create', medication as Record<string, unknown>);
      return id;
    },
    async getByPatientId(patientId: string) {
      return await db.medications
        .where('patientId')
        .equals(patientId)
        .filter((item) => item.isActive)
        .toArray();
    },
    async update(id: number, changes: Partial<Medication>) {
      await db.medications.update(id, changes);
      await addToSyncQueue('medications', id, 'update', changes as Record<string, unknown>);
    },
    async delete(id: number) {
      await db.medications.update(id, { isActive: false });
      await addToSyncQueue('medications', id, 'update', { isActive: false } as Record<string, unknown>);
    },
  },

  medicationLogs: {
    async add(log: Omit<MedicationLog, 'id'>) {
      const id = await db.medicationLogs.add(log as MedicationLog);
      await addToSyncQueue('medicationLogs', id, 'create', log as Record<string, unknown>);
      return id;
    },
    async getByMedicationId(medicationId: number, limit = 30) {
      return await db.medicationLogs
        .where('medicationId')
        .equals(medicationId)
        .reverse()
        .limit(limit)
        .toArray();
    },
    async getTodayLogs(patientId: string) {
      const today = new Date().toISOString().split('T')[0];
      return await db.medicationLogs
        .where('patientId')
        .equals(patientId)
        .filter((item) => item.scheduledTime.split('T')[0] === today)
        .toArray();
    },
    async getThisWeek(patientId: string) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return await db.medicationLogs
        .where('patientId')
        .equals(patientId)
        .filter((item) => new Date(item.scheduledTime) >= weekAgo)
        .toArray();
    },
    async update(id: number, changes: Partial<MedicationLog>) {
      await db.medicationLogs.update(id, changes);
      await addToSyncQueue('medicationLogs', id, 'update', changes as Record<string, unknown>);
    },
  },

  activities: {
    async add(activity: Omit<ActivityItem, 'id'>) {
      const id = await db.activities.add(activity as ActivityItem);
      return id;
    },
    async getByPatientId(patientId: string, limit = 20) {
      return await db.activities
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(limit)
        .toArray();
    },
  },

  insights: {
    async add(insight: Omit<Insight, 'id'>) {
      const id = await db.insights.add(insight as Insight);
      await addToSyncQueue('insights', id, 'create', insight as Record<string, unknown>);
      return id;
    },
    async getByPatientId(patientId: string, limit = 20) {
      return await db.insights
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(limit)
        .toArray();
    },
    async getRecent(patientId: string) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return await db.insights
        .where('patientId')
        .equals(patientId)
        .filter((item) => new Date(item.createdAt) >= weekAgo)
        .toArray();
    },
  },

  speechSessions: {
    async add(session: Omit<SpeechSession, 'id'>) {
      const id = await db.speechSessions.add(session as SpeechSession);
      await addToSyncQueue('speechSessions', id, 'create', session as Record<string, unknown>);
      return id;
    },
    async getByPatientId(patientId: string, limit = 30) {
      return await db.speechSessions
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(limit)
        .toArray();
    },
    async getThisWeek(patientId: string) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return await db.speechSessions
        .where('patientId')
        .equals(patientId)
        .filter((item) => new Date(item.timestamp) >= weekAgo)
        .toArray();
    },
  },

  facialSessions: {
    async add(session: Omit<FacialSession, 'id'>) {
      const id = await db.facialSessions.add(session as FacialSession);
      await addToSyncQueue('facialSessions', id, 'create', session as Record<string, unknown>);
      return id;
    },
    async getByPatientId(patientId: string, limit = 30) {
      return await db.facialSessions
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(limit)
        .toArray();
    },
    async getThisWeek(patientId: string) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return await db.facialSessions
        .where('patientId')
        .equals(patientId)
        .filter((item) => new Date(item.timestamp) >= weekAgo)
        .toArray();
    },
  },

  syncQueue: {
    async getPending() {
      return await db.syncQueue.where('synced').equals(0).toArray();
    },
    async markSynced(id: number) {
      await db.syncQueue.update(id, {
        synced: true,
        syncedAt: new Date().toISOString(),
      });
    },
    async clearSynced() {
      await db.syncQueue.where('synced').equals(1).delete();
    },
  },
};

export default db;
