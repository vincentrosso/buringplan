import { useTripStore } from '../store/tripStore';
import type { SuggestedStop } from '../types';

interface SuggestedStopsProps {
  stops: SuggestedStop[];
  hasLegs: boolean;
}

export default function SuggestedStops({ stops, hasLegs }: SuggestedStopsProps) {
  const stopIntervalHours = useTripStore((s) => s.stopIntervalHours);
  const stopIntervalMiles = useTripStore((s) => s.stopIntervalMiles);
  const setStopIntervalHours = useTripStore((s) => s.setStopIntervalHours);
  const setStopIntervalMiles = useTripStore((s) => s.setStopIntervalMiles);
  const insertWaypointAt = useTripStore((s) => s.insertWaypointAt);

  return (
    <div className="suggested-stops">
      <h4>Suggested rest stops</h4>
      <div className="stop-interval-controls">
        <label>
          Every
          <input
            type="number"
            min={1}
            max={24}
            value={stopIntervalHours}
            onChange={(e) => setStopIntervalHours(Number(e.target.value))}
          />
          hrs
        </label>
        <label>
          or
          <input
            type="number"
            min={10}
            max={1000}
            value={stopIntervalMiles}
            onChange={(e) => setStopIntervalMiles(Number(e.target.value))}
          />
          mi
        </label>
        <span className="stop-interval-hint">whichever comes first</span>
      </div>

      {!hasLegs ? (
        <p className="suggested-stops-empty">Add at least two stops to see suggested breaks.</p>
      ) : stops.length === 0 ? (
        <p className="suggested-stops-empty">No leg is long enough to need a suggested stop yet.</p>
      ) : (
        <ul className="suggested-stops-list">
          {stops.map((stop, i) => (
            <li key={stop.id}>
              <span>
                Stop {i + 1}: ~{stop.milesIntoLeg.toFixed(0)} mi / {stop.hoursIntoLeg.toFixed(1)} hrs into that leg
              </span>
              <button
                type="button"
                onClick={() =>
                  insertWaypointAt(stop.legIndex + 1, {
                    name: `Rest stop (~${stop.milesIntoLeg.toFixed(0)} mi)`,
                    address: '',
                    lat: stop.lat,
                    lng: stop.lng,
                    notes: 'Auto-suggested rest stop',
                  })
                }
              >
                Add as waypoint
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
