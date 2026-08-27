import { useMemo, useState } from 'react';
import MapView from '../components/MapView';
import RouteStats from '../components/RouteStats';
import SuggestedStops from '../components/SuggestedStops';
import WaypointForm from '../components/WaypointForm';
import WaypointList from '../components/WaypointList';
import { computeSuggestedStops, suggestedStopToWaypoint } from '../lib/suggestedStops';
import { useTripStore } from '../store/tripStore';
import type { RouteLeg } from '../types';

export default function PlanPage() {
  const waypoints = useTripStore((s) => s.waypoints);
  const stopIntervalHours = useTripStore((s) => s.stopIntervalHours);
  const stopIntervalMiles = useTripStore((s) => s.stopIntervalMiles);
  const removeWaypoint = useTripStore((s) => s.removeWaypoint);
  const insertWaypointAt = useTripStore((s) => s.insertWaypointAt);
  const clearTrip = useTripStore((s) => s.clearTrip);
  const [legs, setLegs] = useState<RouteLeg[]>([]);
  const [recalcSignal, setRecalcSignal] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const suggestedStops = useMemo(
    () => computeSuggestedStops(legs, stopIntervalHours, stopIntervalMiles),
    [legs, stopIntervalHours, stopIntervalMiles],
  );

  function handleClear() {
    clearTrip();
    setLegs([]);
    setConfirmingClear(false);
  }

  return (
    <div className="page plan-page">
      <div className="plan-page-map">
        <MapView
          waypoints={waypoints}
          routeLegs={legs}
          suggestedStops={suggestedStops}
          height="100%"
          onRemoveWaypoint={removeWaypoint}
          onAddSuggestedStopAsWaypoint={(stop) => insertWaypointAt(stop.legIndex + 1, suggestedStopToWaypoint(stop))}
        />
      </div>
      <div className="plan-page-sidebar">
        <div className="plan-toolbar">
          <button type="button" onClick={() => setRecalcSignal((n) => n + 1)}>
            Recalc route
          </button>
          {!confirmingClear ? (
            <button type="button" onClick={() => setConfirmingClear(true)} disabled={waypoints.length === 0}>
              Clear trip
            </button>
          ) : (
            <>
              <button type="button" onClick={handleClear} className="plan-toolbar-clear-confirm">
                Confirm clear?
              </button>
              <button type="button" onClick={() => setConfirmingClear(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
        <WaypointForm />
        <WaypointList />
        <RouteStats onLegsLoaded={setLegs} recalcSignal={recalcSignal} />
        <SuggestedStops stops={suggestedStops} hasLegs={legs.length > 0} />
      </div>
    </div>
  );
}
