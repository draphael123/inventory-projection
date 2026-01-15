import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedFetch } from '../../context/AuthContext';
import { Card, CardHeader, CardContent, CardTitle, Button, Badge, Input, Select } from '../ui';

interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  timestamp: string;
}

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'USER_LOGIN', label: 'User Login' },
  { value: 'USER_LOGOUT', label: 'User Logout' },
  { value: 'USER_LOGIN_FAILED', label: 'Failed Login' },
  { value: 'DATA_UPLOADED', label: 'Data Uploaded' },
  { value: 'DATA_VIEWED', label: 'Data Viewed' },
  { value: 'DATA_EXPORTED', label: 'Data Exported' },
  { value: 'DATA_DELETED', label: 'Data Deleted' },
  { value: 'UNAUTHORIZED_ACCESS', label: 'Unauthorized Access' },
];

export default function AuditLogViewer() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (actionFilter) params.append('action', actionFilter);
      if (searchQuery) params.append('searchTerm', searchQuery);

      const response = await authenticatedFetch(`/audit?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data);
        setTotal(data.meta.total);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, page, actionFilter, searchQuery]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    if (action.includes('FAILED') || action.includes('UNAUTHORIZED')) {
      return <Badge variant="danger">{action}</Badge>;
    }
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return <Badge variant="info">{action}</Badge>;
    }
    if (action.includes('DELETED')) {
      return <Badge variant="warning">{action}</Badge>;
    }
    return <Badge variant="default">{action}</Badge>;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Logs</CardTitle>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {total.toLocaleString()} total entries • Immutable record
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadLogs}>
            Refresh
          </Button>
        </div>
      </CardHeader>

      {/* Filters */}
      <div className="px-5 pb-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by email or details..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-48">
          <Select
            options={actionOptions}
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <CardContent className="flex-1 overflow-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[var(--color-surface-elevated)] sticky top-0">
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Details</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {logs.map((log, index) => (
                <tr 
                  key={log.id} 
                  className="hover:bg-[var(--color-surface-elevated)] animate-fade-in"
                  style={{ animationDelay: `${index * 0.02}s` }}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-[var(--color-text-muted)]">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-[var(--color-text)]">
                      {log.userEmail || 'Anonymous'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                  <td className="px-4 py-3">
                    {log.details && (
                      <span className="text-sm text-[var(--color-text-muted)] font-mono">
                        {JSON.stringify(log.details).substring(0, 50)}
                        {JSON.stringify(log.details).length > 50 && '...'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-[var(--color-text-muted)]">
                      {log.ipAddress || '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {logs.length === 0 && !isLoading && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            No audit logs found
          </div>
        )}
      </CardContent>

      {/* Pagination */}
      {total > limit && (
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            Page {page} of {Math.ceil(total / limit)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

