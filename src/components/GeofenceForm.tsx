import { useState, useEffect } from 'react';
import { useMapContext } from '../context/MapContext';
import { xanoService } from '../services/xanoService';
import type { Place, Geofence } from '../types';

declare global {
  interface Window {
    google: {
      maps: {
        Polygon: any;
        LatLng: any;
      };
    };
  }
}

export const GeofenceForm = () => {
  const { drawingManager, selectedGeofence, setSelectedGeofence, setPlaces, places: foundPlaces } = useMapContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [geofenceName, setGeofenceName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [savedGeofenceId, setSavedGeofenceId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Watch for geofence changes to trigger step transition
  useEffect(() => {
    if (selectedGeofence && currentStep === 1) {
      handleSaveGeofence();
    }
  }, [selectedGeofence]);

  // Watch for found places to trigger step transition
  useEffect(() => {
    if (foundPlaces.length > 0 && currentStep === 2) {
      setCurrentStep(3);
    }
  }, [foundPlaces]);

  const handleSaveGeofence = async () => {
    if (!selectedGeofence || !geofenceName.trim()) {
      setError('Please provide a name for the geofence');
      return;
    }
    
    setIsSaving(true);
    setProgress(0);
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
      setProgress(100);
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
    setProgress(0);
    setError(null);

    try {
      // Get selected places from found places
      const placesToSave = foundPlaces
        .filter(place => selectedPlaces.has(place.id!))
        .map(place => ({
          ...place,
          geofence_id: savedGeofenceId
        }));

      console.log('Saving places with geofence ID:', savedGeofenceId);
      console.log('Places to save:', placesToSave);

      // Save selected places
      if (placesToSave.length > 0) {
        await xanoService.savePlaces(savedGeofenceId, placesToSave, (current) => {
          setProgress((current / placesToSave.length) * 100);
        });
      }

      setProgress(100);
      
      // Reset form
      setGeofenceName('');
      setSelectedPlaces(new Set());
      setSelectedGeofence(null);
      setSavedGeofenceId(null);
      setCurrentStep(1);
      
      // Clear the drawing
      if (drawingManager) {
        drawingManager.setDrawingMode(null);
      }
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
    setProgress(0);
    setError(null);
    setSavedGeofenceId(null);
  };

  const handlePlaceSelection = (placeId: string) => {
    setSelectedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className="form-group">
              <p className="form-description">Use the drawing tools to create a circle or polygon on the map.</p>
            </div>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Enter geofence name"
                value={geofenceName}
                onChange={(e) => setGeofenceName(e.target.value)}
              />
            </div>
            {isSaving && (
              <div className="progress-container">
                <p className="progress-message">Saving geofence...</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-text">{progress}%</p>
              </div>
            )}
          </>
        );
      case 2:
        return (
          <div className="step-content">
            <h3>Searching Places</h3>
            <p className="step-description">
              Searching for places in your selected area...
            </p>
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="step-content">
            <div className="places-list">
              {foundPlaces.map(place => (
                <div key={place.id} className="place-item">
                  <label className="place-radio">
                    <input
                      type="checkbox"
                      checked={selectedPlaces.has(place.id!)}
                      onChange={() => handlePlaceSelection(place.id!)}
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
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-text">{progress}%</p>
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
      {!isMinimized && currentStep === 3 && (
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