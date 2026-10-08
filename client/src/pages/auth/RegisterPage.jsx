import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthLayout, FormError } from './AuthLayout';
import { Button, Chip, Field, Input, Tag, cn } from '../../components/ui';
import { MapPicker } from '../../components/maps/MapPicker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../lib/api';
import { CATEGORY_NAMES, DEFAULT_CENTER } from '../../lib/constants';
import { firstName } from '../../lib/format';
import { useDocumentTitle } from '../../lib/hooks';

const ROLE_OPTIONS = [
  { value: 'community_member', title: 'I need help', text: 'Post requests and get matched with volunteers.' },
  { value: 'volunteer', title: 'I want to help', text: 'Get matched to needs near you.' },
];

const EMPTY_LOCATION = {
  coordinates: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
  address: '',
  city: '',
  state: '',
  pincode: '',
};

export default function RegisterPage() {
  useDocumentTitle('Create an account');
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState(searchParams.get('role') === 'volunteer' ? 'volunteer' : 'community_member');
  const [details, setDetails] = useState({ name: '', email: '', phone: '', password: '' });
  const [location, setLocation] = useState(EMPTY_LOCATION);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  const isVolunteer = role === 'volunteer';
  const updateDetail = (key) => (event) => setDetails({ ...details, [key]: event.target.value });

  const toggleCategory = (name) =>
    setCategories((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));

  const addSkill = () => {
    const skill = skillDraft.trim();
    if (skill && !skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
      setSkills([...skills, skill]);
    }
    setSkillDraft('');
  };

  const goToStepTwo = (event) => {
    event.preventDefault();
    setError('');
    setStep(2);
  };

  const createAccount = async () => {
    if (isVolunteer && categories.length === 0) {
      setError('Choose at least one kind of help you can offer.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await register({
        name: details.name.trim(),
        email: details.email.trim(),
        password: details.password,
        role,
        ...(details.phone.trim() && { phone: details.phone.trim() }),
        location: { type: 'Point', ...location },
        ...(isVolunteer && { categories, skills }),
      });
      toast.success(`Welcome to SevaSetu, ${firstName(created.name)}.`);
      navigate('/dashboard', { replace: true });
    } catch (registerError) {
      setError(getErrorMessage(registerError, 'We couldn’t create your account.'));
      // Validation problems (e.g. email taken) live on the first step.
      if (registerError.response?.status === 400) setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  const stepTwoTitle = isVolunteer ? 'Where can you help?' : 'Where are you based?';

  return (
    <AuthLayout
      title={
        step === 1 ? (
          <>
            Join the <em>bridge</em>.
          </>
        ) : (
          stepTwoTitle
        )
      }
      description={
        step === 1
          ? 'It’s free, and takes about a minute.'
          : 'We use this to find people near you. You can change it any time.'
      }
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </>
      }
    >
      <p className="index mb-6">Step {step} of 2</p>

      {step === 1 ? (
        <form onSubmit={goToStepTwo} className="space-y-5">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={role === option.value}
                onClick={() => setRole(option.value)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-colors',
                  role === option.value ? 'border-ink' : 'hover:border-strong',
                )}
              >
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{option.text}</span>
              </button>
            ))}
          </div>

          <Field label="Full name">
            <Input
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              value={details.name}
              onChange={updateDetail('name')}
            />
          </Field>
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={details.email} onChange={updateDetail('email')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Phone" hint="Optional">
              <Input maxLength={20} autoComplete="tel" value={details.phone} onChange={updateDetail('phone')} />
            </Field>
            <Field label="Password" hint="At least 6 characters">
              <Input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={details.password}
                onChange={updateDetail('password')}
              />
            </Field>
          </div>

          <FormError>{error}</FormError>

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <div className="space-y-8">
          <MapPicker
            value={location}
            onChange={(next) => setLocation((current) => ({ ...current, ...next }))}
            height={220}
          />

          {isVolunteer && (
            <>
              <fieldset>
                <legend className="label">What kind of help can you offer?</legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_NAMES.map((name) => (
                    <Chip key={name} selected={categories.includes(name)} onClick={() => toggleCategory(name)}>
                      {name}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <div>
                <span className="label">Skills</span>
                <div className="flex gap-2">
                  <Input
                    value={skillDraft}
                    onChange={(event) => setSkillDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="e.g. Form filling, Hindi, Python"
                  />
                  <Button onClick={addSkill} className="h-11">
                    Add
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Tag key={skill} onRemove={() => setSkills(skills.filter((existing) => existing !== skill))}>
                        {skill}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <FormError>{error}</FormError>

          <div className="flex gap-3">
            <Button size="lg" onClick={() => setStep(1)} aria-label="Back to step one">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="primary" size="lg" loading={submitting} onClick={createAccount} className="flex-1">
              Create account
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
