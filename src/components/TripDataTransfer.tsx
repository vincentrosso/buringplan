import { useState } from 'react';
import { exportTripSnapshot, importTripSnapshot } from '../lib/tripSnapshot';

interface TripDataTransferProps {
  /** Called after a successful import so the page can refresh derived state. */
  onImported?: () => void;
}

type Mode = 'idle' | 'export' | 'import';

export default function TripDataTransfer({ onImported }: TripDataTransferProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function openExport() {
    setError(null);
    setStatus(null);
    setCopied(false);
    setExportText(await exportTripSnapshot());
    setMode('export');
  }

  function openImport() {
    setError(null);
    setStatus(null);
    setImportText('');
    setMode('import');
  }

  async function copyExport() {
    try {
      await navigator.clipboard?.writeText(exportText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function runImport() {
    setError(null);
    try {
      const snapshot = await importTripSnapshot(importText);
      setStatus(
        `Loaded ${snapshot.waypoints.length} stops, ${snapshot.parkingSpots.length} parking spots, ` +
          `${snapshot.daySummaries.length} trip-log entries.`,
      );
      setMode('idle');
      onImported?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    }
  }

  return (
    <div className="trip-data-transfer">
      {mode === 'idle' && (
        <div className="trip-data-transfer-buttons">
          <button type="button" onClick={() => void openExport()}>
            Export trip data
          </button>
          <button type="button" onClick={openImport}>
            Import trip data
          </button>
        </div>
      )}

      {status && <p className="trip-data-transfer-status">{status}</p>}

      {mode === 'export' && (
        <div className="trip-data-transfer-panel">
          <p>Copy this text and keep it somewhere safe. Paste it back through Import to restore the trip.</p>
          <textarea
            className="trip-data-transfer-text"
            readOnly
            rows={8}
            value={exportText}
            aria-label="Exported trip data"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="trip-data-transfer-buttons">
            <button type="button" onClick={() => void copyExport()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" onClick={() => setMode('idle')}>
              Done
            </button>
          </div>
        </div>
      )}

      {mode === 'import' && (
        <div className="trip-data-transfer-panel">
          <p>
            Paste exported trip data below. Loading it <strong>replaces</strong> your current stops,
            parking spots, and trip log.
          </p>
          <textarea
            className="trip-data-transfer-text"
            rows={8}
            value={importText}
            placeholder='{ "app": "buringplan", ... }'
            aria-label="Trip data to import"
            onChange={(e) => setImportText(e.target.value)}
          />
          {error && <p className="trip-data-transfer-error">{error}</p>}
          <div className="trip-data-transfer-buttons">
            <button type="button" onClick={() => void runImport()} disabled={!importText.trim()}>
              Load trip data
            </button>
            <button type="button" onClick={() => setMode('idle')}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
