import { useState } from 'react';
import { Button, Modal, Stars, Textarea } from '../ui';
import api, { getErrorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Outstanding'];

export function ReviewModal({ request, open, onClose, onSubmitted }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/reviews', {
        requestId: request._id,
        rating,
        ...(feedback.trim() && { feedback: feedback.trim() }),
      });
      toast.success('Thank you. Your review helps the next match.');
      onSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const volunteerName = request?.assignedVolunteer?.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rate your volunteer"
      description={volunteerName ? `How did ${volunteerName} do?` : request?.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button variant="primary" loading={saving} onClick={submit}>
            Submit review
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 pb-6 pt-2">
        <Stars value={rating} size={34} onChange={setRating} />
        <span className="text-sm font-medium">{LABELS[rating]}</span>
      </div>
      <Textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        maxLength={1000}
        placeholder="A few words about how it went (optional)"
        aria-label="Feedback"
      />
    </Modal>
  );
}
