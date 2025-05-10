import { useState, useEffect, useCallback } from 'react';
import { useMapContext } from '../context/MapContext';
import { xanoService } from '../services/xanoService';
import type { Place, Geofence } from '../types';
import { PlacesList } from './PlacesList';

declare global {
  interface Window {
    google: {
      maps: {
        Polygon: any;
        LatLng: any;
        Circle: any;
        geometry: {
          spherical: {
            computeDistanceBetween: (from: google.maps.LatLng, to: google.maps.LatLng) => number;
          };
          poly: {
            containsLocation: (point: google.maps.LatLng, polygon: google.maps.Polygon) => boolean;
          };
        };
      };
    };
  }
}

export const GeofenceForm = () => {
  const { drawingManager, setDrawingManager, selectedGeofence, setSelectedGeofence, places: foundPlaces, map } = useMapContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [geofenceName, setGeofenceName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [savedGeofenceId, setSavedGeofenceId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [searchTerms] = useState([
    'restaurant',
    'cafe',
    'food',
    'dining',
    'eatery',
    'bistro',
    'pub',
    'bar',
    'grill',
    'pizzeria'
  ]);

  // Effect to handle drawing manager state based on geofence name
  useEffect(() => {
    if (drawingManager) {
      if (!geofenceName.trim()) {
        // Disable drawing tools if no name is provided
        drawingManager.setDrawingMode(null);
        drawingManager.setOptions({
          drawingControl: false
        });
      } else {
        // Enable drawing tools when name is provided
        drawingManager.setOptions({
          drawingControl: true,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              google.maps.drawing.OverlayType.CIRCLE,
              google.maps.drawing.OverlayType.POLYGON
            ]
          },
          circleOptions: {
            fillColor: "#2563eb",
            fillOpacity: 0.2,
            strokeWeight: 2,
            strokeColor: "#2563eb",
            clickable: true,
            editable: true,
            zIndex: 1
          },
          polygonOptions: {
            fillColor: "#2563eb",
            fillOpacity: 0.2,
            strokeWeight: 2,
            strokeColor: "#2563eb",
            clickable: true,
            editable: true,
            zIndex: 1
          }
        });
        // Set the drawing mode to null to show the drawing controls
        drawingManager.setDrawingMode(null);
      }
    }
  }, [drawingManager, geofenceName]);

  // Initialize drawing manager
  useEffect(() => {
    if (map && !drawingManager) {
      const newDrawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [
            google.maps.drawing.OverlayType.CIRCLE,
            google.maps.drawing.OverlayType.POLYGON
          ]
        },
        circleOptions: {
          fillColor: "#2563eb",
          fillOpacity: 0.2,
          strokeWeight: 2,
          strokeColor: "#2563eb",
          clickable: true,
          editable: true,
          zIndex: 1
        },
        polygonOptions: {
          fillColor: "#2563eb",
          fillOpacity: 0.2,
          strokeWeight: 2,
          strokeColor: "#2563eb",
          clickable: true,
          editable: true,
          zIndex: 1
        }
      });
      newDrawingManager.setMap(map);
      setDrawingManager(newDrawingManager);

      // Add listener for overlay completion
      google.maps.event.addListener(newDrawingManager, 'overlaycomplete', (overlay: google.maps.drawing.OverlayCompleteEvent) => {
        console.log('Geofence drawn:', overlay.type);
        
        const geofence: Geofence = {
          name: geofenceName,
          type: overlay.type === 'circle' ? 'circle' : 'polygon',
          coordinates: overlay.type === 'circle' 
            ? [(overlay.overlay as google.maps.Circle).getCenter()!]
            : (overlay.overlay as google.maps.Polygon).getPath().getArray(),
          radius: overlay.type === 'circle' 
            ? (overlay.overlay as google.maps.Circle).getRadius()
            : undefined
        };

        console.log('Geofence details:', {
          type: geofence.type,
          coordinates: geofence.coordinates.map(coord => {
            const latLng = coord instanceof google.maps.LatLng ? coord : new google.maps.LatLng(coord.lat, coord.lng);
            return {
              lat: latLng.lat(),
              lng: latLng.lng()
            };
          }),
          radius: geofence.radius
        });

        setSelectedGeofence(geofence);
      });
    }
  }, [map, drawingManager, geofenceName]);

  // Watch for geofence changes to trigger step transition
  useEffect(() => {
    if (selectedGeofence && currentStep === 1) {
      handleSaveGeofence();
      setCurrentStep(2); // Move to step 2 after saving geofence
      handleSearchPlaces(); // Start searching for places
    }
  }, [selectedGeofence]);

  // Watch for found places to trigger step transition
  useEffect(() => {
    if (foundPlaces.length > 0 && currentStep === 2) {
      setCurrentStep(3);
    }
  }, [foundPlaces, currentStep]);

  const handleSaveGeofence = async () => {
    if (!selectedGeofence || !geofenceName.trim()) {
      setError('Please provide a name for the geofence');
      return;
    }

    setIsSaving(true);
    setProgress({ current: 0, total: 0, message: 'Saving geofence...' });
    setError(null);

    try {
      // Save geofence first
      const geofenceResponse = await xanoService.saveGeofence({
        name: geofenceName,
        type: selectedGeofence.type,
        coordinates: selectedGeofence.coordinates,
        radius: selectedGeofence.radius
      });

      if (!geofenceResponse.id) {
        throw new Error('Failed to get geofence ID from response');
      }

      setSavedGeofenceId(geofenceResponse.id);
      setProgress({ current: 100, total: 100, message: 'Geofence saved successfully' });
      setCurrentStep(2);
      
    } catch (error) {
      console.error('Error saving geofence:', error);
      setError('Failed to save geofence. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePlaces = async () => {
    if (!savedGeofenceId) {
      setError('Geofence ID not found. Please try again.');
      return;
    }

    if (selectedPlaces.size === 0) {
      setError('Please select at least one place to save.');
      return;
    }

    setIsSaving(true);
    setProgress({ current: 0, total: 0, message: 'Saving places...' });
    setError(null);

    try {
      // Get selected places from found places
      const placesToSave = foundPlaces
        .filter(place => selectedPlaces.has(place.place_id!))
        .map(place => ({
          ...place,
          geofence_id: savedGeofenceId
        }));

      console.log('Saving places with geofence ID:', savedGeofenceId);
      console.log('Places to save:', placesToSave);

      // Save selected places
      if (placesToSave.length > 0) {
        await xanoService.savePlaces(savedGeofenceId, placesToSave, (current) => {
          setProgress({ 
            current: current, 
            total: placesToSave.length, 
            message: `Saving places... (${current} of ${placesToSave.length})` 
          });
        });
      }

      setProgress({ current: placesToSave.length, total: placesToSave.length, message: 'Places saved successfully' });
      
      // Show success modal
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Error saving places:', error);
      setError('Failed to save places. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartOver = () => {
    // Clear the drawing
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }
    
    // Remove any drawn geofence
    if (selectedGeofence) {
      setSelectedGeofence(null);
    }

    // Reset form state
    setGeofenceName('');
    setSelectedPlaces(new Set());
    setCurrentStep(1);
    setProgress({ current: 0, total: 0, message: '' });
    setError(null);
    setSavedGeofenceId(null);
    setShowSuccessModal(false);
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

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setIsMinimized(true);
    // Reset form state but keep the geofence on the map
    setCurrentStep(1);
    setGeofenceName('');
    setSelectedPlaces(new Set());
    setProgress({ current: 0, total: 0, message: '' });
    setError(null);
    setSavedGeofenceId(null);
  };

  const handleSearchPlaces = useCallback(async () => {
    if (!map || !selectedGeofence) return;

    setIsSearching(true);
    setProgress({ current: 0, total: 0, message: 'Searching for places...' });
    console.log('Searching for places in geofence:', selectedGeofence.type);

    try {
      const service = new google.maps.places.PlacesService(map);
      const center = selectedGeofence.type === 'circle' 
        ? selectedGeofence.coordinates[0]
        : new google.maps.LatLng(
            selectedGeofence.coordinates.reduce((sum, coord) => sum + (coord instanceof google.maps.LatLng ? coord.lat() : coord.lat), 0) / selectedGeofence.coordinates.length,
            selectedGeofence.coordinates.reduce((sum, coord) => sum + (coord instanceof google.maps.LatLng ? coord.lng() : coord.lng), 0) / selectedGeofence.coordinates.length
          );

      const radius = selectedGeofence.type === 'circle' 
        ? selectedGeofence.radius || 0
        : google.maps.geometry.spherical.computeDistanceBetween(
            center,
            selectedGeofence.coordinates.reduce((furthest, coord) => {
              const distance = google.maps.geometry.spherical.computeDistanceBetween(center, coord);
              return distance > furthest.distance ? { coord, distance } : furthest;
            }, { coord: center, distance: 0 }).coord
          );

      const allPlaces: Place[] = [];
      const processedPlaceIds = new Set<string>();
      let totalSearches = searchTerms.length + 1; // +1 for nearbySearch
      let completedSearches = 0;

      // Function to convert a place result to our Place type
      const convertToPlace = (place: google.maps.places.PlaceResult): Place => ({
        id: place.place_id || '',
        place_id: place.place_id || '',
        name: place.name || '',
        address: place.vicinity || '',
        is_visited: false,
        notes: '',
        geofence_id: selectedGeofence.id || '',
        location: {
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0
        }
      });

      // Function to check if a place is within the geofence
      const isPlaceInGeofence = (place: Place): boolean => {
        const placeLocation = new google.maps.LatLng(place.location.lat, place.location.lng);
        
        if (selectedGeofence.type === 'circle') {
          const center = selectedGeofence.coordinates[0];
          const centerLatLng = center instanceof google.maps.LatLng ? center : new google.maps.LatLng(center.lat, center.lng);
          const distance = google.maps.geometry.spherical.computeDistanceBetween(centerLatLng, placeLocation);
          return distance <= (selectedGeofence.radius || 0);
        } else {
          const polygon = new google.maps.Polygon({
            paths: selectedGeofence.coordinates
          });
          return google.maps.geometry.poly.containsLocation(placeLocation, polygon);
        }
      };

      // Function to perform a search with pagination
      const performSearch = async (
        searchMethod: 'nearbySearch' | 'textSearch',
        request: google.maps.places.PlaceSearchRequest | google.maps.places.TextSearchRequest
      ): Promise<Place[]> => {
        const results: Place[] = [];
        let hasMoreResults = true;
        let nextPageToken: string | null = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (hasMoreResults) {
          try {
            const places = await new Promise<{ results: google.maps.places.PlaceResult[], nextPageToken: string | null }>((resolve, reject) => {
              const searchRequest = { ...request };
              if (nextPageToken) {
                (searchRequest as any).pageToken = nextPageToken;
              }

              const searchCallback = (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus, pagination: google.maps.places.PlaceSearchPagination | null) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                  resolve({ 
                    results, 
                    nextPageToken: pagination?.hasNextPage ? (pagination as any).nextPageToken : null 
                  });
                } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                  resolve({ results: [], nextPageToken: null });
                } else if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST && nextPageToken) {
                  reject(new Error('PAGINATION_DELAY_NEEDED'));
                } else {
                  reject(new Error(`Failed to fetch places: ${status}`));
                }
              };

              if (searchMethod === 'nearbySearch') {
                service.nearbySearch(searchRequest as google.maps.places.PlaceSearchRequest, searchCallback);
              } else {
                service.textSearch(searchRequest as google.maps.places.TextSearchRequest, searchCallback);
              }
            });

            const newPlaces = places.results
              .map(convertToPlace)
              .filter(place => !processedPlaceIds.has(place.place_id) && isPlaceInGeofence(place));

            results.push(...newPlaces);
            newPlaces.forEach(place => processedPlaceIds.add(place.place_id));

            nextPageToken = places.nextPageToken;
            hasMoreResults = !!nextPageToken;
            retryCount = 0;

            if (nextPageToken) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error) {
            if (error instanceof Error && error.message === 'PAGINATION_DELAY_NEEDED' && retryCount < maxRetries) {
              retryCount++;
              const delay = 2000 * retryCount;
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }
        }

        return results;
      };

      // Perform nearby search
      const nearbyResults = await performSearch('nearbySearch', {
        location: center,
        radius: Math.min(radius, 50000),
        type: 'restaurant'
      } as google.maps.places.PlaceSearchRequest);
      allPlaces.push(...nearbyResults);
      completedSearches++;

      // Perform text searches for each term
      for (const term of searchTerms) {
        const textResults = await performSearch('textSearch', {
          query: `${term} in ${geofenceName || 'this area'}`,
          location: center,
          radius: Math.min(radius, 50000)
        } as google.maps.places.TextSearchRequest);
        allPlaces.push(...textResults);
        completedSearches++;

        setProgress({ 
          current: allPlaces.length, 
          total: totalSearches * 60, // Estimate max results (20 per page * 3 pages per search)
          message: `Found ${allPlaces.length} places (${completedSearches}/${totalSearches} searches completed)` 
        });

        // Add a small delay between different search terms
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Remove duplicates (in case any slipped through)
      const uniquePlaces = Array.from(new Map(allPlaces.map(place => [place.place_id, place])).values());

      setProgress({ 
        current: uniquePlaces.length, 
        total: uniquePlaces.length, 
        message: `Found ${uniquePlaces.length} unique places` 
      });
      setCurrentStep(3);
    } catch (error) {
      console.error('Error searching places:', error);
      setProgress({ current: 0, total: 0, message: 'Error occurred while searching places.' });
      setError('Error occurred while searching places.');
    } finally {
      setIsSearching(false);
    }
  }, [map, selectedGeofence, geofenceName, searchTerms]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="form-group">
              <p className="form-description">
                {!geofenceName.trim() 
                  ? "Please enter a name for your geofence to enable drawing tools."
                  : "Use the drawing tools to create a circle or polygon on the map."}
              </p>
            </div>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Enter geofence name"
                value={geofenceName}
                onChange={(e) => setGeofenceName(e.target.value)}
              />
              {!geofenceName.trim() && (
                <p className="form-hint">Drawing tools will be enabled after entering a name</p>
              )}
            </div>
            {isSaving && (
              <div className="progress-container">
                <p className="progress-message">Saving geofence...</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress.current}%` }} />
                </div>
                <p className="progress-text">{progress.message}</p>
              </div>
            )}
          </>
        );
      case 2:
        return (
          <div className="step-content">
            <h3>Searching Places</h3>
            <p className="step-description">
              {progress.message || 'Searching for places in your selected area...'}
            </p>
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
              <p className="progress-text">{progress.message}</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="step-content">
            <div className="places-list">
              {foundPlaces.map(place => (
                <div key={place.place_id} className="place-item">
                  <label className="place-radio">
                    <input
                      type="checkbox"
                      checked={selectedPlaces.has(place.place_id)}
                      onChange={() => handlePlaceSelection(place.place_id)}
                    />
                    <div className="place-details">
                      <h4>{place.name}</h4>
                      <p>{place.address}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            {isSaving && (
              <div className="progress-container">
                <p className="progress-message">Saving places...</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress.current}%` }} />
                </div>
                <p className="progress-text">{progress.message}</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="geofence-form">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Success!</h2>
            <p>Your geofence and places have been saved successfully.</p>
            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={handleCloseModal}
              >
                Done
              </button>
              <button
                className="modal-button primary"
                onClick={handleStartOver}
              >
                Draw Another Geofence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="form-header">
        <div className="step-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
          <div className="step-line"></div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
          <div className="step-line"></div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
        </div>
        <div className="header-actions">
          <button 
            className="minimize-button"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? '▼' : '▲'}
          </button>
          <button
            className="restart-button"
            onClick={handleStartOver}
            title="Start Over"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className="form-body">
          {error && <div className="error-message">{error}</div>}
          {renderStepContent()}
        </div>
      )}

      {/* Footer */}
      {!isMinimized && currentStep === 3 && !showSuccessModal && (
        <div className="form-footer">
          <div className="button-group">
            <button
              className="save-geofence-button"
              onClick={handleSavePlaces}
              disabled={isSaving || selectedPlaces.size === 0}
            >
              {isSaving ? (
                <>
                  <span className="search-spinner" />
                  Saving...
                </>
              ) : (
                'Save Places'
              )}
            </button>
            <button
              className="restart-button"
              onClick={handleStartOver}
              disabled={isSaving}
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 