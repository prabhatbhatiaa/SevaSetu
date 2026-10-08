import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Chip,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Switch,
  Tabs,
  Tag,
  Textarea,
} from '../../components/ui';
import { Panel } from '../../components/dashboard/Panel';
import { MapPicker } from '../../components/maps/MapPicker';
import { AvailabilityGrid } from '../../components/volunteers/AvailabilityGrid';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { TOKEN_KEY, getErrorMessage } from '../../lib/api';
import { CATEGORY_NAMES, DEFAULT_CENTER, ROLE_LABELS, TIME_SLOTS } from '../../lib/constants';
import { useDocumentTitle, useFetch } from '../../lib/hooks';

const DAY_SLOTS = TIME_SLOTS.filter((slot) => slot.value !== 'flexible').map((slot) => slot.value);

function toLocationState(location) {
  return {
    coordinates: location?.coordinates ?? [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
    address: location?.address ?? '',
    city: location?.city ?? '',
    state: location?.state ?? '',
    pincode: location?.pincode ?? '',
  };
}

/** Flips one slot on one day. A "flexible" day is expanded into explicit slots first. */
function toggleAvailability(availability, day, slot) {
  const others = availability.filter((entry) => entry.day !== day);
  const current = availability.find((entry) => entry.day === day)?.slots ?? [];
  const explicit = current.includes('flexible') ? [...DAY_SLOTS] : current;
  const next = explicit.includes(slot) ? explicit.filter((value) => value !== slot) : [...explicit, slot];
  return next.length ? [...others, { day, slots: next }] : others;
}

function AccountSettings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [location, setLocation] = useState(() => toLocationState(user.location));
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: name.trim(),
        phone: phone.trim(),
        location: { type: 'Point', ...location },
      });
      setUser(data.data);
      toast.success('Your details are saved.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <Panel title="Your details" description="How you appear to others on SevaSetu.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name">
            <Input
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Email" hint="Your email can’t be changed.">
            <Input value={user.email} disabled />
          </Field>
          <div>
            <span className="label">Account type</span>
            <div className="flex h-11 items-center">
              <Badge>{ROLE_LABELS[user.role]}</Badge>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Home location"
        description={
          user.role === 'volunteer'
            ? 'Used to find requests near you. Also updates your volunteer profile.'
            : 'Used as the starting pin when you post a request.'
        }
      >
        <MapPicker value={location} onChange={(next) => setLocation((current) => ({ ...current, ...next }))} />
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function VolunteerSettings() {
  const toast = useToast();
  const { data: profile, loading } = useFetch(async () => (await api.get('/volunteers/me')).data.data, []);
  const [form, setForm] = useState(null);
  const [skillDraft, setSkillDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      skills: profile.skills ?? [],
      categories: profile.categories ?? [],
      serviceRadius: profile.serviceRadius ?? 10,
      bio: profile.bio ?? '',
      isActive: profile.isActive ?? true,
      availability: profile.availability ?? [],
    });
  }, [profile]);

  if (loading || !form) return <Skeleton className="h-96" />;

  const update = (changes) => setForm((current) => ({ ...current, ...changes }));

  const addSkill = () => {
    const skill = skillDraft.trim();
    if (skill && !form.skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
      update({ skills: [...form.skills, skill] });
    }
    setSkillDraft('');
  };

  const toggleCategory = (name) =>
    update({
      categories: form.categories.includes(name)
        ? form.categories.filter((item) => item !== name)
        : [...form.categories, name],
    });

  const save = async () => {
    if (form.categories.length === 0) {
      toast.error('Choose at least one kind of help you can offer.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/volunteers/profile', { ...form, serviceRadius: Number(form.serviceRadius) });
      toast.success('Volunteer profile saved. Your matches will update.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Skills and categories" description="The strongest signals in your match score (35% and 10%).">
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
            placeholder="Add a skill and press Enter"
          />
          <Button onClick={addSkill} className="h-11">
            Add
          </Button>
        </div>
        {form.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.skills.map((skill) => (
              <Tag
                key={skill}
                onRemove={() => update({ skills: form.skills.filter((existing) => existing !== skill) })}
              >
                {skill}
              </Tag>
            ))}
          </div>
        )}

        <span className="label mt-8">Kinds of help you offer</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_NAMES.map((name) => (
            <Chip key={name} selected={form.categories.includes(name)} onClick={() => toggleCategory(name)}>
              {name}
            </Chip>
          ))}
        </div>
      </Panel>

      <Panel title="Weekly availability" description="Tap the times you’re usually free (20% of your match score).">
        <AvailabilityGrid
          availability={form.availability}
          onToggle={(day, slot) => update({ availability: toggleAvailability(form.availability, day, slot) })}
        />
      </Panel>

      <Panel title="Reach and bio">
        <Field label={`Service radius · ${form.serviceRadius} km`}>
          <input
            type="range"
            min="1"
            max="100"
            value={form.serviceRadius}
            onChange={(event) => update({ serviceRadius: event.target.value })}
            className="w-full accent-[rgb(var(--ink))]"
          />
        </Field>
        <Field label="Short bio" hint={`${form.bio.length} / 500`} className="mt-6">
          <Textarea
            maxLength={500}
            value={form.bio}
            onChange={(event) => update({ bio: event.target.value })}
            placeholder="A line or two for the people you’ll help."
          />
        </Field>
        <Switch
          className="mt-6"
          checked={form.isActive}
          onChange={(isActive) => update({ isActive })}
          label="Accepting new tasks"
        />
      </Panel>

      <div className="flex justify-end">
        <Button variant="primary" loading={saving} onClick={save}>
          Save volunteer profile
        </Button>
      </div>
    </div>
  );
}

function PasswordSettings() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmation) {
      toast.error('The new passwords don’t match.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
      // The server issues a fresh token after a password change.
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      toast.success('Password updated.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Panel title="Change password" description="Use at least 6 characters.">
        <div className="max-w-sm space-y-5">
          <Field label="Current password">
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label="New password">
            <Input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary" loading={saving}>
            Update password
          </Button>
        </div>
      </Panel>
    </form>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { user } = useAuth();
  const [tab, setTab] = useState('account');

  const tabs = [
    { value: 'account', label: 'Account' },
    ...(user.role === 'volunteer' ? [{ value: 'volunteer', label: 'Volunteer profile' }] : []),
    { value: 'password', label: 'Password' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title={
          <>
            Your <em>settings</em>
          </>
        }
        description="Your profile, location and sign-in details."
      />
      <Tabs options={tabs} value={tab} onChange={setTab} className="mb-8" />
      <div className="max-w-3xl">
        {tab === 'account' && <AccountSettings />}
        {tab === 'volunteer' && <VolunteerSettings />}
        {tab === 'password' && <PasswordSettings />}
      </div>
    </>
  );
}
