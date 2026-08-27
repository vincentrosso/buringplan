import { useMemo, useState } from 'react';
import MapView from '../components/MapView';
import RouteStats from '../components/RouteStats';
import SuggestedStops from '../components/SuggestedStops';
import WaypointForm from '../components/WaypointForm';
import WaypointList from '../components/WaypointList';
import { computeSuggestedStops } from '../lib/suggestedStops';
import { useTripStore } from '../store/tripStore';
import type { RouteLeg } from '../types';

export default function PlanPage() {
  const waypoints = useTripStore((s) => s.waypoints);
  const stopIntervalHours = useTripStore((s) => s.stopIntervalHours);
  const stopIntervalMiles = useTripStore((s) => s.stopIntervalMiles);
  const [legs, setLegs] = useState<RouteLeg[]>([]);

  const suggestedStops = useMemo(
    () => computeSuggestedStops(legs, stopIntervalHours, stopIntervalMiles),
    [legs, stopIntervalHours, stopIntervalMiles],
  );

  return (
    <div className="page plan-page">
      <div className="plan-page-map">
        <MapView
          waypoints={waypoints}
          routeLegs={legs}
          suggestedStops={suggestedStops}
          height="100%"
        />
      </div>
      <div className="plan-page-sidebar">
        <WaypointForm />
        <WaypointList />
        <RouteStats onLegsLoaded={setLegs} />
        <SuggestedStops stops={suggestedStops} hasLegs={legs.length > 0} />
      </div>
    </div>
  );
}
