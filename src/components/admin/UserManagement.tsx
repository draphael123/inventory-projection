import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedFetch, useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardContent, CardTitle, Button, Badge, Input, Select } from '../ui';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'analyst' | 'viewer';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'viewer', label: 'Viewer' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function UserManagement() {
  const authenticatedFetch = useAuthenticatedFetch();
  const { state: authState } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (searchQuery) params.append('searchTerm', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('isActive', statusFilter);

      const response = await authenticatedFetch(`/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
        setTotal(data.meta.total);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, page, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      const response = await authenticatedFetch(`/users/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    }
  };

  const handleUnlock = async (userId: string) => {
    try {
      const response = await authenticatedFetch(`/users/${userId}/unlock`, { method: 'POST' });
      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to unlock user:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="danger">{role}</Badge>;
      case 'analyst':
        return <Badge variant="info">{role}</Badge>;
      default:
        return <Badge variant="default">{role}</Badge>;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {total} total users
            </p>
          </div>
        </div>
      </CardHeader>

      {/* Filters */}
      <div className="px-5 pb-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-40">
          <Select
            options={roleOptions}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-40">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Last Login</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--color-surface-elevated)]">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-[var(--color-text)]">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                    {formatDate(user.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {user.id !== authState.user?.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlock(user.id)}
                          >
                            Unlock
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(user.id)}
                            disabled={!user.isActive}
                          >
                            Deactivate
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {users.length === 0 && !isLoading && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            No users found
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

