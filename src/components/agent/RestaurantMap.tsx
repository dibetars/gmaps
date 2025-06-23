import React, { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';

const libraries: ("places" | "drawing")[] = ["places", "drawing"];

// Greater Accra coordinates
const greaterAccraCenter = {
  lat: 5.6037,
  lng: -0.1870
};

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

interface Restaurant {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  is_visited: boolean;
  date_visited?: string;
}

const RestaurantMap: React.FC = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries
  });

  const onMapLoad = (map: google.maps.Map) => {
    setMap(map);
    // Set bounds to Greater Accra
    const bounds = new google.maps.LatLngBounds(
      { lat: 5.4, lng: -0.3 }, // Southwest
      { lat: 5.8, lng: -0.1 }  // Northeast
    );
    map.fitBounds(bounds);
  };

  useEffect(() => {
    // Mock restaurant data - replace with actual API call
    const mockRestaurants: Restaurant[] = [
      {
        id: '1',
        name: 'Golden Spoon Restaurant',
        address: '123 Main St, Accra',
        location: { lat: 5.6037, lng: -0.1870 },
        is_visited: true,
        date_visited: '2024-03-15T10:30:00'
      },
      {
        id: '2',
        name: 'Mama Osei Kitchen',
        address: '456 Ring Rd, Kumasi',
        location: { lat: 6.6885, lng: -1.6244 },
        is_visited: false
      },
      {
        id: '3',
        name: 'Tasty Bites',
        address: '789 Oxford St, Accra',
        location: { lat: 5.5560, lng: -0.1969 },
        is_visited: true,
        date_visited: '2024-03-14T16:45:00'
      },
      {
        id: '4',
        name: 'Nkrumah Chop Bar',
        address: '321 High St, Tamale',
        location: { lat: 9.4034, lng: -0.8424 },
        is_visited: false
      }
    ];

    setRestaurants(mockRestaurants);
  }, []);

  // Update map markers when restaurants or map changes
  useEffect(() => {
    if (!map || restaurants.length === 0) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

    restaurants.forEach(restaurant => {
      const marker = new google.maps.Marker({
        position: restaurant.location,
        map,
        title: restaurant.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: restaurant.is_visited ? '#22c55e' : '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${restaurant.name}</h3>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${restaurant.address}</p>
            <p style="margin: 0; color: ${restaurant.is_visited ? '#22c55e' : '#3b82f6'}; font-size: 12px;">
              ${restaurant.is_visited 
                ? `Visited on ${new Date(restaurant.date_visited!).toLocaleDateString()}` 
                : 'Not visited yet'
              }
            </p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Cleanup function
    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [map, restaurants]);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      padding: '24px'
    }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: '600', 
        color: '#1f2937', 
        marginBottom: '1rem' 
      }}>
        Restaurant Locations
      </h2>
      
      {isLoaded ? (
        <div style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: '0.5rem', 
          overflow: 'hidden',
          marginBottom: '1rem'
        }}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={greaterAccraCenter}
            zoom={12}
            onLoad={onMapLoad}
          />
        </div>
      ) : (
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          color: '#6b7280',
          marginBottom: '1rem'
        }}>
          Loading map...
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontSize: '0.875rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#22c55e'
            }} />
            <span style={{ color: '#6b7280' }}>
              Visited ({restaurants.filter(r => r.is_visited).length})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6'
            }} />
            <span style={{ color: '#6b7280' }}>
              Not Visited ({restaurants.filter(r => !r.is_visited).length})
            </span>
          </div>
        </div>
        <span style={{ color: '#6b7280' }}>
          Total: {restaurants.length} restaurants
        </span>
      </div>
    </div>
  );
};

export default RestaurantMap; 