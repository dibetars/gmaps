import type { Geofence, Place } from '../types';

const XANO_BASE_URL = 'https://api-server.krontiva.africa/api:GEtwoG7z';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

class XanoError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'XanoError';
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const xanoService = {
  async getGeofences(): Promise<Geofence[]> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/geofences`);
      if (!response.ok) {
        throw new XanoError('Failed to fetch geofences', response.status);
      }
      return response.json();
    } catch (error) {
      if (error instanceof XanoError) {
        throw error;
      }
      throw new XanoError('Network error while fetching geofences');
    }
  },

  async saveGeofence(geofence: Geofence): Promise<Geofence> {
    try {
      // Convert coordinates to the format Xano expects
      const coordinates = geofence.coordinates.map(coord => ({
        lat: coord instanceof google.maps.LatLng ? coord.lat() : coord.lat,
        lng: coord instanceof google.maps.LatLng ? coord.lng() : coord.lng
      }));

      const response = await fetch(`${XANO_BASE_URL}/geofences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...geofence,
          coordinates
        }),
      });

      if (!response.ok) {
        throw new XanoError('Failed to save geofence', response.status);
      }

      return response.json();
    } catch (error) {
      if (error instanceof XanoError) {
        throw error;
      }
      throw new XanoError('Network error while saving geofence');
    }
  },

  async savePlaces(geofenceId: string, places: Place[], onProgress?: (current: number) => void): Promise<Place[]> {
    const updatePlaceWithRetry = async (place: Place, retryCount = 0): Promise<Place> => {
      try {
        console.log(`Saving place: ${place.name}`);
        const response = await fetch(`${XANO_BASE_URL}/places/${geofenceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...place,
            geofence_id: geofenceId
          }),
        });

        if (!response.ok) {
          throw new XanoError('Failed to save place', response.status);
        }

        const savedPlace = await response.json();
        console.log(`Successfully saved place: ${place.name}`);
        return savedPlace;
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying place update for ${place.name}, attempt ${retryCount + 1}`);
          await delay(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
          return updatePlaceWithRetry(place, retryCount + 1);
        }
        throw error;
      }
    };

    try {
      console.log(`Starting sequential update of ${places.length} places`);
      const updatedPlaces: Place[] = [];
      
      // Process places one by one
      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        console.log(`Processing place ${i + 1} of ${places.length}: ${place.name}`);
        
        try {
          const updatedPlace = await updatePlaceWithRetry(place);
          updatedPlaces.push(updatedPlace);
          
          // Update progress
          onProgress?.(i + 1);
          
          // Add a small delay between places to prevent rate limiting
          if (i < places.length - 1) {
            await delay(500);
          }
        } catch (error) {
          console.error(`Failed to save place ${place.name}:`, error);
          // Continue with next place even if one fails
          continue;
        }
      }

      console.log(`Completed updating places. Successfully saved ${updatedPlaces.length} of ${places.length} places`);
      return updatedPlaces;
    } catch (error) {
      if (error instanceof XanoError) {
        throw error;
      }
      throw new XanoError('Network error while saving places');
    }
  },

  async updatePlace(place: Place): Promise<Place> {
    const updateWithRetry = async (retryCount = 0): Promise<Place> => {
      try {
        const response = await fetch(`${XANO_BASE_URL}/places/${place.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(place),
        });

        if (!response.ok) {
          throw new XanoError('Failed to update place', response.status);
        }

        return response.json();
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying place update for ${place.name}, attempt ${retryCount + 1}`);
          await delay(RETRY_DELAY * (retryCount + 1));
          return updateWithRetry(retryCount + 1);
        }
        throw error;
      }
    };

    return updateWithRetry();
  },

  async getPlacesInGeofence(geofenceId: string): Promise<Place[]> {
    try {
      const url = geofenceId 
        ? `${XANO_BASE_URL}/places?geofence_id=${geofenceId}`
        : `${XANO_BASE_URL}/places`;
        
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new XanoError('Failed to fetch places', response.status);
      }

      const places = await response.json();
      return places;
    } catch (error) {
      if (error instanceof XanoError) {
        throw error;
      }
      throw new XanoError('Network error while fetching places');
    }
  },

  async savePlace(place: Place): Promise<Place> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/places/${place.geofences_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(place),
      });

      if (!response.ok) {
        throw new XanoError('Failed to save place', response.status);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof XanoError) {
        throw error;
      }
      throw new XanoError('Network error while saving place');
    }
  },

  async deleteGeofence(geofenceId: string): Promise<void> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/geofences/${geofenceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete geofence');
      }
    } catch (error) {
      console.error('Error deleting geofence:', error);
      throw error;
    }
  },

  async deletePlace(placeId: string): Promise<void> {
    try {
      const response = await fetch(`${XANO_BASE_URL}/places/${placeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete place');
      }
    } catch (error) {
      console.error('Error deleting place:', error);
      throw error;
    }
  },
}; 