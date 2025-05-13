import { useEffect, useCallback, useState } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { useMapContext } from '../context/MapContext';
import type { Geofence, Place } from '../types';
import { GeofencePlaces } from './GeofencePlaces';
import { GeofenceImportManager } from './GeofenceImportManager';
import { xanoService } from '../services/xanoService';

const libraries: ("places" | "drawing")[] = ["places", "drawing"];

// Ghana's center coordinates
const defaultCenter = {
  lat: 7.9465,
  lng: -1.0232
};

// Ghana's bounds
const ghanaBounds = {
  north: 11.1733,
  south: 4.7105,
  east: 1.1918,
  west: -3.2554
};

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

export const Map = () => {
  const { map, setMap, places } = useMapContext();
  const [hoveredPlace, setHoveredPlace] = useState<Place | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [temporaryGeofences, setTemporaryGeofences] = useState<Geofence[]>([]);
  const [geofenceOverlays, setGeofenceOverlays] = useState<google.maps.Polygon[]>([]);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [showImport, setShowImport] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    // Restrict the map to Ghana's bounds
    map.setOptions({
      restriction: {
        latLngBounds: ghanaBounds,
        strictBounds: true
      },
      minZoom: 6
    });
  }, [setMap]);

  // Fetch existing geofences
  useEffect(() => {
    const fetchGeofences = async () => {
      try {
        const data = await xanoService.getGeofences();
        setGeofences(data);
      } catch (error) {
        console.error('Error fetching geofences:', error);
      }
    };

    fetchGeofences();
  }, []);

  // Draw geofences on the map
  useEffect(() => {
    if (!map) return;

    // Clear existing overlays
    geofenceOverlays.forEach(overlay => overlay.setMap(null));
    const newOverlays: google.maps.Polygon[] = [];

    // Combine permanent and temporary geofences
    const allGeofences = [...geofences, ...temporaryGeofences];

    allGeofences.forEach(geofence => {
      const paths = geofence.coordinates.map(coord => ({
        lat: typeof coord.lat === 'function' ? coord.lat() : coord.lat,
        lng: typeof coord.lng === 'function' ? coord.lng() : coord.lng
      }));

      const overlay = new google.maps.Polygon({
        paths,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.2,
        map
      });

      // Add click listener to show places
      overlay.addListener('click', () => {
        setSelectedGeofence(geofence);
      });

      newOverlays.push(overlay);
    });

    setGeofenceOverlays(newOverlays);

    // Cleanup
    return () => {
      newOverlays.forEach(overlay => overlay.setMap(null));
    };
  }, [map, geofences, temporaryGeofences]);

  // Add markers for saved places
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    places.forEach(place => {
      const marker = new google.maps.Marker({
        position: place.location,
        map,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: place.is_visited ? '#22c55e' : '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      // Add click listener to show info window
      marker.addListener('click', () => {
        setHoveredPlace(place);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Cleanup
    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [map, places]);

  // Add hover panel for places
  const renderHoverPanel = () => {
    if (!hoveredPlace) return null;

    return (
      <div className="floating-panel place-hover" style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        maxWidth: '300px'
      }}>
        <h3>{hoveredPlace.name}</h3>
        <p>{hoveredPlace.address}</p>
        <p>Status: {hoveredPlace.is_visited ? 'Visited' : 'Not Visited'}</p>
        {hoveredPlace.notes && <p>Notes: {hoveredPlace.notes}</p>}
      </div>
    );
  };

  const handleGeofenceUpdate = (updatedGeofence: Geofence) => {
    setGeofences(prevGeofences => 
      prevGeofences.map(g => g.id === updatedGeofence.id ? updatedGeofence : g)
    );
    setSelectedGeofence(updatedGeofence);
  };

  const handleImport = async (importedGeofences: Geofence[], isTemporary: boolean = false) => {
    if (isTemporary) {
      // For temporary viewing, just update the temporary geofences state
      setTemporaryGeofences(importedGeofences);
    } else {
      try {
        // Save each imported geofence to the backend
        const savedGeofences = await Promise.all(
          importedGeofences.map(async (geofence) => {
            const response = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:jMKnESWk/geofences', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(geofence),
            });

            if (!response.ok) {
              throw new Error('Failed to save imported geofence');
            }

            return response.json();
          })
        );

        // Update the permanent geofences state with the new geofences
        setGeofences(prev => [...prev, ...savedGeofences]);
      } catch (error) {
        console.error('Error importing geofences:', error);
      }
    }
  };

  if (loadError) return <div className="error">Error loading maps</div>;
  if (!isLoaded) return <div className="loading">Loading maps...</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={8}
        onLoad={onLoad}
      />
      <button 
        onClick={() => setShowImport(true)}
        className="import-button"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          padding: '8px 16px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        Import KMZ
      </button>
      <button 
        onClick={() => setTemporaryGeofences([])}
        className="clear-button"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '140px',
          padding: '8px 16px',
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        Clear Points
      </button>
      {hoveredPlace && renderHoverPanel()}
      {selectedGeofence && (
        <GeofencePlaces
          geofence={selectedGeofence}
          onClose={() => setSelectedGeofence(null)}
          onUpdate={handleGeofenceUpdate}
        />
      )}
      {showImport && (
        <GeofenceImportManager
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}; 