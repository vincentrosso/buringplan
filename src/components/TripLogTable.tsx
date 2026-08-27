import { useEffect, useState } from 'react';
import {
  downloadTextFile,
  exportTripLogGpx,
  exportTripLogJson,
  getAllDaySummaries,
} from '../store/tripLog';
import type { DaySummary } from '../types';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

interface TripLogTableProps {
  refreshSignal: number;
}

export default function TripLogTable({ refreshSignal }: TripLogTableProps) {
  const [summaries, setSummaries] = useState<DaySummary[]>([]);

  useEffect(() => {
    void getAllDaySummaries().then(setSummaries);
  }, [refreshSignal]);

  async function handleExportJson() {
    downloadTextFile('buringplan-trip-log.json', await exportTripLogJson(), 'application/json');
  }

  async function handleExportGpx() {
    downloadTextFile('buringplan-trip-log.gpx', await exportTripLogGpx(), 'application/gpx+xml');
  }

  const totalMiles = summaries.reduce((sum, s) => sum + s.distanceMiles, 0);

  return (
    <div className="trip-log-table">
      <div className="trip-log-header">
        <h3>Trip log ({totalMiles.toFixed(0)} mi total)</h3>
        <div className="trip-log-export-buttons">
          <button type="button" onClick={() => void handleExportJson()} disabled={summaries.length === 0}>
            Export JSON
          </button>
          <button type="button" onClick={() => void handleExportGpx()} disabled={summaries.length === 0}>
            Export GPX
          </button>
        </div>
      </div>

      {summaries.length === 0 ? (
        <p>No tracked sessions yet. Start tracking to log a day's drive.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Distance</th>
              <th>Avg speed</th>
              <th>Max speed</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.tripId}>
                <td>{new Date(s.startTime).toLocaleString()}</td>
                <td>{s.distanceMiles.toFixed(1)} mi</td>
                <td>{s.avgSpeedMph.toFixed(0)} mph</td>
                <td>{s.maxSpeedMph.toFixed(0)} mph</td>
                <td>{formatDuration(s.durationSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
