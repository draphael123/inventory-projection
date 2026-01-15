import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../ui';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
  required?: boolean;
}

export default function ChangePasswordModal({ isOpen, onClose, required = false }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('One number');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('One special character');
    return errors;
  };

  const passwordErrors = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isValid = passwordErrors.length === 0 && passwordsMatch && currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError('');

    const success = await changePassword(currentPassword, newPassword);

    if (!success) {
      setError('Failed to change password. Check your current password.');
      setIsSubmitting(false);
    }
    // If successful, user will be logged out automatically
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle>
              {required ? 'Password Change Required' : 'Change Password'}
            </CardTitle>
            {required && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                You must change your password before continuing
              </p>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                disabled={isSubmitting}
              />

              <div>
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={isSubmitting}
                />
                {newPassword && passwordErrors.length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="text-[var(--color-text-muted)] mb-1">Password must have:</p>
                    <ul className="space-y-1">
                      {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character'].map((req) => (
                        <li
                          key={req}
                          className={passwordErrors.includes(req) ? 'text-red-400' : 'text-emerald-400'}
                        >
                          {passwordErrors.includes(req) ? '✗' : '✓'} {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isSubmitting}
                error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
              />

              <div className="flex gap-3 pt-4">
                {!required && onClose && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!isValid || isSubmitting}
                >
                  {isSubmitting ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

