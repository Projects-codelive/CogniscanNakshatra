import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCaregiverStore = create(
  persist(
    (set, get) => ({
      caregiver: null,
      isAuthenticated: false,
      linkedPatients: [],
      
      setCaregiver: (caregiver) => set({ 
        caregiver, 
        isAuthenticated: !!caregiver,
        linkedPatients: caregiver?.linkedPatients || []
      }),
      
      logout: () => set({ 
        caregiver: null, 
        isAuthenticated: false,
        linkedPatients: []
      }),
      
      addLinkedPatient: (patientCode, patientName) => {
        const { linkedPatients } = get();
        if (!linkedPatients.find(p => p.code === patientCode)) {
          set({
            linkedPatients: [...linkedPatients, { 
              code: patientCode, 
              name: patientName,
              linkedAt: new Date().toISOString()
            }]
          });
        }
      },
      
      removeLinkedPatient: (patientCode) => {
        const { linkedPatients } = get();
        set({
          linkedPatients: linkedPatients.filter(p => p.code !== patientCode)
        });
      },
      
      updateLinkedPatient: (patientCode, data) => {
        const { linkedPatients } = get();
        set({
          linkedPatients: linkedPatients.map(p => 
            p.code === patientCode ? { ...p, ...data } : p
          )
        });
      },
    }),
    {
      name: 'nakshatra-caregiver',
    }
  )
);

export default useCaregiverStore;
