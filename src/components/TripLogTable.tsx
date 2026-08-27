import { useCallback, useEffect, useState } from 'react';
import { deleteDaySummary, getAllDaySummaries, updateDaySummary } from '../store/tripLog';
import type { DaySummary } from '../types';
import ManualLogEntry from './ManualLogEntry';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EditFields {
  startTime: string;
  distanceMiles: string;
  avgSpeedMph: string;
  maxSpeedMph: string;
  durationHours: string;
  durationMinutes: string;
}

interface TripLogTableProps {
  refreshSignal: number;
}

export default function TripLogTable({ refreshSignal }: TripLogTableProps) {
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditFields | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void getAllDaySummaries().then(setSummaries);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  function startEdit(summary: DaySummary) {
    setConfirmingDeleteId(null);
    setEditingId(summary.tripId);
    setEditFields({
      startTime: toDatetimeLocalValue(summary.startTime),
      distanceMiles: summary.distanceMiles.toFixed(1),
      avgSpeedMph: summary.avgSpeedMph.toFixed(0),
      maxSpeedMph: summary.maxSpeedMph.toFixed(0),
      durationHours: String(Math.floor(summary.durationSeconds / 3600)),
      durationMinutes: String(Math.round((summary.durationSeconds % 3600) / 60)),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFields(null);
  }

  async function saveEdit(tripId: string) {
    if (!editFields) return;
    const startTime = new Date(editFields.startTime).getTime();
    const durationSeconds =
      (Number(editFields.durationHours) || 0) * 3600 + (Number(editFields.durationMinutes) || 0) * 60;

    await updateDaySummary(tripId, {
      startTime,
      endTime: startTime + durationSeconds * 1000,
      distanceMiles: Number(editFields.distanceMiles) || 0,
      avgSpeedMph: Number(editFields.avgSpeedMph) || 0,
      maxSpeedMph: Number(editFields.maxSpeedMph) || 0,
      durationSeconds,
    });
    cancelEdit();
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
      </div>

      <ManualLogEntry onSaved={refresh} />

      {summaries.length === 0 ? (
        <p>No tracked sessions yet. Start tracking or add a manual entry.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Distance</th>
              <th>Avg speed</th>
              <th>Max speed</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const isEditing = editingId === s.tripId && editFields;
              return (
                <tr key={s.tripId}>
                  {isEditing && editFields ? (
                    <>
                      <td>
                        <input
                          type="datetime-local"
                          value={editFields.startTime}
                          onChange={(e) => setEditFields({ ...editFields, startTime: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={editFields.distanceMiles}
                          onChange={(e) => setEditFields({ ...editFields, distanceMiles: e.target.value })}
                          className="trip-log-edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editFields.avgSpeedMph}
                          onChange={(e) => setEditFields({ ...editFields, avgSpeedMph: e.target.value })}
                          className="trip-log-edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editFields.maxSpeedMph}
                          onChange={(e) => setEditFields({ ...editFields, maxSpeedMph: e.target.value })}
                          className="trip-log-edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={editFields.durationHours}
                          onChange={(e) => setEditFields({ ...editFields, durationHours: e.target.value })}
                          className="trip-log-edit-input trip-log-edit-input--narrow"
                        />
                        h{' '}
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={editFields.durationMinutes}
                          onChange={(e) => setEditFields({ ...editFields, durationMinutes: e.target.value })}
                          className="trip-log-edit-input trip-log-edit-input--narrow"
                        />
                        m
                      </td>
                      <td className="trip-log-actions">
                        <button type="button" onClick={() => void saveEdit(s.tripId)}>
                          Save
                        </button>
                        <button type="button" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{new Date(s.startTime).toLocaleString()}</td>
                      <td>{s.distanceMiles.toFixed(1)} mi</td>
                      <td>{s.avgSpeedMph.toFixed(0)} mph</td>
                      <td>{s.maxSpeedMph.toFixed(0)} mph</td>
                      <td>{formatDuration(s.durationSeconds)}</td>
                      <td className="trip-log-actions">
                        <button type="button" onClick={() => startEdit(s)}>
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
                          <button type="button" onClick={() => setConfirmingDeleteId(s.tripId)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
