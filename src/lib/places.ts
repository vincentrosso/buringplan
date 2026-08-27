export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

let sharedService: google.maps.places.PlacesService | null = null;

function getService(): google.maps.places.PlacesService {
  if (!sharedService) {
    // PlacesService requires a Map or a DOM node it never actually renders into.
    sharedService = new google.maps.places.PlacesService(document.createElement('div'));
  }
  return sharedService;
}

function toPlaceResult(place: google.maps.places.PlaceResult): PlaceResult | null {
  const location = place.geometry?.location;
  if (!place.place_id || !location) return null;
  return {
    placeId: place.place_id,
    name: place.name ?? 'Unnamed',
    address: place.vicinity ?? place.formatted_address ?? '',
    lat: location.lat(),
    lng: location.lng(),
  };
}

export function searchCampgroundsNearby(
  location: { lat: number; lng: number },
  radiusMeters: number,
): Promise<PlaceResult[]> {
  return new Promise((resolve, reject) => {
    getService().nearbySearch(
      { location, radius: radiusMeters, type: 'campground' },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
          if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) return resolve([]);
          return reject(new Error(`Places nearbySearch failed: ${status}`));
        }
        resolve(results.map(toPlaceResult).filter((r): r is PlaceResult => r !== null));
      },
    );
  });
}

export function searchWalmartNearby(
  location: { lat: number; lng: number },
  radiusMeters: number,
): Promise<PlaceResult[]> {
  return new Promise((resolve, reject) => {
    getService().textSearch(
      { query: 'Walmart', location, radius: radiusMeters },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
          if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) return resolve([]);
          return reject(new Error(`Places textSearch failed: ${status}`));
        }
        resolve(results.map(toPlaceResult).filter((r): r is PlaceResult => r !== null));
      },
    );
  });
}
