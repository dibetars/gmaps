import { useState, useEffect, useRef } from 'react';
import type { Place, Geofence } from '../types';
import styles from './GeofencePlaces.module.css';
import { GeofenceEdit } from './GeofenceEdit';
import { useMapContext } from '../context/MapContext';
import { xanoService } from '../services/xanoService';

interface GeofencePlacesProps {
  geofence: Geofence;
  onClose: () => void;
  onUpdate: (updatedGeofence: Geofence) => void;
}

const PLACE_TAGS = [
  { id: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { id: 'cafe', label: 'Cafes', icon: '☕' },
  { id: 'bar', label: 'Bars', icon: '🍺' },
  { id: 'bakery', label: 'Bakeries', icon: '🥖' },
  { id: 'meal_delivery', label: 'Food Delivery', icon: '🛵' },
  { id: 'meal_takeaway', label: 'Takeout', icon: '🥡' },
  { id: 'food', label: 'Food Courts', icon: '🍱' },
  { id: 'ice_cream', label: 'Ice Cream', icon: '🍦' },
  { id: 'dessert', label: 'Desserts', icon: '🍰' },
  { id: 'pizza', label: 'Pizza', icon: '🍕' },
  { id: 'sushi', label: 'Sushi', icon: '🍣' },
  { id: 'fast_food', label: 'Fast Food', icon: '🍔' }
];

export const GeofencePlaces = ({ geofence, onClose, onUpdate }: GeofencePlacesProps) => {
  const { map } = useMapContext();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 300 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [savedPlacesPage, setSavedPlacesPage] = useState(1);
  const SAVED_PLACES_PER_PAGE = 5;

  // Focus map on the geofence when it's selected
  useEffect(() => {
    if (!map || !geofence) return;

    const bounds = new google.maps.LatLngBounds();
    geofence.coordinates.forEach(coord => {
      const latLng = new google.maps.LatLng(
        typeof coord.lat === 'function' ? coord.lat() : coord.lat,
        typeof coord.lng === 'function' ? coord.lng() : coord.lng
      );
      bounds.extend(latLng);
    });

    // Add some padding to the bounds
    const padding = {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50
    };

    map.fitBounds(bounds, padding);
  }, [map, geofence]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest(`.${styles.actions}`)) {
      return;
    }
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;

    // Keep the panel within the viewport
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      setPosition({
        x: Math.min(Math.max(0, newX), maxX),
        y: Math.min(Math.max(0, newY), maxY)
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true);
        setError(null);
        setPlaces([]); // Clear existing places when geofence changes
        
        if (!geofence.id) {
          throw new Error('Geofence ID is missing');
        }

        const fetchedPlaces = await xanoService.getPlacesInGeofence(geofence.id);
        setPlaces(fetchedPlaces);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch places');
        setPlaces([]); // Clear places on error
      } finally {
        setLoading(false);
      }
    };

      fetchPlaces();
  }, [geofence.id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (updatedGeofence: Geofence) => {
    try {
      const response = await fetch(`https://x8ki-letl-twmt.n7.xano.io/api:jMKnESWk/geofences/${geofence.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedGeofence.name,
          type: updatedGeofence.type,
          coordinates: updatedGeofence.coordinates,
          radius: updatedGeofence.radius
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update geofence');
      }

      const updatedData = await response.json();
      onUpdate(updatedData);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update geofence');
    }
  };

  const handleTagClick = async (tagId: string) => {
    if (!map) return;

    setIsSearching(true);
    setError(null);
    setCurrentPage(1); // Reset to first page on new search

    try {
      const service = new google.maps.places.PlacesService(map);
      const center = geofence.type === 'circle' 
        ? geofence.coordinates[0]
        : new google.maps.LatLng(
            geofence.coordinates.reduce((sum, coord) => sum + (coord instanceof google.maps.LatLng ? coord.lat() : coord.lat), 0) / geofence.coordinates.length,
            geofence.coordinates.reduce((sum, coord) => sum + (coord instanceof google.maps.LatLng ? coord.lng() : coord.lng), 0) / geofence.coordinates.length
          );

      const radius = geofence.type === 'circle' 
        ? geofence.radius || 0
        : google.maps.geometry.spherical.computeDistanceBetween(
            center,
            geofence.coordinates.reduce((furthest, coord) => {
              const distance = google.maps.geometry.spherical.computeDistanceBetween(center, coord);
              return distance > furthest.distance ? { coord, distance } : furthest;
            }, { coord: center, distance: 0 }).coord
          );

      const request = {
        location: center,
        radius: radius,
        type: tagId
      };

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // Process places one by one to get additional details
          const processPlaces = async () => {
            const newPlaces: Place[] = [];
            
            for (const place of results) {
              if (!place.place_id) continue;

              try {
                // Get additional details for each place
                const details = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
                  if (!place.place_id) {
                    reject(new Error('Place ID is missing'));
                    return;
                  }
                  service.getDetails(
                    { placeId: place.place_id, fields: ['website', 'formatted_phone_number'] },
                    (result, status) => {
                      if (status === google.maps.places.PlacesServiceStatus.OK && result) {
                        resolve(result);
                      } else {
                        reject(new Error('Failed to get place details'));
                      }
                    }
                  );
                });

                newPlaces.push({
                  id: place.place_id || '',
                  place_id: place.place_id || '',
                  name: place.name || '',
                  address: place.vicinity || '',
                  is_visited: false,
                  date_visited: null,
                  notes: '',
                  geofence_id: geofence.id || '',
                  location: {
                    lat: place.geometry?.location?.lat() || 0,
                    lng: place.geometry?.location?.lng() || 0
                  },
                  website: details.website || undefined,
                  phone_number: details.formatted_phone_number || undefined
                });
              } catch (error) {
                console.error('Error fetching details for place:', place.name, error);
                // Still add the place with basic info if details fetch fails
                newPlaces.push({
                  id: place.place_id || '',
                  place_id: place.place_id || '',
                  name: place.name || '',
                  address: place.vicinity || '',
                  is_visited: false,
                  date_visited: null,
                  notes: '',
                  geofence_id: geofence.id || '',
                  location: {
                    lat: place.geometry?.location?.lat() || 0,
                    lng: place.geometry?.location?.lng() || 0
                  }
                });
              }
            }

            // Filter out places that are already saved
            const existingPlaceIds = new Set(places.map(p => p.place_id));
            const filteredPlaces = newPlaces.filter(p => !existingPlaceIds.has(p.place_id));

            setSearchResults(filteredPlaces);
            setIsSearching(false);
          };

          processPlaces();
        } else {
          setError('No places found for this category');
          setIsSearching(false);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search places');
      setIsSearching(false);
    }
  };

  const handleSaveSelectedPlaces = async () => {
    if (selectedPlaces.size === 0) {
      setError('Please select at least one place to save');
      return;
    }

    if (!geofence.id) {
      setError('Geofence ID is missing');
      return;
    }

    try {
      setLoading(true);
      const placesToSave = searchResults.filter(place => selectedPlaces.has(place.place_id));

      // Use xanoService instead of direct fetch
      const savedPlaces = await xanoService.savePlaces(geofence.id, placesToSave, (current) => {
        // Optional: Add progress indicator if desired
        console.log(`Saving place ${current} of ${placesToSave.length}`);
      });

      setPlaces(prev => [...prev, ...savedPlaces]);
      setSearchResults([]);
      setSelectedPlaces(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save places');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSelection = (placeId: string) => {
    setSelectedPlaces(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(placeId)) {
        newSelected.delete(placeId);
      } else {
        newSelected.add(placeId);
      }
      return newSelected;
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const paginatedResults = searchResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(searchResults.length / ITEMS_PER_PAGE);

  const handleSavedPlacesPageChange = (newPage: number) => {
    setSavedPlacesPage(newPage);
  };

  const paginatedSavedPlaces = places.slice(
    (savedPlacesPage - 1) * SAVED_PLACES_PER_PAGE,
    savedPlacesPage * SAVED_PLACES_PER_PAGE
  );

  const totalSavedPlacesPages = Math.ceil(places.length / SAVED_PLACES_PER_PAGE);

  if (isEditing) {
    return (
      <GeofenceEdit
        geofence={geofence}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div 
      ref={panelRef}
      className={styles.panel}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'none',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.header}>
        <h2>{geofence.name}</h2>
        <div className={styles.actions}>
          <button onClick={handleEdit} className={styles.editButton}>
            Edit
          </button>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>
      </div>

      <div className={styles.tagsSection}>
        <div className={styles.tagsGrid}>
          {PLACE_TAGS.map(tag => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              className={styles.tagButton}
              disabled={isSearching}
            >
              <span className={styles.tagIcon}>{tag.icon}</span>
              <span className={styles.tagLabel}>{tag.label}</span>
            </button>
          ))}
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className={styles.searchResults}>
          <div className={styles.searchResultsHeader}>
            <h3>Found Places ({searchResults.length})</h3>
            <button
              onClick={handleSaveSelectedPlaces}
              disabled={selectedPlaces.size === 0}
              className={styles.saveButton}
            >
              Save Selected ({selectedPlaces.size})
            </button>
          </div>
          <div className={styles.resultsList}>
            {paginatedResults.map((place) => (
              <div key={place.place_id} className={styles.resultItem}>
                <label className={styles.resultLabel}>
                  <input
                    type="checkbox"
                    checked={selectedPlaces.has(place.place_id)}
                    onChange={() => handlePlaceSelection(place.place_id)}
                  />
                  <div className={styles.resultInfo}>
                    <span className={styles.placeName}>{place.name}</span>
                    <span className={styles.placeAddress}>{place.address}</span>
                    {place.website && (
                      <a 
                        href={place.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.placeWebsite}
                      >
                        Website
                      </a>
                    )}
                    {place.phone_number && (
                      <a 
                        href={`tel:${place.phone_number}`}
                        className={styles.placePhone}
                      >
                        {place.phone_number}
                      </a>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className={styles.paginationInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <div className={styles.placesList}>
        <h3>Saved Places ({places.length})</h3>
        {loading ? (
          <div className={styles.loading}>Loading places...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : places.length === 0 ? (
          <div className={styles.emptyState}>No places saved yet</div>
        ) : (
          <>
            <div className={styles.places}>
              {paginatedSavedPlaces.map((place) => (
                <div key={place.id} className={styles.placeItem}>
                  <div className={styles.placeInfo}>
                    <span className={styles.placeName}>{place.name}</span>
                    <span className={styles.placeAddress}>{place.address}</span>
                    {place.website && (
                      <a 
                        href={place.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.placeWebsite}
                      >
                        Website
                      </a>
                    )}
                    {place.phone_number && (
                      <a 
                        href={`tel:${place.phone_number}`}
                        className={styles.placePhone}
                      >
                        {place.phone_number}
                      </a>
                    )}
                  </div>
                  <div className={styles.placeStatus}>
                    {place.is_visited ? 'Visited' : 'Not Visited'}
                  </div>
                </div>
              ))}
            </div>
            {totalSavedPlacesPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.paginationButton}
                  onClick={() => handleSavedPlacesPageChange(savedPlacesPage - 1)}
                  disabled={savedPlacesPage === 1}
                >
                  Previous
                </button>
                <span className={styles.paginationInfo}>
                  Page {savedPlacesPage} of {totalSavedPlacesPages}
                </span>
                <button
                  className={styles.paginationButton}
                  onClick={() => handleSavedPlacesPageChange(savedPlacesPage + 1)}
                  disabled={savedPlacesPage === totalSavedPlacesPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 