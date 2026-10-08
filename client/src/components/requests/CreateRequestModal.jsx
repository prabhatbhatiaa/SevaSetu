import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Chip, Field, Input, Modal, Select, Tag, Textarea, cn } from '../ui';
import { MapPicker } from '../maps/MapPicker';
import api, { getErrorMessage } from '../../lib/api';
import { CATEGORY_NAMES, DEFAULT_CENTER, TIME_SLOTS, URGENCIES } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function startingLocation(user) {
  const saved = user?.location;
  return {
    coordinates: saved?.coordinates ?? [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
    address: saved?.address ?? '',
    city: saved?.city ?? '',
    state: saved?.state ?? '',
    pincode: saved?.pincode ?? '',
  };
}

const today = () => new Date().toISOString().slice(0, 10);

export default function CreateRequestModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [urgency, setUrgency] = useState('medium');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('flexible');
  const [skills, setSkills] = useState([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [location, setLocation] = useState(() => startingLocation(user));

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim(),
    category,
    urgency,
    requiredSkills: skills,
    location: { type: 'Point', ...location },
    preferredTime,
    ...(preferredDate && { preferredDate }),
  });

  const addSkill = () => {
    const skill = skillDraft.trim();
    const alreadyAdded = skills.some((existing) => existing.toLowerCase() === skill.toLowerCase());
    if (skill && !alreadyAdded) setSkills([...skills, skill]);
    setSkillDraft('');
  };

  const checkMatches = async () => {
    setPreviewing(true);
    try {
      const response = await api.post('/requests/preview-matches?limit=3', buildPayload());
      setPreview(response.data.matches ?? []);
    } catch {
      setPreview([]);
    } finally {
      setPreviewing(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/requests', buildPayload());
      toast.success('Request posted. Volunteers nearby can see it now.');
      onCreated?.(response.data.data);
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Ask for help"
      description="Describe what you need. We’ll rank the volunteers best placed to help."
    >
      <form onSubmit={submit} className="space-y-6">
        <Field label="What do you need help with?">
          <Input
            required
            minLength={5}
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Help filling in my pension application"
          />
        </Field>

        <Field label="Details" hint={`${description.length} / 2000`}>
          <Textarea
            required
            minLength={10}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What’s the situation, what needs doing, and anything a volunteer should know beforehand."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORY_NAMES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Preferred date" hint="Leave empty if any day works.">
            <Input
              type="date"
              min={today()}
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="label">How urgent is it?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {URGENCIES.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setUrgency(level)}
                aria-pressed={urgency === level}
                className={cn(
                  'h-10 rounded-full border text-sm capitalize transition-colors',
                  urgency === level ? 'border-ink bg-ink text-canvas' : 'text-muted hover:border-strong hover:text-ink',
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Preferred time</legend>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => (
              <Chip
                key={slot.value}
                selected={preferredTime === slot.value}
                onClick={() => setPreferredTime(slot.value)}
              >
                {slot.label}
                <span className="opacity-60">{slot.hours}</span>
              </Chip>
            ))}
          </div>
        </fieldset>

        <div>
          <span className="label">Skills that would help (optional)</span>
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
              placeholder="e.g. Form filling, Hindi"
            />
            <Button onClick={addSkill} size="icon" className="h-11 w-11" aria-label="Add skill">
              <Plus className="h-4 w-4" />
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

        <div>
          <span className="label">Where is help needed?</span>
          <MapPicker
            value={location}
            onChange={(next) => setLocation((current) => ({ ...current, ...next }))}
            height={220}
          />
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Who’s likely to help?</p>
              <p className="mt-0.5 text-xs text-muted">See your top matches before you post.</p>
            </div>
            <Button size="sm" loading={previewing} onClick={checkMatches}>
              Preview matches
            </Button>
          </div>

          {preview && (
            <ul className="mt-4 divide-y border-t">
              {preview.length === 0 && (
                <li className="pt-3 text-sm text-muted">
                  No volunteers in range yet. Your request will still be visible to anyone who joins nearby.
                </li>
              )}
              {preview.map((match) => (
                <li
                  key={match.user?._id ?? match.matchScore}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span>{match.user?.name ?? 'Volunteer'}</span>
                  <span className="font-mono text-xs text-muted">{Math.round(match.matchScore)}% match</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t pt-5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Post request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
