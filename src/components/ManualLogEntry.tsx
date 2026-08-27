import { useState, type FormEvent } from 'react';
import { newTripId, saveDaySummary } from '../store/tripLog';

interface ManualLogEntryProps {
  onSaved: () => void;
}

function defaultDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BLANK_FIELDS = {
  distanceMiles: '',
  avgSpeedMph: '',
  maxSpeedMph: '',
  durationHours: '',
  durationMinutes: '',
};

export default function ManualLogEntry({ onSaved }: ManualLogEntryProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDatetimeLocal());
  const [fields, setFields] = useState(BLANK_FIELDS);

  function updateField(key: keyof typeof BLANK_FIELDS, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const startTime = new Date(date).getTime();
    const durationSeconds =
      (Number(fields.durationHours) || 0) * 3600 + (Number(fields.durationMinutes) || 0) * 60;

    await saveDaySummary({
      tripId: newTripId(),
      startTime,
      endTime: startTime + durationSeconds * 1000,
      distanceMiles: Number(fields.distanceMiles) || 0,
      avgSpeedMph: Number(fields.avgSpeedMph) || 0,
      maxSpeedMph: Number(fields.maxSpeedMph) || 0,
      durationSeconds,
    });

    setFields(BLANK_FIELDS);
    setDate(defaultDatetimeLocal());
    setOpen(false);
    onSaved();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="manual-entry-toggle">
        + Add manual entry
      </button>
    );
  }

  return (
    <form className="manual-entry-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="manual-entry-grid">
        <label>
          Date/time
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Distance (mi)
          <input
            type="number"
            step="0.1"
            min={0}
            value={fields.distanceMiles}
            onChange={(e) => updateField('distanceMiles', e.target.value)}
            required
          />
        </label>
        <label>
          Avg speed (mph)
          <input
            type="number"
            min={0}
            value={fields.avgSpeedMph}
            onChange={(e) => updateField('avgSpeedMph', e.target.value)}
          />
        </label>
        <label>
          Max speed (mph)
          <input
            type="number"
            min={0}
            value={fields.maxSpeedMph}
            onChange={(e) => updateField('maxSpeedMph', e.target.value)}
          />
        </label>
        <label>
          Duration (h)
          <input
            type="number"
            min={0}
            value={fields.durationHours}
            onChange={(e) => updateField('durationHours', e.target.value)}
          />
        </label>
        <label>
          Duration (m)
          <input
            type="number"
            min={0}
            max={59}
            value={fields.durationMinutes}
            onChange={(e) => updateField('durationMinutes', e.target.value)}
          />
        </label>
      </div>
      <div className="manual-entry-buttons">
        <button type="submit">Save entry</button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
