import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { useMemo } from 'react';
import type { ParkingSpot, RouteLeg, Waypoint } from '../types';

const CONTAINER_STYLE = { width: '100%', height: '100%' };

const DEFAULT_CENTER = { lat: 42, lng: -100 };

interface MapViewProps {
  waypoints: Waypoint[];
  parkingSpots?: ParkingSpot[];
  routeLegs?: RouteLeg[];
  currentPosition?: { lat: number; lng: number } | null;
  height?: string;
}

export default function MapView({
  waypoints,
  parkingSpots = [],
  routeLegs = [],
  currentPosition = null,
  height = '400px',
}: MapViewProps) {
  const routePaths = useMemo(() => {
    if (typeof google === 'undefined' || !google.maps.geometry) return [];
    return routeLegs
      .filter((leg) => leg.polyline)
      .map((leg) => google.maps.geometry.encoding.decodePath(leg.polyline));
  }, [routeLegs]);

  const center = waypoints[0] ?? currentPosition ?? DEFAULT_CENTER;

  return (
    <div style={{ width: '100%', height }}>
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={center}
        zoom={waypoints.length > 1 ? 5 : 8}
      >
        {waypoints.map((wp, i) => (
          <Marker
            key={wp.id}
            position={{ lat: wp.lat, lng: wp.lng }}
            label={`${i + 1}`}
            title={wp.name}
          />
        ))}

        {parkingSpots.map((spot) => (
          <Marker
            key={spot.id}
            position={{ lat: spot.lat, lng: spot.lng }}
            title={spot.name}
            icon={{
              url:
                spot.category === 'walmart'
                  ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                  : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
            }}
          />
        ))}

        {routePaths.map((path, i) => (
          <Polyline
            key={i}
            path={path}
            options={{ strokeColor: '#c1440e', strokeWeight: 4 }}
          />
        ))}

        {currentPosition && (
          <Marker
            position={currentPosition}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            }}
            title="Current position"
          />
        )}
      </GoogleMap>
    </div>
  );
}
