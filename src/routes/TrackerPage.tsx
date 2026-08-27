import { useState } from 'react';
import MapView from '../components/MapView';
import TrackerControls from '../components/TrackerControls';
import TripLogTable from '../components/TripLogTable';
import { useTripStore } from '../store/tripStore';

export default function TrackerPage() {
  const waypoints = useTripStore((s) => s.waypoints);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="page tracker-page">
      <div className="tracker-page-map">
        <MapView waypoints={waypoints} currentPosition={currentPosition} height="100%" />
      </div>
      <div className="tracker-page-sidebar">
        <TrackerControls
          onPositionChange={setCurrentPosition}
          onSessionSaved={() => setRefreshSignal((n) => n + 1)}
        />
        <TripLogTable refreshSignal={refreshSignal} />
      </div>
    </div>
  );
}
