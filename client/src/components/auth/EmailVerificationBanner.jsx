import { useState } from 'react';
import { Mail, RefreshCw, X } from 'lucide-react';
import { Button } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { getErrorMessage } from '../../lib/api';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const [resending, setResending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If user is verified or banner is dismissed, do not render
  if (!user || user.isEmailVerified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await api.post('/auth/resend-verification');
      toast.success(response.data.message || 'Verification email resent! Please check your inbox.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to resend verification email.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-3.5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Mail className="h-4 w-4" />
        </span>
        <div className="text-sm">
          <span className="font-medium text-ink">Verify your email address</span>
          <p className="mt-0.5 text-xs text-muted">
            We sent a confirmation link to <strong className="font-medium text-ink">{user.email}</strong>. Confirm it to unlock all volunteer features.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <Button
          size="sm"
          variant="secondary"
          loading={resending}
          onClick={handleResend}
          className="text-xs"
        >
          {resending ? 'Sending...' : 'Resend email'}
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full p-1.5 text-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/5"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
