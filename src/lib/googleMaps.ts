import { useJsApiLoader } from '@react-google-maps/api';

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

// Keep this list identical across every useJsApiLoader call in the app —
// the loader errors if two components request different library sets.
export const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

export function useGoogleMaps() {
  return useJsApiLoader({
    id: 'buringplan-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
}
