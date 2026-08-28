import { useMemo, useRef, useState } from 'react';
import MapView from '../components/MapView';
import RouteStats from '../components/RouteStats';
import SuggestedStops from '../components/SuggestedStops';
import TripDataTransfer from '../components/TripDataTransfer';
import WaypointForm from '../components/WaypointForm';
import WaypointList from '../components/WaypointList';
import { computeSuggestedStops, planSuggestedStopInsertions, suggestedStopToWaypoint } from '../lib/suggestedStops';
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
  // Tracks which recalcSignal we've already auto-inserted stops for, so a fresh
  // route load (baseline mount, or a Recalc click bumping recalcSignal) fills in
  // suggested stops exactly once — not on every subsequent waypoints change,
  // including the ones the insertion itself causes.
  const lastAutoInsertSignal = useRef<number | null>(null);

  const suggestedStops = useMemo(
    () => computeSuggestedStops(legs, stopIntervalHours, stopIntervalMiles),
    [legs, stopIntervalHours, stopIntervalMiles],
  );

  function handleLegsLoaded(newLegs: RouteLeg[]) {
    setLegs(newLegs);
    if (lastAutoInsertSignal.current === recalcSignal) return;
    lastAutoInsertSignal.current = recalcSignal;

    const insertions = planSuggestedStopInsertions(newLegs, stopIntervalHours, stopIntervalMiles);
    insertions.forEach(({ index, waypoint }) => insertWaypointAt(index, waypoint));
  }

  function handleClear() {
    clearTrip();
    setLegs([]);
    lastAutoInsertSignal.current = null;
    setConfirmingClear(false);
  }

  function handleImported() {
    setLegs([]);
    lastAutoInsertSignal.current = null;
    setRecalcSignal((n) => n + 1);
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
        <TripDataTransfer onImported={handleImported} />
        <WaypointForm />
        <WaypointList />
        <RouteStats onLegsLoaded={handleLegsLoaded} recalcSignal={recalcSignal} />
        <SuggestedStops stops={suggestedStops} hasLegs={legs.length > 0} />
      </div>
    </div>
  );
}
