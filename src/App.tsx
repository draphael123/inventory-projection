import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import Dashboard from './components/Dashboard';
import LoginPage from './components/auth/LoginPage';
import ChangePasswordModal from './components/auth/ChangePasswordModal';
import AdminPanel from './components/admin/AdminPanel';

type AppView = 'dashboard' | 'admin';

function AppContent() {
  const { state, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  // Show loading while checking auth
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

  // Show login if not authenticated
  if (!state.isAuthenticated) {
    return <LoginPage />;
  }

  // Show password change modal if required
  if (state.user?.mustChangePassword) {
    return (
      <>
        <div className="min-h-screen bg-[var(--color-bg)]" />
        <ChangePasswordModal isOpen required />
      </>
    );
  }

  // Show admin panel
  if (currentView === 'admin' && isAdmin) {
    return <AdminPanel onBack={() => setCurrentView('dashboard')} />;
  }

  // Show main dashboard with inventory context
  return (
    <InventoryProvider>
      <Dashboard onAdminClick={() => setCurrentView('admin')} />
    </InventoryProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--color-bg)] bg-gradient-radial bg-grid-pattern">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;
