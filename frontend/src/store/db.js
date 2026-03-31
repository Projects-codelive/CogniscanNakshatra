import Dexie from 'dexie';
import { queueOperation } from './useSyncStore';

export const db = new Dexie('NakshatraDB');

db.version(1).stores({
  checkIns: '++id, date, patientId',
  testResults: '++id, date, type, patientId, completedAt',
  medications: '++id, name, patientId',
});

db.version(2).stores({
  checkIns: '++id, date, patientId',
  testResults: '++id, date, type, patientId, completedAt',
  medications: '++id, name, patientId',
  speechSessions: '++id, patientId, createdAt',
});

db.version(3).stores({
  checkIns: '++id, date, patientId',
  testResults: '++id, date, type, patientId, completedAt',
  medications: '++id, name, patientId',
  speechSessions: '++id, patientId, createdAt',
  facialSessions: '++id, patientId, createdAt',
  syncQueue: '++id, type, timestamp, status',
});

export const addCheckIn = async (checkIn) => {
  const data = {
    ...checkIn,
    patientId: checkIn.patientId || 1,
    date: checkIn.date || new Date().toISOString(),
    synced: false,
  };
  
  const id = await db.checkIns.add(data);
  
  queueOperation('checkIn', { ...data, id });
  
  return id;
};

export const getCheckIns = async (limit = 30) => {
  return await db.checkIns.orderBy('date').reverse().limit(limit).toArray();
};

export const addTestResult = async (result) => {
  const data = {
    ...result,
    patientId: result.patientId || 1,
    completedAt: result.completedAt || new Date().toISOString(),
    date: result.date || new Date().toISOString().split('T')[0],
    synced: false,
  };
  
  const id = await db.testResults.add(data);
  
  queueOperation('testResult', { ...data, id });
  
  return id;
};

export const getTestResults = async (limit = 50) => {
  return await db.testResults.orderBy('completedAt').reverse().limit(limit).toArray();
};

export const getTestResultsByType = async (type) => {
  return await db.testResults.where('type').equals(type).reverse().toArray();
};

export const addMedication = async (medication) => {
  const data = {
    ...medication,
    patientId: medication.patientId || 1,
    synced: false,
  };
  
  const id = await db.medications.add(data);
  
  queueOperation('medication', { ...data, id });
  
  return id;
};

export const updateMedication = async (id, changes) => {
  const data = { ...changes, synced: false, updatedAt: new Date().toISOString() };
  
  await db.medications.update(id, data);
  
  queueOperation('medicationUpdate', { id, ...data });
};

export const deleteMedication = async (id) => {
  await db.medications.delete(id);
  
  queueOperation('medicationDelete', { id });
};

export const getMedications = async () => {
  return await db.medications.toArray();
};

export const addSpeechSession = async (session) => {
  const data = {
    ...session,
    patientId: session.patientId || 1,
    createdAt: session.createdAt || new Date().toISOString(),
    synced: false,
  };
  
  const id = await db.speechSessions.add(data);
  
  queueOperation('speechSession', { ...data, id });
  
  return id;
};

export const getSpeechSessions = async (limit = 30) => {
  return await db.speechSessions.orderBy('createdAt').reverse().limit(limit).toArray();
};

export const getLastSpeechSession = async () => {
  const sessions = await db.speechSessions.orderBy('createdAt').reverse().limit(1).toArray();
  return sessions.length > 0 ? sessions[0] : null;
};

export const addFacialSession = async (session) => {
  const data = {
    ...session,
    patientId: session.patientId || 1,
    createdAt: session.createdAt || new Date().toISOString(),
    synced: false,
  };
  
  const id = await db.facialSessions.add(data);
  
  queueOperation('facialSession', { ...data, id });
  
  return id;
};

export const getFacialSessions = async (limit = 30) => {
  return await db.facialSessions.orderBy('createdAt').reverse().limit(limit).toArray();
};

export const getLastFacialSession = async () => {
  const sessions = await db.facialSessions.orderBy('createdAt').reverse().limit(1).toArray();
  return sessions.length > 0 ? sessions[0] : null;
};

export const getRecentActivity = async (days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [checkIns, tests, speech, facial] = await Promise.all([
    db.checkIns.where('date').above(sinceStr).toArray(),
    db.testResults.where('completedAt').above(sinceStr).toArray(),
    db.speechSessions.where('createdAt').above(sinceStr).toArray(),
    db.facialSessions.where('createdAt').above(sinceStr).toArray(),
  ]);

  return {
    checkIns,
    testResults: tests,
    speechSessions: speech,
    facialSessions: facial,
    total: checkIns.length + tests.length + speech.length + facial.length,
  };
};

export const getDataStats = async () => {
  const [checkIns, tests, speech, facial, medications] = await Promise.all([
    db.checkIns.count(),
    db.testResults.count(),
    db.speechSessions.count(),
    db.facialSessions.count(),
    db.medications.count(),
  ]);

  return {
    checkIns,
    tests,
    speechSessions: speech,
    facialSessions: facial,
    medications,
    total: checkIns + tests + speech + facial + medications,
  };
};
