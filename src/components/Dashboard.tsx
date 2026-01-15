import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import FileUpload from './FileUpload';
import DataSummary from './DataSummary';
import ProductSelector from './ProductSelector';
import ProjectionChart from './ProjectionChart';
import ProjectionTable from './ProjectionTable';
import SettingsPanel from './SettingsPanel';
import ChangePasswordModal from './auth/ChangePasswordModal';
import { Button, Badge } from './ui';

// Icons
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const TableIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

type ViewMode = 'chart' | 'table' | 'both';

interface DashboardProps {
  onAdminClick?: () => void;
}

export default function Dashboard({ onAdminClick }: DashboardProps) {
  const { state } = useInventory();
  const { state: authState, logout, isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const hasData = state.projections.size > 0;
  const user = authState.user;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <MenuIcon />
              </button>
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text)] flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow">
                    <ChartIcon />
                  </span>
                  Inventory Projections
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  Analyze historical data and forecast future demand
                </p>
              </div>
            </div>

            {hasData && (
              <div className="flex items-center gap-3">
                {/* View mode toggle */}
                <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--color-surface-elevated)] rounded-lg">
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'chart'
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                    title="Chart view"
                  >
                    <ChartIcon />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'table'
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                    title="Table view"
                  >
                    <TableIcon />
                  </button>
                  <button
                    onClick={() => setViewMode('both')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'both'
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                    title="Both views"
                  >
                    <GridIcon />
                  </button>
                </div>

                {/* Settings toggle */}
                <Button
                  variant={showSettings ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="hidden lg:flex"
                >
                  Settings
                </Button>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="info">
                    {state.projections.size} products
                  </Badge>
                  <Badge variant="success">
                    {state.orders.length.toLocaleString()} orders
                  </Badge>
                </div>
              </div>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)] transition-colors"
              >
                <UserIcon />
                <span className="hidden sm:inline text-sm font-medium">
                  {user?.firstName}
                </span>
                <Badge variant={isAdmin ? 'danger' : 'default'} size="sm">
                  {user?.role}
                </Badge>
              </button>

              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 animate-fade-in">
                    <div className="p-3 border-b border-[var(--color-border)]">
                      <p className="font-medium text-[var(--color-text)]">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {user?.email}
                      </p>
                    </div>
                    <div className="p-2">
                      {isAdmin && onAdminClick && (
                        <button
                          onClick={() => { setShowUserMenu(false); onAdminClick(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] rounded-md transition-colors"
                        >
                          <ShieldIcon />
                          Admin Panel
                        </button>
                      )}
                      <button
                        onClick={() => { setShowUserMenu(false); setShowPasswordModal(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Change Password
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <LogoutIcon />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Products */}
        {hasData && (
          <aside
            className={`
              w-80 flex-shrink-0 border-r border-[var(--color-border)]
              bg-[var(--color-surface)]
              transition-all duration-300
              ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              fixed lg:relative inset-y-0 left-0 z-30 lg:z-0
              ${!showSidebar && 'lg:hidden'}
            `}
          >
            {/* Mobile close button */}
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden absolute top-4 right-4 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <CloseIcon />
            </button>
            <ProductSelector />
          </aside>
        )}

        {/* Mobile overlay */}
        {showSidebar && hasData && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Main area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Upload section - always visible when no data */}
            {!hasData && (
              <div className="max-w-2xl mx-auto space-y-6 py-12">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-[var(--color-text)]">
                    Get Started
                  </h2>
                  <p className="text-[var(--color-text-muted)] mt-2">
                    Upload your order history to generate demand projections
                  </p>
                </div>
                <FileUpload />
                
                {/* Format guide */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
                  <h3 className="font-medium text-[var(--color-text)] mb-4">
                    Expected Spreadsheet Format
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-primary-400 font-medium mb-2">Required Columns:</p>
                      <ul className="space-y-1 text-[var(--color-text-muted)]">
                        <li>• Date (order date)</li>
                        <li>• Product ID / SKU</li>
                        <li>• Product Name</li>
                        <li>• Quantity Ordered</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-muted)] font-medium mb-2">Optional Columns:</p>
                      <ul className="space-y-1 text-[var(--color-text-muted)]">
                        <li>• Category</li>
                        <li>• Unit Price</li>
                        <li>• Supplier</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data loaded view */}
            {hasData && (
              <>
                {/* Data summary */}
                <DataSummary />

                {/* Add more files */}
                <div className="animate-fade-in stagger-4">
                  <FileUpload />
                </div>

                {/* Visualizations */}
                <div
                  className={`
                    grid gap-6
                    ${viewMode === 'both' ? 'lg:grid-cols-1' : ''}
                  `}
                >
                  {/* Chart */}
                  {(viewMode === 'chart' || viewMode === 'both') && (
                    <div className={`animate-fade-in ${viewMode === 'both' ? 'h-[400px]' : 'h-[500px]'}`}>
                      <ProjectionChart />
                    </div>
                  )}

                  {/* Table */}
                  {(viewMode === 'table' || viewMode === 'both') && (
                    <div className={`animate-fade-in ${viewMode === 'both' ? 'h-[400px]' : 'h-[600px]'}`}>
                      <ProjectionTable />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        {/* Right sidebar - Settings */}
        {hasData && showSettings && (
          <aside className="w-80 flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] hidden lg:block">
            <SettingsPanel />
          </aside>
        )}
      </div>

      {/* Loading overlay */}
      {state.isLoading && (
        <div className="fixed inset-0 bg-[var(--color-bg)]/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-[var(--color-text-muted)]">Processing data...</p>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}

