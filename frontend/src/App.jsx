import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-xs tracking-wider uppercase">Loading Hostel Portal...</p>
      </div>
    );
  }

  if (user) {
    return <DashboardPage />;
  }

  return view === 'login' ? (
    <LoginPage onNavigateToRegister={() => setView('register')} />
  ) : (
    <RegisterPage onNavigateToLogin={() => setView('login')} />
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
