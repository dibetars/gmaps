import { MapProvider, useMapContext } from './context/MapContext';
import { Map } from './components/Map';
import { GeofenceForm } from './components/GeofenceForm';
import { PlacesList } from './components/PlacesList';
import { ProgressBar } from './components/ProgressBar';
import { SearchResults } from './components/SearchResults';
import { useState, useCallback, useEffect } from 'react';
import type { Place, Geofence } from './types';
import { xanoService } from './services/xanoService';

function GeofenceSection() {
  const { selectedGeofence, map, setPlaces, setSelectedGeofence, drawingManager } = useMapContext();
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [foundPlaces, setFoundPlaces] = useState<Place[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingGeofence, setIsSavingGeofence] = useState(false);

  // Watch for geofence changes to trigger automatic search
  useEffect(() => {
    if (selectedGeofence && currentStep === 1) {
      setCurrentStep(2);
      handleSearchPlaces();
    }
  }, [selectedGeofence]);

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
      let hasMoreResults = true;
      let nextPageToken: string | null = null;

      while (hasMoreResults && allPlaces.length < 100) {
        const places = await new Promise<{ results: google.maps.places.PlaceResult[], nextPageToken: string | null }>((resolve, reject) => {
          const request: google.maps.places.PlaceSearchRequest = {
            location: center,
            radius: Math.min(radius, 50000),
            type: 'restaurant'
          };

          if (nextPageToken) {
            (request as any).pageToken = nextPageToken;
          }

          service.nearbySearch(
            request,
            (results, status, pagination) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                resolve({ 
                  results, 
                  nextPageToken: pagination?.hasNextPage ? (pagination as any).nextPageToken : null 
                });
              } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                resolve({ results: [], nextPageToken: null });
              } else {
                reject(new Error(`Failed to fetch places: ${status}`));
              }
            }
          );
        });

        const newPlaces: Place[] = places.results.map((place) => ({
          id: place.place_id,
          place_id: place.place_id || '',
          name: place.name || '',
          address: place.vicinity || '',
          type: 'restaurant',
          is_visited: false,
          notes: '',
          geofence_id: selectedGeofence.id || '',
          location: {
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0
          }
        }));

        allPlaces.push(...newPlaces);
        nextPageToken = places.nextPageToken;
        hasMoreResults = !!nextPageToken;

        setProgress({ 
          current: allPlaces.length, 
          total: 100, 
          message: `Found ${allPlaces.length} places so far...` 
        });

        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setFoundPlaces(allPlaces);
      setProgress({ 
        current: allPlaces.length, 
        total: allPlaces.length, 
        message: `Found ${allPlaces.length} places` 
      });
      setCurrentStep(3);
    } catch (error) {
      console.error('Error searching places:', error);
      setProgress({ current: 0, total: 0, message: 'Error occurred while searching places.' });
    } finally {
      setIsSearching(false);
    }
  }, [map, selectedGeofence]);

  const handleSaveGeofence = async () => {
    if (!selectedGeofence) return;
    
    setIsSavingGeofence(true);
    try {
      // First save the geofence with a default name if not set
      const geofenceToSave = {
        ...selectedGeofence,
        name: selectedGeofence.name || `Geofence ${new Date().toLocaleString()}`
      };
      
      // Save geofence first
      const savedGeofence = await xanoService.saveGeofence(geofenceToSave) as Geofence & { id: string };
      console.log('Geofence saved successfully:', savedGeofence);
      
      // Update the selected geofence with the saved version
      setSelectedGeofence(savedGeofence);
      
      // Then save all places with the new geofence ID
      console.log('Saving places for geofence:', foundPlaces.length);
      const savedPlaces = await Promise.all(
        foundPlaces.map(place => xanoService.savePlace({
          ...place,
          geofence_id: savedGeofence.id
        }))
      );
      console.log('Places saved successfully:', savedPlaces.length);
      setPlaces(savedPlaces);
      
      setCurrentStep(4);
    } catch (error) {
      console.error('Error saving geofence and places:', error);
    } finally {
      setIsSavingGeofence(false);
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setFoundPlaces([]);
    setSelectedGeofence(null);
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }
  };

  return (
    <div className="geofences-section">
      <div className="floating-controls">
        <div className={`floating-panel geofence-form ${isMinimized ? 'minimized' : ''}`}>
          <GeofenceForm />
        </div>
      </div>
      <Map />
    </div>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="dashboard">
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Visits</h3>
                <p className="stat-number">24</p>
              </div>
              <div className="stat-card">
                <h3>Places to Visit</h3>
                <p className="stat-number">12</p>
              </div>
              <div className="stat-card">
                <h3>Active Geofences</h3>
                <p className="stat-number">5</p>
              </div>
            </div>
          </div>
        );
      case 'geofences':
        return <GeofenceSection />;
      case 'places':
        return (
          <div className="places-section">
            <h2>All Places</h2>
            <div className="places-by-geofence">
              <div className="geofence-group">
                <h3>Downtown Area</h3>
                <PlacesList />
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="settings-section">
            <h2>Settings</h2>
            <div className="settings-form">
              <div className="setting-group">
                <h3>Notifications</h3>
                <label className="setting-toggle">
                  <input type="checkbox" />
                  <span>Enable visit reminders</span>
                </label>
              </div>
              <div className="setting-group">
                <h3>Map Preferences</h3>
                <label className="setting-toggle">
                  <input type="checkbox" />
                  <span>Show visited places</span>
                </label>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MapProvider>
      <div className="app-container">
        <aside className="sidebar">
          <header className="app-header">
            <h1>Geofence Explorer</h1>
          </header>
          <nav className="nav-menu">
            <button 
              className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveSection('dashboard')}
            >
              <span className="nav-icon">📊</span>
              Dashboard
            </button>
            <button 
              className={`nav-item ${activeSection === 'geofences' ? 'active' : ''}`}
              onClick={() => setActiveSection('geofences')}
            >
              <span className="nav-icon">📍</span>
              Geofences
            </button>
            <button 
              className={`nav-item ${activeSection === 'places' ? 'active' : ''}`}
              onClick={() => setActiveSection('places')}
            >
              <span className="nav-icon">🏢</span>
              Places
            </button>
            <button 
              className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveSection('settings')}
            >
              <span className="nav-icon">⚙️</span>
              Settings
            </button>
            <button className="nav-item logout">
              <span className="nav-icon">🚪</span>
              Logout
            </button>
          </nav>
        </aside>
        <main className="main-content">
          <div className="content-section">
            {renderContent()}
          </div>
        </main>
      </div>
    </MapProvider>
  );
}

export default App;
