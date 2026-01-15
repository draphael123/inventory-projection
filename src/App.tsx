import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import Dashboard from './components/Dashboard';
import LoginPage from './components/auth/LoginPage';
import ChangePasswordModal from './components/auth/ChangePasswordModal';
import AdminPanel from './components/admin/AdminPanel';

type AppView = 'dashboard' | 'admin';

// Check if backend is available
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

function StandaloneMode() {
  // No authentication - direct access to dashboard in demo mode
  return (
    <InventoryProvider>
      <Dashboard />
    </InventoryProvider>
  );
}

function AuthenticatedApp() {
  const { state, isAdmin, logout } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-[var(--color-text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <LoginPage />;
  }

  if (state.user?.mustChangePassword) {
    return (
      <>
        <div className="min-h-screen bg-[var(--color-bg)]" />
        <ChangePasswordModal isOpen required />
      </>
    );
  }

  if (currentView === 'admin' && isAdmin) {
    return <AdminPanel onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <InventoryProvider>
      <Dashboard 
        onAdminClick={() => setCurrentView('admin')}
        user={state.user}
        isAdmin={isAdmin}
        onLogout={logout}
      />
    </InventoryProvider>
  );
}

function AppContent() {
  const [mode, setMode] = useState<'checking' | 'standalone' | 'authenticated'>('checking');

  useEffect(() => {
    // Check if backend is available
    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`${API_URL}/health`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setMode('authenticated');
        } else {
          setMode('standalone');
        }
      } catch {
        // Backend not available - use standalone mode
        setMode('standalone');
      }
    };

    checkBackend();
  }, []);

  if (mode === 'checking') {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-[var(--color-text-muted)]">Connecting...</p>
        </div>
      </div>
    );
  }

  if (mode === 'standalone') {
    return <StandaloneMode />;
  }

  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] bg-gradient-radial bg-grid-pattern">
      <AppContent />
    </div>
  );
}

export default App;
