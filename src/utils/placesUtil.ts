import type { Place } from '../types';

export const searchPlacesInGeofence = (
  map: google.maps.Map,
  bounds: google.maps.LatLngBounds
): Promise<Place[]> => {
  return new Promise((resolve, reject) => {
    const service = new google.maps.places.PlacesService(map);
    
    const request: google.maps.places.PlaceSearchRequest = {
      bounds,
      type: 'establishment'
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const places: Place[] = results.map(result => ({
          id: result.place_id!,
          place_id: result.place_id!,
          name: result.name!,
          address: result.vicinity!,
          location: {
            lat: result.geometry!.location!.lat(),
            lng: result.geometry!.location!.lng()
          },
          is_visited: false,
          date_visited: null,
          notes: '',
          geofence_id: ''
        }));
        resolve(places);
      } else {
        reject(new Error('Places search failed'));
      }
    });
  });
}; 