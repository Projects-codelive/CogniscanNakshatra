# Nakshatra - Cognitive Health Monitoring Platform

> A cognitive health assessment platform designed for patients to track their brain health and for caregivers to monitor their loved ones.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## Table of Contents

- [About](#about)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Features](#features)
  - [Patient Portal](#patient-portal)
  - [Caregiver Portal](#caregiver-portal)
- [Technology Stack](#technology-stack)
- [Authentication](#authentication)
- [Data Storage](#data-storage)
- [Internationalization](#internationalization)
- [Browser Support](#browser-support)

---

## About

**Nakshatra** (Sanskrit for "Star") is a cognitive health monitoring platform that helps individuals track their cognitive wellness through various assessments and allows caregivers to remotely monitor their loved ones' health status.

### Key Goals

- Provide accessible cognitive assessments for early detection of changes
- Enable caregivers to monitor patients' wellness remotely
- Offer a simple, intuitive interface for all age groups
- Support multiple languages (English, Hindi, Marathi)

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd CogniscanNakshatra

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
cd frontend
npm run build
```

Preview production build:
```bash
npm run preview
```

---

## Project Structure

```
CogniscanNakshatra/
├── frontend/
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   │   ├── caregiver/           # Caregiver portal pages
│   │   │   │   ├── CaregiverLogin.jsx
│   │   │   │   ├── CaregiverSignup.jsx
│   │   │   │   └── CaregiverDashboard.jsx
│   │   │   ├── tests/                # Cognitive test components
│   │   │   │   ├── ClockDrawingTest.jsx
│   │   │   │   ├── WordRecallTest.jsx
│   │   │   │   ├── TrailMakingTest.jsx
│   │   │   │   ├── StroopTest.jsx
│   │   │   │   └── ReactionTimeTest.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── SignUp.jsx
│   │   │   ├── CheckIn.jsx
│   │   │   ├── Medications.jsx
│   │   │   ├── Insights.jsx
│   │   │   ├── SpeechSession.jsx
│   │   │   └── FacialSession.jsx
│   │   ├── components/               # Reusable components
│   │   │   ├── gauge/              # Score visualization
│   │   │   ├── BottomNav.jsx      # Mobile navigation
│   │   │   ├── Sidebar.jsx        # Desktop sidebar
│   │   │   └── Layout.jsx         # Main layout wrapper
│   │   ├── store/                  # State management (Zustand)
│   │   │   ├── useAuthStore.js     # Patient auth state
│   │   │   ├── useCaregiverStore.js # Caregiver auth state
│   │   │   ├── useAppStore.js     # App-wide state
│   │   │   └── db.js              # IndexedDB (Dexie)
│   │   ├── utils/                  # Utility functions
│   │   │   └── passkey.js         # WebAuthn utilities
│   │   ├── engine/                 # Business logic
│   │   │   └── cogniScore.js      # Score calculation
│   │   ├── i18n/                   # Internationalization
│   │   │   ├── index.js
│   │   │   └── locales/
│   │   │       ├── en.json         # English
│   │   │       ├── hi.json         # Hindi
│   │   │       └── mr.json         # Marathi
│   │   ├── App.jsx                 # Main app with routing
│   │   └── main.jsx               # Entry point
│   └── package.json
├── backend/                          # Backend (FastAPI - future)
│   └── package.json
└── README.md
```

---

## Features

### Patient Portal

The patient portal is a comprehensive cognitive health tracking application.

#### Authentication
- **Email/Password Login** - Traditional login with email and password
- **Passkey Login** - WebAuthn-based biometric authentication (Face ID, Touch ID, PIN)
- **Sign Up** - Create account with name, email, and password

#### Dashboard
- **CogniScore Gauge** - Visual representation of overall cognitive health (0-100)
- **Weekly Overview** - 7-day activity summary
- **Quick Actions** - Fast access to check-ins, speech, facial analysis, and tests
- **Recent Activity** - Timeline of recent assessments
- **Greeting** - Personalized based on time of day

#### Cognitive Tests
Five scientifically-designed cognitive assessments:

| Test | Category | Description |
|------|----------|-------------|
| **Clock Drawing** | Visuospatial | Draw a clock showing specific time |
| **Word Recall** | Memory | Memorize and recall word lists |
| **Trail Making** | Executive | Connect numbered circles in sequence |
| **Stroop Test** | Attention | Identify ink colors while reading words |
| **Reaction Time** | Processing | Tap when visual stimulus appears |

#### Assessments
- **Speech Analysis** - Voice recording with AI-powered cognitive markers analysis
- **Facial Analysis** - Camera-based expression tracking with emotional congruence detection
- **Daily Check-in** - Mood, sleep quality, and energy level tracking

#### Health Management
- **Medications** - Track medication schedules and adherence
- **Insights** - Detailed trends and patterns in cognitive health
- **Data Export** - Download all personal health data as JSON

#### Profile & Settings
- **Edit Profile** - Change name, email, and password
- **Passkey Management** - Add, change, or remove passkey authentication
- **Accessibility** - Large text mode toggle
- **Language** - Switch between English, Hindi, and Marathi
- **Share Code** - Generate unique code for caregiver linking

---

### Caregiver Portal

A simplified, alert-driven monitoring system for caregivers.

#### Authentication
- Separate login/signup for caregivers
- Independent from patient accounts
- Email/password authentication

#### Dashboard (Core Monitoring)
- **Patient Switcher** - Quick dropdown to switch between linked patients
- **Cognitive Status Card**
  - Large CogniScore display
  - Status badge (Stable/Monitor/Urgent)
  - Weekly trend indicator
  - 7-day mini chart
- **Alerts Section** - Critical notifications only
- **Weekly Summary** - Tests completed, check-ins, medication adherence
- **AI Insight** - Plain English health summary

#### Patient Management
- **Link Patient** - Add patients using their 8-character share code
- **Remove Patient** - Unlink patients from monitoring
- **Multiple Patients** - Monitor several patients simultaneously

#### Notifications
- Real-time alerts for score drops
- Missed check-in notifications
- Abnormal pattern detection
- Toggle notifications on/off

#### Profile Settings
- Account information display
- Linked patients list
- Notification preferences
- Sign out

#### Export
- **Weekly Report** - Download text summary of patient status

---

## Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Vite** | Build tool and dev server |
| **React Router v6** | Client-side routing |
| **Zustand** | State management |
| **TailwindCSS 4** | Styling |
| **Dexie (IndexedDB)** | Local database |
| **i18next** | Internationalization |
| **Lucide React** | Icons |
| **Framer Motion** | Animations |
| **Recharts** | Data visualization |
| **Vite PWA** | Progressive Web App support |

### Backend (Stub)

Currently, the application uses browser localStorage for data persistence. The backend structure is prepared for FastAPI integration with MongoDB.

---

## Authentication

### Patient Authentication
1. **Password-based** - Traditional email/password stored in localStorage
2. **Passkey-based** - WebAuthn credentials for biometric login
   - Supports Face ID, Touch ID, Windows Hello, device PIN
   - Credentials stored in browser's credential manager

### Caregiver Authentication
- Separate authentication system from patients
- Credentials stored per caregiver email in localStorage

### Security Notes
- Currently uses client-side storage only
- Passwords stored as-is (production should hash)
- Share codes are randomly generated 8-character strings
- Passkey credentials are device-bound

---

## Data Storage

### Local Storage Schema

**Patient Data** (`nakshatra-user-{email}`)
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "hashed_password",
  "shareCode": "ABCD1234",
  "passkeyCredentialId": "base64_encoded_id",
  "createdAt": "ISO date string",
  "linkedCaregivers": [...]
}
```

**Caregiver Data** (`nakshatra-caregiver-{email}`)
```json
{
  "name": "Caregiver Name",
  "password": "hashed_password",
  "linkedPatients": [
    { "code": "ABCD1234", "name": "Patient Name", "linkedAt": "ISO date" }
  ]
}
```

**App State** (`nakshatra-app`)
- CogniScore, streak, active tab, sidebar state

**Auth State** (`nakshatra-auth`, `nakshatra-caregiver`)
- Current user/caregiver session

### IndexedDB (Dexie)

Tables:
- `checkIns` - Daily mood, sleep, energy logs
- `testResults` - Cognitive test scores
- `speechSessions` - Voice analysis results
- `facialSessions` - Expression tracking data
- `medicationLogs` - Medication adherence records

---

## Internationalization

The app supports three languages:

| Language | Code | Native Name |
|----------|------|------------|
| English | `en` | English |
| Hindi | `hi` | हिन्दी |
| Marathi | `mr` | मराठी |

### Switching Languages
1. Go to Profile or Settings
2. Select Language
3. UI immediately updates

### Adding New Languages
1. Create new file in `src/i18n/locales/{code}.json`
2. Copy structure from `en.json`
3. Translate all values
4. Add to `src/i18n/index.js`

---

## Browser Support

### Recommended Browsers
- **Chrome 90+** - Full feature support
- **Firefox 90+** - Full feature support
- **Safari 15+** - Full feature support (passkeys may vary)
- **Edge 90+** - Full feature support

### PWA Support
The app can be installed as a Progressive Web App on:
- Chrome/Edge (Desktop & Android)
- Safari (iOS 16.4+)
- Samsung Internet

### Passkey Support
Passkey authentication requires:
- WebAuthn API support
- Platform authenticator (biometrics/PIN)
- HTTPS or localhost

---

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build         # Production build
npm run preview      # Preview production build

# Quality
npm run lint          # Run ESLint
npm run validate-i18n # Validate translation files
```

### Adding a New Page

1. Create component in `src/pages/`
2. Add route in `src/App.jsx`:
```jsx
<Route path="/new-page" element={
  <ProtectedRoute>
    <Layout showBottomNav={true}>
      <NewPage />
    </Layout>
  </ProtectedRoute>
} />
```

### Adding a New Test

1. Create component in `src/pages/tests/`
2. Import in `TestsPage.jsx`
3. Add test metadata for display

---

## Future Enhancements

- [ ] Backend API with proper authentication (JWT)
- [ ] MongoDB integration for data persistence
- [ ] Real-time notifications (WebSocket)
- [ ] PDF report generation
- [ ] Multi-factor authentication
- [ ] Dark/light theme toggle
- [ ] Email notifications
- [ ] Care team collaboration features
- [ ] Offline-first with sync
- [ ] Wearable device integration

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Disclaimer

**Nakshatra is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease or condition.**

The cognitive assessments provided are screening tools only and should not be considered as medical advice. Always consult a healthcare professional for any health concerns.

---

Built with ❤️ for cognitive wellness
