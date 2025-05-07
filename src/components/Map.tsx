import { useEffect, useCallback, useState } from 'react';
import { GoogleMap, useLoadScript, DrawingManager } from '@react-google-maps/api';
import { useMapContext } from '../context/MapContext';
import type { Geofence, Place } from '../types';

const libraries: ("drawing" | "places")[] = ["drawing", "places"];

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

const drawingOptions = {
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
};

export const Map = () => {
  const { map, setMap, setDrawingManager,  setSelectedGeofence, places } = useMapContext();
  const [hoveredPlace, setHoveredPlace] = useState<Place | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

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

  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
    setDrawingManager(drawingManager);
  }, [setDrawingManager]);

  const handleOverlayComplete = useCallback((overlay: google.maps.drawing.OverlayCompleteEvent) => {
    console.log('Geofence drawn:', overlay.type);
    
    const geofence: Geofence = {
      name: '',
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
  }, [setSelectedGeofence]);

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

  if (loadError) return <div className="error">Error loading maps</div>;
  if (!isLoaded) return <div className="loading">Loading maps...</div>;

  return (
    <div className="map-container">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={7}
        onLoad={onLoad}
        options={{
          restriction: {
            latLngBounds: ghanaBounds,
            strictBounds: true
          },
          minZoom: 6
        }}
      >
        <DrawingManager
          onLoad={onDrawingManagerLoad}
          options={drawingOptions}
          onOverlayComplete={handleOverlayComplete}
        />
      </GoogleMap>
      {renderHoverPanel()}
    </div>
  );
}; 