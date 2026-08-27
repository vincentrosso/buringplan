import { useState } from 'react';
import MapView from '../components/MapView';
import RouteStats from '../components/RouteStats';
import WaypointForm from '../components/WaypointForm';
import WaypointList from '../components/WaypointList';
import { useTripStore } from '../store/tripStore';
import type { RouteLeg } from '../types';

export default function PlanPage() {
  const waypoints = useTripStore((s) => s.waypoints);
  const [legs, setLegs] = useState<RouteLeg[]>([]);

  return (
    <div className="page plan-page">
      <div className="plan-page-map">
        <MapView waypoints={waypoints} routeLegs={legs} height="100%" />
      </div>
      <div className="plan-page-sidebar">
        <WaypointForm />
        <WaypointList />
        <RouteStats onLegsLoaded={setLegs} />
      </div>
    </div>
  );
}
