import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage } from '../../lib/api';
import { useDocumentTitle } from '../../lib/hooks';

export default function VerifyEmailPage() {
  useDocumentTitle('Verify Email');
  const { token } = useParams();
  const { user, setSession } = useAuth();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        if (!active) return;

        const { token: authToken, user: updatedUser } = response.data;
        if (authToken && updatedUser) {
          setSession(authToken, updatedUser);
        }

        setSuccess(true);
      } catch (err) {
        if (!active) return;
        setErrorMessage(getErrorMessage(err, 'Verification link is invalid or has expired.'));
        setSuccess(false);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (token) {
      verify();
    } else {
      setLoading(false);
      setErrorMessage('No verification token provided.');
    }

    return () => {
      active = false;
    };
  }, [token, setSession]);

  if (loading) {
    return (
      <AuthLayout
        title={
          <>
            Verifying your <em>email</em>...
          </>
        }
        description="Please wait while we confirm your email address."
      >
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-surface py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
          <p className="mt-4 text-sm text-muted">Checking verification token...</p>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        title={
          <>
            Email <em>verified</em>.
          </>
        }
        description="Your email address has been successfully verified."
        footer={
          <span className="text-sm text-muted">
            सेवा सेतु — thank you for helping strengthen our community.
          </span>
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border bg-surface p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-medium">Account verified</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Thank you for verifying your email. You now have full access to all community requests, volunteer matching, and direct communication features.
            </p>
          </div>

          <Button to={user ? '/dashboard' : '/login'} variant="primary" size="lg" className="w-full">
            {user ? 'Proceed to Dashboard' : 'Sign in to your account'}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={
        <>
          Verification <em>failed</em>.
        </>
      }
      description="We could not verify your email address."
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
          <h2 className="text-base font-medium">Link expired or invalid</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {errorMessage || 'This verification link is invalid or has expired. If you already have an account, you can request a new verification link from your dashboard.'}
          </p>
        </div>

        <div className="space-y-3">
          {user ? (
            <Button to="/dashboard" variant="primary" size="lg" className="w-full">
              Return to dashboard
            </Button>
          ) : (
            <Button to="/login" variant="primary" size="lg" className="w-full">
              Sign in to resend
            </Button>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
