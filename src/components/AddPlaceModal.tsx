import { useState, useEffect } from 'react';
import type { Place, Geofence } from '../types';
import { xanoService } from '../services/xanoService';
import styles from './AddPlaceModal.module.css';

interface AddPlaceModalProps {
  onClose: () => void;
  onPlaceAdded: (place: Place) => void;
}

type Step = 'select-geofence' | 'search-place' | 'place-details' | 'preview';
type Position = 'Manager' | 'Store Clerk' | 'Sales Attendant' | 'Owner';

export const AddPlaceModal = ({ onClose, onPlaceAdded }: AddPlaceModalProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('select-geofence');
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [selectedGeofence, setSelectedGeofence] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [placeDetails, setPlaceDetails] = useState<Partial<Place>>({
    name: '',
    address: '',
    location: { lat: 0, lng: 0 },
    is_visited: false,
    notes: '',
    website: '',
    phone_number: '',
    point_of_contact: '',
    position: undefined,
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    // Initialize Google Places services
    if (window.google) {
      setAutocompleteService(new google.maps.places.AutocompleteService());
      setPlacesService(new google.maps.places.PlacesService(document.createElement('div')));
    }

    // Fetch geofences
    const fetchGeofences = async () => {
      try {
        const fetchedGeofences = await xanoService.getGeofences();
        setGeofences(fetchedGeofences);
      } catch (err) {
        setError('Failed to fetch geofences');
      }
    };

    fetchGeofences();
  }, []);

  const handleGeofenceSelect = (geofenceId: string) => {
    setSelectedGeofence(geofenceId);
    setCurrentStep('search-place');
  };

  const handleSearch = async () => {
    if (!autocompleteService || !searchQuery.trim()) return;

    try {
      const response = await autocompleteService.getPlacePredictions({
        input: searchQuery,
        types: ['establishment'],
        componentRestrictions: { country: 'gh' }, // Restrict to Ghana
        location: new google.maps.LatLng(7.9465, -1.0232), // Center of Ghana
        radius: 500000, // 500km radius
      });
      setSearchResults(response.predictions);
    } catch (err) {
      setError('Failed to search places');
    }
  };

  const handlePlaceSelect = async (placeId: string) => {
    if (!placesService) return;

    try {
      const place = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService!.getDetails(
          { placeId, fields: ['name', 'formatted_address', 'geometry', 'website', 'formatted_phone_number'] },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error('Failed to get place details'));
            }
          }
        );
      });

      setSelectedPlace(place);
      setPlaceDetails({
        ...placeDetails,
        name: place.name || '',
        address: place.formatted_address || '',
        location: place.geometry?.location ? {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        } : { lat: 0, lng: 0 },
        website: place.website || '',
        phone_number: place.formatted_phone_number || '',
      });
      setCurrentStep('place-details');
    } catch (err) {
      setError('Failed to get place details');
    }
  };

  const handleSubmit = async () => {
    if (!selectedGeofence) return;

    setIsLoading(true);
    setError(null);

    try {
      const newPlace: Place = {
        ...placeDetails,
        geofences_id: selectedGeofence,
        place_id: selectedPlace?.place_id || '',
        is_visited: false,
        date_visited: null,
      } as Place;

      const savedPlace = await xanoService.savePlace(newPlace);
      onPlaceAdded(savedPlace);
      onClose();
    } catch (err) {
      setError('Failed to save place');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'select-geofence':
        return (
          <div className={styles.step}>
            <h2>Select Geofence</h2>
            <div className={styles.geofenceList}>
              {geofences.map(geofence => (
                <button
                  key={geofence.id || geofence.name}
                  className={styles.geofenceButton}
                  onClick={() => geofence.id && handleGeofenceSelect(geofence.id)}
                  disabled={!geofence.id}
                >
                  {geofence.name}
                </button>
              ))}
            </div>
          </div>
        );

      case 'search-place':
        return (
          <div className={styles.step}>
            <h2>Search for a Place</h2>
            <div className={styles.searchContainer}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a place..."
                className={styles.searchInput}
              />
              <button onClick={handleSearch} className={styles.searchButton}>
                Search
              </button>
            </div>
            <div className={styles.searchResults}>
              {searchResults.map(result => (
                <button
                  key={result.place_id}
                  className={styles.resultButton}
                  onClick={() => handlePlaceSelect(result.place_id!)}
                >
                  {result.description}
                </button>
              ))}
            </div>
          </div>
        );

      case 'place-details':
        return (
          <div className={styles.step}>
            <h2>Place Details</h2>
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>Contact Person</label>
                <input
                  type="text"
                  value={placeDetails.point_of_contact || ''}
                  onChange={(e) => setPlaceDetails({ ...placeDetails, point_of_contact: e.target.value })}
                  placeholder="Name of contact person"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Position</label>
                <select
                  value={placeDetails.position || ''}
                  onChange={(e) => setPlaceDetails({ ...placeDetails, position: e.target.value as Position | undefined })}
                  className={styles.input}
                >
                  <option value="">Select position</option>
                  <option value="Manager">Manager</option>
                  <option value="Store Clerk">Store Clerk</option>
                  <option value="Sales Attendant">Sales Attendant</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={placeDetails.email || ''}
                  onChange={(e) => setPlaceDetails({ ...placeDetails, email: e.target.value })}
                  placeholder="contact@example.com"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Notes</label>
                <textarea
                  value={placeDetails.notes || ''}
                  onChange={(e) => setPlaceDetails({ ...placeDetails, notes: e.target.value })}
                  placeholder="Add any additional notes..."
                  className={styles.textarea}
                />
              </div>
            </div>
            <div className={styles.actions}>
              <button onClick={() => setCurrentStep('preview')} className={styles.nextButton}>
                Next
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className={styles.step}>
            <h2>Preview</h2>
            <div className={styles.preview}>
              <h3>{placeDetails.name}</h3>
              <p>{placeDetails.address}</p>
              {placeDetails.website && (
                <p>
                  <strong>Website:</strong> {placeDetails.website}
                </p>
              )}
              {placeDetails.phone_number && (
                <p>
                  <strong>Phone:</strong> {placeDetails.phone_number}
                </p>
              )}
              {placeDetails.point_of_contact && (
                <p>
                  <strong>Contact Person:</strong> {placeDetails.point_of_contact}
                </p>
              )}
              {placeDetails.position && (
                <p>
                  <strong>Position:</strong> {placeDetails.position}
                </p>
              )}
              {placeDetails.email && (
                <p>
                  <strong>Email:</strong> {placeDetails.email}
                </p>
              )}
              {placeDetails.notes && (
                <p>
                  <strong>Notes:</strong> {placeDetails.notes}
                </p>
              )}
            </div>
            <div className={styles.actions}>
              <button onClick={() => setCurrentStep('place-details')} className={styles.backButton}>
                Back
              </button>
              <button onClick={handleSubmit} className={styles.submitButton} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Place'}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Add New Place</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
        {renderStep()}
      </div>
    </div>
  );
}; 