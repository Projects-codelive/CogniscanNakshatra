import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CaregiverPortal from './pages/CaregiverPortal';
import SpeechSession from './pages/SpeechSession';
import FacialSession from './pages/FacialSession';
import FacialReport from './pages/FacialReport';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import CheckIn from './pages/CheckIn';
import Medications from './pages/Medications';
import Insights from './pages/Insights';
import Profile from './pages/Profile';
import TestsPage from './pages/TestsPage';
import ClockDrawingTest from './pages/tests/ClockDrawingTest';
import WordRecallTest from './pages/tests/WordRecallTest';
import TrailMakingTest from './pages/tests/TrailMakingTest';
import StroopTest from './pages/tests/StroopTest';
import ReactionTimeTest from './pages/tests/ReactionTimeTest';
import useAuthStore from './store/useAuthStore';

const SettingsPage = () => (
  <div className="min-h-screen bg-slate-950 pb-8">
    <div className="bg-slate-900 p-6 border-b border-slate-800">
      <h1 className="text-xl font-bold text-white">Settings</h1>
      <p className="text-slate-400 text-sm mt-1">Application settings and preferences</p>
    </div>
    <div className="p-8 flex flex-col items-center justify-center">
      <p className="text-slate-400 text-center">Settings coming soon</p>
    </div>
  </div>
);

const ExercisesPage = () => (
  <div className="min-h-screen bg-slate-950 pb-8">
    <div className="bg-slate-900 p-6 border-b border-slate-800">
      <h1 className="text-xl font-bold text-white">Cognitive Exercises</h1>
      <p className="text-slate-400 text-sm mt-1">Daily training modules for neuroplasticity</p>
    </div>
    <div className="p-8 flex flex-col items-center justify-center">
      <p className="text-slate-400 text-center">Coming soon</p>
    </div>
  </div>
);

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        } />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/speech" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <SpeechSession />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/facial" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <FacialSession />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/facial-report/:sessionId" element={
          <ProtectedRoute>
            <FacialReport />
          </ProtectedRoute>
        } />
        <Route path="/checkin" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <CheckIn />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/medications" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <Medications />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/insights" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <Insights />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/caregiver" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <CaregiverPortal />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/exercises" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <ExercisesPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tests" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <TestsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tests/clock-drawing" element={
          <ProtectedRoute>
            <Layout showBottomNav={false}>
              <ClockDrawingTest />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tests/word-recall" element={
          <ProtectedRoute>
            <Layout showBottomNav={false}>
              <WordRecallTest />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tests/trail-making" element={
          <ProtectedRoute>
            <Layout showBottomNav={false}>
              <TrailMakingTest />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tests/stroop" element={
          <ProtectedRoute>
            <Layout showBottomNav={false}>
              <StroopTest />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tests/reaction-time" element={
          <ProtectedRoute>
            <Layout showBottomNav={false}>
              <ReactionTimeTest />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
