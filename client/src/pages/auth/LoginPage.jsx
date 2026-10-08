import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout, FormError } from './AuthLayout';
import { Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../lib/api';
import { useDocumentTitle } from '../../lib/hooks';
import { firstName } from '../../lib/format';

// Seeded accounts (server/src/seeds/seed.json). Only shown in development.
const DEMO_ACCOUNTS = [
  { label: 'Community member', email: 'sunita.mehra@example.com', password: 'Password123!' },
  { label: 'Volunteer', email: 'rahul.volunteer@example.com', password: 'Password123!' },
  { label: 'Admin', email: 'admin@sevasetu.org', password: 'AdminPassword123!' },
];

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const destination = location.state?.from?.pathname ?? '/dashboard';
  if (user) return <Navigate to={destination} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const signedIn = await login(email.trim(), password);
      toast.success(`Welcome back, ${firstName(signedIn.name)}.`);
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'We couldn’t sign you in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={
        <>
          Welcome <em>back</em>.
        </>
      }
      description="Sign in to pick up where you left off."
      footer={
        <>
          New to SevaSetu?{' '}
          <Link to="/register" className="link">
            Create an account
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

        <Field label="Password">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle transition-colors hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <FormError>{error}</FormError>

        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-10 border-t pt-6">
          <p className="eyebrow mb-3">Demo accounts · development only</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.label}
                size="sm"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
