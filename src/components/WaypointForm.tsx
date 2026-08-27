import { Autocomplete } from '@react-google-maps/api';
import { useRef, useState } from 'react';
import { useTripStore } from '../store/tripStore';

export default function WaypointForm() {
  const addWaypoint = useTripStore((s) => s.addWaypoint);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState('');

  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    addWaypoint({
      name: place.name ?? place.formatted_address ?? 'Untitled stop',
      address: place.formatted_address ?? '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      notes: '',
    });
    setInputValue('');
  }

  return (
    <Autocomplete
      onLoad={(autocomplete) => {
        autocompleteRef.current = autocomplete;
      }}
      onPlaceChanged={handlePlaceChanged}
    >
      <input
        type="text"
        placeholder="Add a stop (city, campground, address...)"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="waypoint-input"
      />
    </Autocomplete>
  );
}
