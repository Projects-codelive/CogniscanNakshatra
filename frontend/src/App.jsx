import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
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
import CaregiverLogin from './pages/caregiver/CaregiverLogin';
import CaregiverSignup from './pages/caregiver/CaregiverSignup';
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';
import ClockDrawingTest from './pages/tests/ClockDrawingTest';
import WordRecallTest from './pages/tests/WordRecallTest';
import TrailMakingTest from './pages/tests/TrailMakingTest';
import StroopTest from './pages/tests/StroopTest';
import ReactionTimeTest from './pages/tests/ReactionTimeTest';
import useAuthStore from './store/useAuthStore';
import useCaregiverStore from './store/useCaregiverStore';

function ProtectedRoute({ children, caregiverOnly = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isCaregiverAuthenticated = useCaregiverStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (caregiverOnly) {
    if (!isCaregiverAuthenticated) {
      return <Navigate to="/caregiver/login" state={{ from: location }} replace />;
    }
  } else {
    if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  return children;
}

function PublicRoute({ children, caregiverOnly = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isCaregiverAuthenticated = useCaregiverStore((s) => s.isAuthenticated);

  if (caregiverOnly) {
    if (isCaregiverAuthenticated) {
      return <Navigate to="/caregiver" replace />;
    }
  } else {
    if (isAuthenticated) {
      return <Navigate to="/" replace />;
    }
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
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout showBottomNav={true}>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/caregiver/login" element={
          <PublicRoute caregiverOnly>
            <CaregiverLogin />
          </PublicRoute>
        } />
        <Route path="/caregiver/signup" element={
          <PublicRoute caregiverOnly>
            <CaregiverSignup />
          </PublicRoute>
        } />
        <Route path="/caregiver" element={
          <ProtectedRoute caregiverOnly>
            <CaregiverDashboard />
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
