import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserManagement from './UserManagement';
import AuditLogViewer from './AuditLogViewer';
import { Button } from '../ui';

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const AuditIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

type AdminView = 'users' | 'audit';

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const { isAdmin } = useAuth();
  const [activeView, setActiveView] = useState<AdminView>('users');

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-text-muted)]">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <BackIcon />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text)]">
                  Admin Panel
                </h1>
                <p className="text-sm text-[var(--color-text-muted)]">
                  User management and audit logs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-1">
          <button
            onClick={() => setActiveView('users')}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
              ${activeView === 'users'
                ? 'bg-[var(--color-surface)] text-primary-400 border-b-2 border-primary-500'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }
            `}
          >
            <UsersIcon />
            Users
          </button>
          <button
            onClick={() => setActiveView('audit')}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
              ${activeView === 'audit'
                ? 'bg-[var(--color-surface)] text-primary-400 border-b-2 border-primary-500'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }
            `}
          >
            <AuditIcon />
            Audit Logs
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6">
        {activeView === 'users' && <UserManagement />}
        {activeView === 'audit' && <AuditLogViewer />}
      </main>
    </div>
  );
}

