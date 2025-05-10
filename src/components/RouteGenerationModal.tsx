import { useState, useEffect } from 'react';
import type { Place } from '../types';
import { useMapContext } from '../context/MapContext';
import styles from './RouteGenerationModal.module.css';

interface RouteGenerationModalProps {
  places: Place[];
  onClose: () => void;
}

type Step = 'start' | 'options' | 'preview' | 'complete';

interface RouteLeg {
  start: string;
  end: string;
  distance: string;
  duration: string;
}

export const RouteGenerationModal = ({ places, onClose }: RouteGenerationModalProps) => {
  const { map } = useMapContext();
  const [currentStep, setCurrentStep] = useState<Step>('start');
  const [selectedStartPoint, setSelectedStartPoint] = useState('The Octagon, Accra, Ghana');
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [routeUrl, setRouteUrl] = useState('');
  const [routeLegs, setRouteLegs] = useState<RouteLeg[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (map) {
      const renderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 5,
        }
      });
      setDirectionsRenderer(renderer);

      return () => {
        renderer.setMap(null);
      };
    }
  }, [map]);

  const handleStartPointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedStartPoint(value === 'The Octagon' ? 'The Octagon, Accra, Ghana' : value);
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

  const calculateRoute = async () => {
    if (!map || !directionsRenderer) return;

    setIsCalculatingRoute(true);
    const directionsService = new google.maps.DirectionsService();
    const validPlaces = places.filter(place => 
      selectedPlaces.has(place.place_id) && place.address
    );

    if (validPlaces.length === 0) {
      setIsCalculatingRoute(false);
      return;
    }

    try {
      const waypoints = validPlaces.map(place => ({
        location: place.address,
        stopover: true
      }));

      // Format the start point address
      const startPointAddress = selectedStartPoint === 'The Octagon' 
        ? 'The Octagon, Accra, Ghana'
        : selectedStartPoint;

      const result = await directionsService.route({
        origin: startPointAddress,
        destination: startPointAddress, // Return to start
        waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      if (result.routes.length === 0) {
        throw new Error('No route found. Please check the addresses and try again.');
      }

      directionsRenderer.setDirections(result);
      
      // Extract route information
      const legs = result.routes[0].legs.map(leg => ({
        start: leg.start_address,
        end: leg.end_address,
        distance: leg.distance?.text || '',
        duration: leg.duration?.text || ''
      }));
      setRouteLegs(legs);

      // Generate Google Maps URL
      const baseUrl = 'https://www.google.com/maps/dir/';
      const destinations = validPlaces
        .map(place => encodeURIComponent(place.address))
        .join('/');
      const startPoint = encodeURIComponent(startPointAddress);
      setRouteUrl(`${baseUrl}${startPoint}/${destinations}/?optimize=true`);

      setCurrentStep('preview');
    } catch (error) {
      console.error('Error calculating route:', error);
      alert(error instanceof Error ? error.message : 'Failed to calculate route. Please check the addresses and try again.');
      if (directionsRenderer) {
        directionsRenderer.setMap(null);
      }
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 'start') {
      setCurrentStep('options');
    } else if (currentStep === 'options') {
      calculateRoute();
    } else if (currentStep === 'preview') {
      window.open(routeUrl, '_blank');
      setCurrentStep('complete');
    }
  };

  const handleBack = () => {
    if (currentStep === 'options') {
      setCurrentStep('start');
    } else if (currentStep === 'preview') {
      if (directionsRenderer) {
        directionsRenderer.setMap(null);
        directionsRenderer.setDirections({
          routes: [],
          request: {
            origin: '',
            destination: '',
            travelMode: google.maps.TravelMode.DRIVING
          }
        });
      }
      setCurrentStep('options');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'start':
        return (
          <div className={styles.stepContent}>
            <h3>Welcome to Route Generation</h3>
            <p>This tool will help you create an optimized route for visiting multiple places.</p>
            <div className={styles.stepActions}>
              <button 
                className={styles.primaryButton}
                onClick={handleNext}
              >
                Get Started
              </button>
            </div>
          </div>
        );

      case 'options':
        return (
          <div className={styles.stepContent}>
            <h3>Configure Your Route</h3>
            <div className={styles.formGroup}>
              <label htmlFor="startPoint">Starting Point</label>
              <select
                id="startPoint"
                value={selectedStartPoint}
                onChange={handleStartPointChange}
                className={styles.select}
              >
                <option value="The Octagon">The Octagon</option>
                <option value="Current Location">Current Location</option>
                {places.map(place => (
                  <option key={place.place_id} value={place.address}>
                    {place.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.placesList}>
              <h4>Select Places to Visit</h4>
              <div className={styles.placesGrid}>
                {places.map(place => (
                  <label 
                    key={place.place_id}
                    className={`${styles.placeCard} ${selectedPlaces.has(place.place_id) ? styles.selected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlaces.has(place.place_id)}
                      onChange={() => handlePlaceSelection(place.place_id)}
                    />
                    <div className={styles.placeInfo}>
                      <span className={styles.placeName}>{place.name}</span>
                      <span className={styles.placeAddress}>{place.address}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.stepActions}>
              <button 
                className={styles.secondaryButton}
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                className={styles.primaryButton}
                onClick={handleNext}
                disabled={selectedPlaces.size === 0 || isCalculatingRoute}
              >
                {isCalculatingRoute ? 'Calculating Route...' : 'Preview Route'}
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className={styles.stepContent}>
            <h3>Preview Your Route</h3>
            <p>Your route will start from <strong>{selectedStartPoint}</strong> and visit {selectedPlaces.size} places.</p>
            <div className={styles.routePreview}>
              <div className={styles.routeSummary}>
                <h4>Route Summary</h4>
                <ol className={styles.routeList}>
                  {routeLegs.map((leg, index) => (
                    <li key={index} className={styles.routeLeg}>
                      <div className={styles.legHeader}>
                        <span className={styles.legNumber}>{index + 1}</span>
                        <span className={styles.legAddress}>{leg.end}</span>
                      </div>
                      <div className={styles.legDetails}>
                        <span className={styles.legDistance}>{leg.distance}</span>
                        <span className={styles.legDuration}>{leg.duration}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className={styles.stepActions}>
              <button 
                className={styles.secondaryButton}
                onClick={handleBack}
              >
                Back
              </button>
              <button 
                className={styles.primaryButton}
                onClick={handleNext}
              >
                Open in Google Maps
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className={styles.stepContent}>
            <h3>Route Generated Successfully!</h3>
            <p>Your route has been opened in Google Maps.</p>
            <div className={styles.stepActions}>
              <button 
                className={styles.primaryButton}
                onClick={onClose}
              >
                Done
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
          <h2>Generate Route</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${currentStep === 'start' ? styles.active : ''}`}>1</div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep === 'options' ? styles.active : ''}`}>2</div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep === 'preview' ? styles.active : ''}`}>3</div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep === 'complete' ? styles.active : ''}`}>4</div>
        </div>

        {renderStepContent()}
      </div>
    </div>
  );
}; 