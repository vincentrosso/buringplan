import { useCallback, useEffect, useState } from 'react';
import { deleteDaySummary, getAllDaySummaries, updateDaySummary } from '../store/tripLog';
import type { DaySummary } from '../types';
import ManualLogEntry from './ManualLogEntry';
import TripEntryForm, { type TripEntryValues } from './TripEntryForm';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function buildTripLogMailto(summaries: DaySummary[]): string {
  const totalMiles = summaries.reduce((sum, s) => sum + s.distanceMiles, 0);
  const blocks = summaries.map((s) => {
    const when = new Date(s.startTime).toLocaleString();
    const head = s.label ? `${s.label} — ${when}` : when;
    return `${head}\n  ${s.distanceMiles.toFixed(1)} mi · ${formatDuration(s.durationSeconds)} · avg ${s.avgSpeedMph.toFixed(0)} mph · max ${s.maxSpeedMph.toFixed(0)} mph`;
  });
  const body = [
    `Trip log — ${summaries.length} session${summaries.length === 1 ? '' : 's'}, ${totalMiles.toFixed(0)} mi total`,
    '',
    blocks.join('\n\n'),
  ].join('\n');
  return `mailto:?subject=${encodeURIComponent('Trip log')}&body=${encodeURIComponent(body)}`;
}

interface TripLogTableProps {
  refreshSignal: number;
}

export default function TripLogTable({ refreshSignal }: TripLogTableProps) {
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void getAllDaySummaries().then(setSummaries);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  async function saveEdit(tripId: string, values: TripEntryValues) {
    await updateDaySummary(tripId, {
      label: values.label || undefined,
      startTime: values.startTime,
      endTime: values.startTime + values.durationSeconds * 1000,
      distanceMiles: values.distanceMiles,
      avgSpeedMph: values.avgSpeedMph,
      maxSpeedMph: values.maxSpeedMph,
      durationSeconds: values.durationSeconds,
    });
    setEditingId(null);
    refresh();
  }

  async function handleDelete(tripId: string) {
    await deleteDaySummary(tripId);
    setConfirmingDeleteId(null);
    refresh();
  }

  const totalMiles = summaries.reduce((sum, s) => sum + s.distanceMiles, 0);

  return (
    <div className="trip-log-table">
      <div className="trip-log-header">
        <h3>Trip log ({totalMiles.toFixed(0)} mi total)</h3>
        {summaries.length > 0 && (
          <a className="trip-log-email" href={buildTripLogMailto(summaries)}>
            Email log
          </a>
        )}
      </div>

      <ManualLogEntry onSaved={refresh} />

      {summaries.length === 0 ? (
        <p>No tracked sessions yet. Start tracking or add a manual entry.</p>
      ) : (
        <ul className="trip-log-list">
          {summaries.map((s) => (
            <li key={s.tripId} className="trip-log-card">
              {editingId === s.tripId ? (
                <TripEntryForm
                  initial={{
                    label: s.label ?? '',
                    startTime: s.startTime,
                    distanceMiles: s.distanceMiles,
                    avgSpeedMph: s.avgSpeedMph,
                    maxSpeedMph: s.maxSpeedMph,
                    durationSeconds: s.durationSeconds,
                  }}
                  submitLabel="Save"
                  onSubmit={(values) => saveEdit(s.tripId, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="trip-log-card-head">
                    {s.label && <span className="trip-log-card-label">{s.label}</span>}
                    <span className="trip-log-card-date">{new Date(s.startTime).toLocaleString()}</span>
                  </div>
                  <div className="trip-log-card-stats">
                    <span>{s.distanceMiles.toFixed(1)} mi</span>
                    <span>{formatDuration(s.durationSeconds)}</span>
                    <span>avg {s.avgSpeedMph.toFixed(0)} mph</span>
                    <span>max {s.maxSpeedMph.toFixed(0)} mph</span>
                  </div>
                  <div className="trip-log-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDeleteId(null);
                        setEditingId(s.tripId);
                      }}
                    >
                      Edit
                    </button>
                    {confirmingDeleteId === s.tripId ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleDelete(s.tripId)}
                          className="trip-log-delete-confirm"
                        >
                          Confirm?
                        </button>
                        <button type="button" onClick={() => setConfirmingDeleteId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setConfirmingDeleteId(s.tripId);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
