import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateRiskScore } from '../engine/declineEngine';
import { analyzeCorrelations } from '../engine/correlationEngine';

const MAX_ALERTS_PER_DAY = 3;
const ALERT_COOLDOWN_HOURS = 4;

export const useAlertStore = create(
  persist(
    (set, get) => ({
      alerts: [],
      lastCheck: null,
      notificationsEnabled: true,
      alertHistory: [],

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      checkForAlerts: async (patientId = 1) => {
        const state = get();
        if (!state.notificationsEnabled) return [];

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const todayAlerts = state.alerts.filter(a => new Date(a.timestamp) >= todayStart);
        if (todayAlerts.length >= MAX_ALERTS_PER_DAY) {
          return [];
        }

        const recentAlert = state.alerts[0];
        if (recentAlert) {
          const hoursSince = (now - new Date(recentAlert.timestamp)) / (1000 * 60 * 60);
          if (hoursSince < ALERT_COOLDOWN_HOURS) {
            return [];
          }
        }

        const riskData = await calculateRiskScore(patientId);
        const correlations = await analyzeCorrelations(patientId);
        const newAlerts = [];

        riskData.flags.forEach(flag => {
          if (flag.severity === 'severe' || flag.severity === 'moderate') {
            const decline = Math.abs(flag.change);
            
            if (decline >= 10) {
              newAlerts.push({
                id: `${flag.domain}-${Date.now()}`,
                type: 'score_drop',
                severity: flag.severity,
                domain: flag.domain,
                message: `${flag.domain.charAt(0).toUpperCase() + flag.domain.slice(1)} score dropped ${decline}% this week`,
                patientId,
                timestamp: now.toISOString(),
                read: false,
              });
            }
          }
        });

        correlations.correlations.forEach(corr => {
          if (corr.severity === 'high' || corr.severity === 'moderate') {
            if (corr.type === 'speech_decline' || corr.type === 'speech_pace_decline') {
              const speechDecline = corr.observation.match(/increased by (\d+)%/);
              if (speechDecline && parseInt(speechDecline[1]) >= 15) {
                newAlerts.push({
                  id: `speech-${Date.now()}`,
                  type: 'speech_pattern',
                  severity: corr.severity,
                  domain: 'speech',
                  message: 'Speech pattern shows increased hesitation',
                  patientId,
                  timestamp: now.toISOString(),
                  read: false,
                });
              }
            }
          }
        });

        if (riskData.trends?.sessionCounts?.missedCheckIns >= 2) {
          newAlerts.push({
            id: `missed-checkins-${Date.now()}`,
            type: 'missed_checkin',
            severity: 'moderate',
            domain: 'behavior',
            message: `Missed ${riskData.trends.sessionCounts.missedCheckIns} check-ins this week`,
            patientId,
            timestamp: now.toISOString(),
            read: false,
          });
        }

        const limitedAlerts = newAlerts.slice(0, MAX_ALERTS_PER_DAY - todayAlerts.length);

        if (limitedAlerts.length > 0) {
          set(state => ({
            alerts: [...limitedAlerts, ...state.alerts].slice(0, 50),
            alertHistory: [...state.alertHistory, ...limitedAlerts],
            lastCheck: now.toISOString(),
          }));
        }

        return limitedAlerts;
      },

      markAsRead: (alertId) => {
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === alertId ? { ...a, read: true } : a
          ),
        }));
      },

      markAllAsRead: () => {
        set(state => ({
          alerts: state.alerts.map(a => ({ ...a, read: true })),
        }));
      },

      clearAlerts: () => {
        set({ alerts: [] });
      },

      getUnreadCount: () => {
        return get().alerts.filter(a => !a.read).length;
      },

      getAlertsBySeverity: (severity) => {
        return get().alerts.filter(a => a.severity === severity);
      },

      getTodaysAlerts: () => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return get().alerts.filter(a => new Date(a.timestamp) >= todayStart);
      },
    }),
    {
      name: 'nakshatra-alerts',
      partialize: (state) => ({
        alerts: state.alerts.slice(0, 50),
        alertHistory: state.alertHistory.slice(-100),
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);

export async function generateAlertCheck(patientId = 1) {
  const alertStore = useAlertStore.getState();
  return await alertStore.checkForAlerts(patientId);
}

export function formatAlertMessage(alert) {
  switch (alert.type) {
    case 'score_drop':
      return `⚠ ${alert.message}`;
    case 'missed_checkin':
      return `⚠ ${alert.message}`;
    case 'speech_pattern':
      return `⚠ ${alert.message}`;
    default:
      return `⚠ ${alert.message}`;
  }
}

export function getAlertUrgency(alert) {
  if (alert.severity === 'severe') return 'urgent';
  if (alert.severity === 'moderate') return 'warning';
  return 'info';
}
