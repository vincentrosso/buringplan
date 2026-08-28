import { useState, type FormEvent } from 'react';

export interface TripEntryValues {
  label: string;
  startTime: number;
  distanceMiles: number;
  avgSpeedMph: number;
  maxSpeedMph: number;
  durationSeconds: number;
}

interface TripEntryFormProps {
  /** Prefill values when editing an existing entry; omit for a fresh entry. */
  initial?: Partial<TripEntryValues>;
  submitLabel: string;
  onSubmit: (values: TripEntryValues) => void | Promise<void>;
  onCancel: () => void;
}

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TripEntryForm({ initial, submitLabel, onSubmit, onCancel }: TripEntryFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [date, setDate] = useState(toDatetimeLocal(initial?.startTime ?? Date.now()));
  const [distanceMiles, setDistanceMiles] = useState(
    initial?.distanceMiles != null ? String(initial.distanceMiles) : '',
  );
  const [maxSpeedMph, setMaxSpeedMph] = useState(
    initial?.maxSpeedMph != null ? String(Math.round(initial.maxSpeedMph)) : '',
  );
  const initialDuration = initial?.durationSeconds;
  const [durationHours, setDurationHours] = useState(
    initialDuration != null ? String(Math.floor(initialDuration / 3600)) : '',
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialDuration != null ? String(Math.round((initialDuration % 3600) / 60)) : '',
  );

  const distanceNum = Number(distanceMiles) || 0;
  const durationSeconds =
    (Number(durationHours) || 0) * 3600 + (Number(durationMinutes) || 0) * 60;
  const avgSpeedMph = durationSeconds > 0 ? distanceNum / (durationSeconds / 3600) : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      label: label.trim(),
      startTime: new Date(date).getTime(),
      distanceMiles: distanceNum,
      avgSpeedMph,
      maxSpeedMph: Number(maxSpeedMph) || 0,
      durationSeconds,
    });
  }

  return (
    <form className="trip-entry-form" onSubmit={(e) => void handleSubmit(e)}>
      <label>
        Label
        <input
          type="text"
          value={label}
          placeholder="e.g. Apple Valley → Denver"
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      <label>
        Date/time
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>
      <label>
        Distance (mi)
        <input
          type="number"
          step="0.1"
          min={0}
          value={distanceMiles}
          onChange={(e) => setDistanceMiles(e.target.value)}
          required
        />
      </label>
      <div className="trip-entry-form-row">
        <label>
          Duration (h)
          <input
            type="number"
            min={0}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
          />
        </label>
        <label>
          Duration (m)
          <input
            type="number"
            min={0}
            max={59}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
        </label>
      </div>
      <label>
        Max speed (mph)
        <input
          type="number"
          min={0}
          value={maxSpeedMph}
          onChange={(e) => setMaxSpeedMph(e.target.value)}
        />
      </label>
      <p className="trip-entry-form-derived">
        Avg speed: {avgSpeedMph.toFixed(0)} mph <span>(distance ÷ duration)</span>
      </p>
      <div className="trip-entry-form-buttons">
        <button type="submit">{submitLabel}</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
