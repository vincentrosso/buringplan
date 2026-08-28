import { useState } from 'react';
import { newTripId, saveDaySummary } from '../store/tripLog';
import TripEntryForm, { type TripEntryValues } from './TripEntryForm';

interface ManualLogEntryProps {
  onSaved: () => void;
}

export default function ManualLogEntry({ onSaved }: ManualLogEntryProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: TripEntryValues) {
    await saveDaySummary({
      tripId: newTripId(),
      label: values.label || undefined,
      startTime: values.startTime,
      endTime: values.startTime + values.durationSeconds * 1000,
      distanceMiles: values.distanceMiles,
      avgSpeedMph: values.avgSpeedMph,
      maxSpeedMph: values.maxSpeedMph,
      durationSeconds: values.durationSeconds,
    });
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
    <TripEntryForm submitLabel="Save entry" onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
  );
}
