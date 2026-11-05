import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AuthLayout, FormError } from './AuthLayout';
import { Button, Field, Input } from '../../components/ui';
import api, { getErrorMessage } from '../../lib/api';
import { useDocumentTitle } from '../../lib/hooks';

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'We couldn’t send the reset email. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title={
          <>
            Check your <em>inbox</em>.
          </>
        }
        description="Password reset instructions are on their way."
        footer={
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border bg-surface p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-emerald-500/10 text-emerald-600">
              <MailCheck className="h-6 w-6" />
            </div>
            <h2 className="text-base font-medium">Instructions sent</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              If an account is registered with <strong className="font-medium text-ink">{email}</strong>, you will receive an email shortly with a secure link to reset your password.
            </p>
            <p className="mt-2 text-xs text-subtle">
              For security, the reset link will expire in 1 hour.
            </p>
          </div>

          <div className="space-y-3">
            <Button to="/login" variant="primary" size="lg" className="w-full">
              Return to sign in
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="w-full text-muted hover:text-ink"
            >
              Didn’t receive the email? Try again
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={
        <>
          Reset your <em>password</em>.
        </>
      }
      description="Enter your account email, and we’ll send you a single-use link to reset your password."
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
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <FormError>{error}</FormError>

        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
