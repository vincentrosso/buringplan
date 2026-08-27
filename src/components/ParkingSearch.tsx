import { useState } from 'react';
import { haversineMeters, metersToMiles } from '../lib/geo';
import { searchCampgroundsNearby, searchWalmartNearby, type PlaceResult } from '../lib/places';
import { useTripStore } from '../store/tripStore';
import type { ParkingSpot } from '../types';

const DEFAULT_RADIUS_MILES = 15;
const METERS_PER_MILE = 1609.344;

interface SearchHit extends PlaceResult {
  category: ParkingSpot['category'];
  distanceMiles: number;
}

export default function ParkingSearch() {
  const waypoints = useTripStore((s) => s.waypoints);
  const parkingSpots = useTripStore((s) => s.parkingSpots);
  const addParkingSpot = useTripStore((s) => s.addParkingSpot);
  const removeParkingSpot = useTripStore((s) => s.removeParkingSpot);
  const updateParkingSpotNotes = useTripStore((s) => s.updateParkingSpotNotes);

  const [waypointId, setWaypointId] = useState(waypoints[0]?.id ?? '');
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const waypoint = waypoints.find((w) => w.id === waypointId);
  const savedForWaypoint = parkingSpots.filter((p) => p.waypointId === waypointId);
  const savedPlaceIds = new Set(savedForWaypoint.map((p) => p.placeId));

  async function handleSearch() {
    if (!waypoint) return;
    setStatus('loading');
    try {
      const center = { lat: waypoint.lat, lng: waypoint.lng };
      const radiusMeters = radiusMiles * METERS_PER_MILE;
      const [campgrounds, walmarts] = await Promise.all([
        searchCampgroundsNearby(center, radiusMeters),
        searchWalmartNearby(center, radiusMeters),
      ]);

      const toHit = (r: PlaceResult, category: ParkingSpot['category']): SearchHit => ({
        ...r,
        category,
        distanceMiles: metersToMiles(haversineMeters(center, { lat: r.lat, lng: r.lng })),
      });

      const combined = [
        ...campgrounds.map((r) => toHit(r, 'campground')),
        ...walmarts.map((r) => toHit(r, 'walmart')),
      ].sort((a, b) => a.distanceMiles - b.distanceMiles);

      setHits(combined);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  function handleSave(hit: SearchHit) {
    if (!waypoint) return;
    addParkingSpot({
      waypointId: waypoint.id,
      placeId: hit.placeId,
      name: hit.name,
      address: hit.address,
      category: hit.category,
      lat: hit.lat,
      lng: hit.lng,
      notes: '',
    });
  }

  return (
    <div className="parking-search">
      <div className="parking-search-controls">
        <select value={waypointId} onChange={(e) => setWaypointId(e.target.value)}>
          {waypoints.map((wp) => (
            <option key={wp.id} value={wp.id}>
              {wp.name}
            </option>
          ))}
        </select>
        <label>
          Radius (mi){' '}
          <input
            type="number"
            min={1}
            max={100}
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
          />
        </label>
        <button type="button" onClick={handleSearch} disabled={!waypoint}>
          Search campgrounds &amp; Walmart nearby
        </button>
      </div>

      {status === 'error' && <p className="parking-search-error">Search failed. Check the API key/quota.</p>}

      {hits.length > 0 && (
        <ul className="parking-hit-list">
          {hits.map((hit) => (
            <li key={hit.placeId} className={`parking-hit parking-hit--${hit.category}`}>
              <div>
                <strong>{hit.name}</strong> <span className="parking-hit-category">{hit.category}</span>
                <div className="parking-hit-address">{hit.address}</div>
                <div className="parking-hit-distance">{hit.distanceMiles.toFixed(1)} mi away</div>
              </div>
              <button
                type="button"
                onClick={() => handleSave(hit)}
                disabled={savedPlaceIds.has(hit.placeId)}
              >
                {savedPlaceIds.has(hit.placeId) ? 'Saved' : 'Save to trip'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {savedForWaypoint.length > 0 && (
        <div className="saved-parking-spots">
          <h4>Saved for {waypoint?.name}</h4>
          <ul>
            {savedForWaypoint.map((spot) => (
              <li key={spot.id} className={`parking-hit parking-hit--${spot.category}`}>
                <div>
                  <strong>{spot.name}</strong> <span className="parking-hit-category">{spot.category}</span>
                  <div className="parking-hit-address">{spot.address}</div>
                  <input
                    type="text"
                    placeholder="e.g. confirmed overnight OK by phone"
                    value={spot.notes}
                    onChange={(e) => updateParkingSpotNotes(spot.id, e.target.value)}
                  />
                </div>
                <button type="button" onClick={() => removeParkingSpot(spot.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
