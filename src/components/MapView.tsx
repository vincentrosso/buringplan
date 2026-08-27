import { GoogleMap, InfoWindow, Marker, Polyline } from '@react-google-maps/api';
import { useMemo, useState } from 'react';
import type { ParkingSpot, RouteLeg, SuggestedStop, Waypoint } from '../types';

const CONTAINER_STYLE = { width: '100%', height: '100%' };

const DEFAULT_CENTER = { lat: 42, lng: -100 };

type SelectedMarker =
  | { type: 'waypoint'; id: string }
  | { type: 'parking'; id: string }
  | { type: 'stop'; id: string };

interface MapViewProps {
  waypoints: Waypoint[];
  parkingSpots?: ParkingSpot[];
  routeLegs?: RouteLeg[];
  suggestedStops?: SuggestedStop[];
  currentPosition?: { lat: number; lng: number } | null;
  height?: string;
  onRemoveWaypoint?: (id: string) => void;
  onRemoveParkingSpot?: (id: string) => void;
  onAddSuggestedStopAsWaypoint?: (stop: SuggestedStop) => void;
}

export default function MapView({
  waypoints,
  parkingSpots = [],
  routeLegs = [],
  suggestedStops = [],
  currentPosition = null,
  height = '400px',
  onRemoveWaypoint,
  onRemoveParkingSpot,
  onAddSuggestedStopAsWaypoint,
}: MapViewProps) {
  const [selected, setSelected] = useState<SelectedMarker | null>(null);

  const routePaths = useMemo(() => {
    if (typeof google === 'undefined' || !google.maps.geometry) return [];
    return routeLegs
      .filter((leg) => leg.polyline)
      .map((leg) => google.maps.geometry.encoding.decodePath(leg.polyline));
  }, [routeLegs]);

  const center = waypoints[0] ?? currentPosition ?? DEFAULT_CENTER;

  const selectedWaypoint =
    selected?.type === 'waypoint' ? waypoints.find((w) => w.id === selected.id) : undefined;
  const selectedParkingSpot =
    selected?.type === 'parking' ? parkingSpots.find((p) => p.id === selected.id) : undefined;
  const selectedStop =
    selected?.type === 'stop' ? suggestedStops.find((s) => s.id === selected.id) : undefined;

  return (
    <div style={{ width: '100%', height }}>
      <GoogleMap mapContainerStyle={CONTAINER_STYLE} center={center} zoom={waypoints.length > 1 ? 5 : 8}>
        {waypoints.map((wp, i) => (
          <Marker
            key={wp.id}
            position={{ lat: wp.lat, lng: wp.lng }}
            label={`${i + 1}`}
            title={wp.name}
            onClick={() => setSelected({ type: 'waypoint', id: wp.id })}
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
            onClick={() => setSelected({ type: 'parking', id: spot.id })}
          />
        ))}

        {suggestedStops.map((stop) => (
          <Marker
            key={stop.id}
            position={{ lat: stop.lat, lng: stop.lng }}
            title={`Suggested rest stop — ~${stop.milesIntoLeg.toFixed(0)} mi / ${stop.hoursIntoLeg.toFixed(1)} hrs into leg`}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
            }}
            onClick={() => setSelected({ type: 'stop', id: stop.id })}
          />
        ))}

        {routePaths.map((path, i) => (
          <Polyline key={i} path={path} options={{ strokeColor: '#c1440e', strokeWeight: 4 }} />
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

        {selectedWaypoint && (
          <InfoWindow
            position={{ lat: selectedWaypoint.lat, lng: selectedWaypoint.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="map-info-window">
              <strong>{selectedWaypoint.name}</strong>
              {selectedWaypoint.address && <div>{selectedWaypoint.address}</div>}
              {selectedWaypoint.notes && <div className="map-info-notes">{selectedWaypoint.notes}</div>}
              {onRemoveWaypoint && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveWaypoint(selectedWaypoint.id);
                    setSelected(null);
                  }}
                >
                  Remove stop
                </button>
              )}
            </div>
          </InfoWindow>
        )}

        {selectedParkingSpot && (
          <InfoWindow
            position={{ lat: selectedParkingSpot.lat, lng: selectedParkingSpot.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="map-info-window">
              <strong>{selectedParkingSpot.name}</strong>
              <div className="map-info-category">{selectedParkingSpot.category}</div>
              {selectedParkingSpot.address && <div>{selectedParkingSpot.address}</div>}
              {selectedParkingSpot.notes && <div className="map-info-notes">{selectedParkingSpot.notes}</div>}
              {onRemoveParkingSpot && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveParkingSpot(selectedParkingSpot.id);
                    setSelected(null);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </InfoWindow>
        )}

        {selectedStop && (
          <InfoWindow position={{ lat: selectedStop.lat, lng: selectedStop.lng }} onCloseClick={() => setSelected(null)}>
            <div className="map-info-window">
              <strong>Suggested rest stop</strong>
              <div>
                ~{selectedStop.milesIntoLeg.toFixed(0)} mi / {selectedStop.hoursIntoLeg.toFixed(1)} hrs into that leg
              </div>
              {onAddSuggestedStopAsWaypoint && (
                <button
                  type="button"
                  onClick={() => {
                    onAddSuggestedStopAsWaypoint(selectedStop);
                    setSelected(null);
                  }}
                >
                  Add as waypoint
                </button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
