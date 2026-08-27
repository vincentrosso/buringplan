import MapView from '../components/MapView';
import ParkingSearch from '../components/ParkingSearch';
import { useTripStore } from '../store/tripStore';

export default function ParkingPage() {
  const waypoints = useTripStore((s) => s.waypoints);
  const parkingSpots = useTripStore((s) => s.parkingSpots);

  return (
    <div className="page parking-page">
      <div className="parking-page-map">
        <MapView waypoints={waypoints} parkingSpots={parkingSpots} height="100%" />
      </div>
      <div className="parking-page-sidebar">
        <ParkingSearch />
      </div>
    </div>
  );
}
