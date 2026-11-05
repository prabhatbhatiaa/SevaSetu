import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AuthLayout, FormError } from './AuthLayout';
import { Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { getErrorMessage } from '../../lib/api';
import { useDocumentTitle } from '../../lib/hooks';

export default function ResetPasswordPage() {
  useDocumentTitle('Reset password');
  const { token } = useParams();
  const { setSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password });
      const { token: authToken, user } = response.data;

      if (authToken && user) {
        setSession(authToken, user);
      }

      toast.success('Your password has been reset successfully.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not reset password.');
      setError(msg);
      if (err.response?.status === 400 && msg.toLowerCase().includes('expired')) {
        setIsTokenInvalid(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isTokenInvalid) {
    return (
      <AuthLayout
        title={
          <>
            Link <em>expired</em>.
          </>
        }
        description="This password reset link is invalid or has expired."
        footer={
          <Link to="/login" className="link">
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border bg-surface p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-danger/10 text-danger">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-medium">Link no longer active</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              For security, password reset links can only be used once and expire after 1 hour.
            </p>
          </div>

          <Button to="/forgot-password" variant="primary" size="lg" className="w-full">
            Request a new reset link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={
        <>
          Set a new <em>password</em>.
        </>
      }
      description="Choose a strong password with at least 6 characters."
      footer={
        <>
          Remember your password?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="New password">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-11"
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle transition-colors hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm new password">
          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="pr-11"
              placeholder="Re-enter your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle transition-colors hover:text-ink"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <FormError>{error}</FormError>

        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
