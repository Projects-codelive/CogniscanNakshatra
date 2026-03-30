import Dexie from 'dexie';

export const db = new Dexie('NakshatraDB');

db.version(1).stores({
  checkIns: '++id, date',
  testResults: '++id, date, type',
  medications: '++id, name',
});

db.version(2).stores({
  checkIns: '++id, date',
  testResults: '++id, date, type',
  medications: '++id, name',
  speechSessions: '++id, patientId, timestamp',
});

export const addCheckIn = async (checkIn) => {
  return await db.checkIns.add(checkIn);
};

export const getCheckIns = async (limit = 7) => {
  return await db.checkIns.orderBy('date').reverse().limit(limit).toArray();
};

export const addTestResult = async (result) => {
  return await db.testResults.add(result);
};

export const getTestResults = async (limit = 10) => {
  return await db.testResults.orderBy('date').reverse().limit(limit).toArray();
};

export const getTestResultsByType = async (type) => {
  return await db.testResults.where('type').equals(type).reverse().toArray();
};

export const addMedication = async (medication) => {
  return await db.medications.add(medication);
};

export const updateMedication = async (id, changes) => {
  return await db.medications.update(id, changes);
};

export const deleteMedication = async (id) => {
  return await db.medications.delete(id);
};

export const getMedications = async () => {
  return await db.medications.toArray();
};

export const addSpeechSession = async (session) => {
  return await db.speechSessions.add(session);
};

export const getSpeechSessions = async (limit = 10) => {
  return await db.speechSessions.orderBy('timestamp').reverse().limit(limit).toArray();
};

export const getLastSpeechSession = async () => {
  const sessions = await db.speechSessions.orderBy('timestamp').reverse().limit(1).toArray();
  return sessions.length > 0 ? sessions[0] : null;
};
