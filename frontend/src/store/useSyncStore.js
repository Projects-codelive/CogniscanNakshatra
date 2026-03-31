import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RETRY_ATTEMPTS = 3;
const SYNC_INTERVAL = 30000;

export const useSyncStore = create(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncQueue: [],
      isSyncing: false,
      lastSyncAttempt: null,
      lastSuccessfulSync: null,
      failedSyncs: [],
      isOfflineMode: false,

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        if (isOnline) {
          get().processQueue();
        }
      },

      addToQueue: (operation) => {
        const syncItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          operation,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          status: 'pending',
        };

        set(state => ({
          syncQueue: [...state.syncQueue, syncItem],
          isOfflineMode: true,
        }));

        if (get().isOnline) {
          get().processQueue();
        }
      },

      processQueue: async () => {
        const state = get();
        if (!state.isOnline || state.isSyncing || state.syncQueue.length === 0) {
          return;
        }

        set({ isSyncing: true, lastSyncAttempt: new Date().toISOString() });

        const pendingItems = state.syncQueue.filter(item => item.status === 'pending');
        const processedIds = [];

        for (const item of pendingItems) {
          try {
            await syncOperation(item.operation);
            
            processedIds.push(item.id);
            
            set(s => ({
              syncQueue: s.syncQueue.map(q =>
                q.id === item.id ? { ...q, status: 'synced', syncedAt: new Date().toISOString() } : q
              ),
            }));
          } catch (error) {
            const retryCount = item.retryCount + 1;
            
            if (retryCount >= MAX_RETRY_ATTEMPTS) {
              processedIds.push(item.id);
              set(s => ({
                syncQueue: s.syncQueue.map(q =>
                  q.id === item.id ? { ...q, status: 'failed', error: error.message } : q
                ),
                failedSyncs: [...s.failedSyncs, { ...item, error: error.message, failedAt: new Date().toISOString() }],
              }));
            } else {
              set(s => ({
                syncQueue: s.syncQueue.map(q =>
                  q.id === item.id ? { ...q, retryCount } : q
                ),
              }));
            }
          }
        }

        set(s => ({
          syncQueue: s.syncQueue.filter(item => !processedIds.includes(item.id)),
          isSyncing: false,
          lastSuccessfulSync: processedIds.length > 0 ? new Date().toISOString() : s.lastSuccessfulSync,
          isOfflineMode: s.syncQueue.filter(i => i.status === 'pending').length > 0,
        }));
      },

      retryFailed: () => {
        set(state => ({
          syncQueue: state.syncQueue.map(item =>
            item.status === 'failed' ? { ...item, status: 'pending', retryCount: 0 } : item
          ),
          failedSyncs: [],
        }));
        get().processQueue();
      },

      clearFailed: () => {
        set(state => ({
          syncQueue: state.syncQueue.filter(item => item.status !== 'failed'),
          failedSyncs: [],
        }));
      },

      getQueueStats: () => {
        const state = get();
        return {
          pending: state.syncQueue.filter(i => i.status === 'pending').length,
          failed: state.syncQueue.filter(i => i.status === 'failed').length,
          total: state.syncQueue.length,
          isOnline: state.isOnline,
          isSyncing: state.isSyncing,
          lastSync: state.lastSuccessfulSync,
        };
      },
    }),
    {
      name: 'nakshatra-sync',
      partialize: (state) => ({
        syncQueue: state.syncQueue,
        failedSyncs: state.failedSyncs.slice(-20),
        isOfflineMode: state.isOfflineMode,
      }),
    }
  )
);

async function syncOperation(operation) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!navigator.onLine) {
    throw new Error('Network unavailable');
  }
  
  console.log('[Sync] Operation completed:', operation.type);
  return { success: true };
}

export function initSyncListeners() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    useSyncStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useSyncStore.getState().setOnlineStatus(false);
  });

  setInterval(() => {
    useSyncStore.getState().processQueue();
  }, SYNC_INTERVAL);
}

export function queueOperation(type, data) {
  useSyncStore.getState().addToQueue({ type, data });
}
