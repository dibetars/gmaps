import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { GeofenceForm } from './GeofenceForm';
import { GeofenceImportManager } from './GeofenceImportManager';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { useMapContext } from '../context/MapContext';
import type { Place, Geofence } from '../types';
import { xanoService } from '../services/xanoService';

interface DashboardStats {
  totalVisits: number;
  placesToVisit: number;
  totalGeofences: number;
  totalPlaces: number;
}

interface RecentActivity {
  place: Place;
  action: 'visited' | 'added';
  timestamp: string;
}

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

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalVisits: 0,
    placesToVisit: 0,
    totalGeofences: 0,
    totalPlaces: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showGeofenceForm, setShowGeofenceForm] = useState(false);
  const [showImportManager, setShowImportManager] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [geofenceOverlays, setGeofenceOverlays] = useState<google.maps.Polygon[]>([]);

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

  const fetchData = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);

      // Fetch places and geofences using xanoService
      const [places, geofences] = await Promise.all([
        xanoService.getPlacesInGeofence(''),
        xanoService.getGeofences()
      ]);

      // Calculate stats
      const totalVisits = places.filter(place => place.is_visited).length;
      const placesToVisit = places.filter(place => !place.is_visited).length;
      const totalGeofences = geofences.length;
      const totalPlaces = places.length;

      setStats({
        totalVisits,
        placesToVisit,
        totalGeofences,
        totalPlaces
      });

      // Update recent activity
      const newActivity: RecentActivity[] = [];
      
      // Add visited places to activity
      places
        .filter(place => place.is_visited && place.date_visited)
        .forEach(place => {
          newActivity.push({
            place,
            action: 'visited',
            timestamp: place.date_visited!
          });
        });

      // Sort by timestamp descending
      newActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Take only the 5 most recent activities
      setRecentActivity(newActivity.slice(0, 5));

      // Update map markers and geofences
      if (map) {
        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));
        const newMarkers: google.maps.Marker[] = [];

        // Add markers for recent activities
        newActivity.forEach(activity => {
          const marker = new google.maps.Marker({
            position: activity.place.location,
            map,
            title: activity.place.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: activity.action === 'visited' ? '#22c55e' : '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });

          // Add info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div>
                <h3>${activity.place.name}</h3>
                <p>${activity.action === 'visited' ? 'Visited' : 'Added'} on ${new Date(activity.timestamp).toLocaleDateString()}</p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          newMarkers.push(marker);
        });

        setMarkers(newMarkers);

        // Update geofence overlays
        geofenceOverlays.forEach(overlay => overlay.setMap(null));
        const newOverlays: google.maps.Polygon[] = [];

        geofences.forEach(geofence => {
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

          newOverlays.push(overlay);
        });

        setGeofenceOverlays(newOverlays);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up interval for background updates
    const intervalId = setInterval(() => fetchData(true), 30000); // 30 seconds

    // Cleanup function to clear interval when component unmounts
    return () => clearInterval(intervalId);
  }, [map]); // Add map as dependency to update markers when map is loaded

  const handleCreateGeofence = () => {
    setShowGeofenceForm(true);
  };

  const handleImportKMZ = () => {
    setShowImportManager(true);
  };

  const handleViewAllPlaces = () => {
    // Navigate to places section
    const placesButton = document.querySelector('button[data-section="places"]');
    if (placesButton instanceof HTMLButtonElement) {
      placesButton.click();
    }
  };

  if (loading && isInitialLoad) {
    return (
      <div className={styles.dashboard}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.loading}>Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Dashboard</h1>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Visits</h3>
          <p className={styles.statValue}>{stats.totalVisits}</p>
          <p className={styles.statLabel}>Places visited</p>
        </div>

        <div className={styles.statCard}>
          <h3>Places to Visit</h3>
          <p className={styles.statValue}>{stats.placesToVisit}</p>
          <p className={styles.statLabel}>Pending visits</p>
        </div>

        <div className={styles.statCard}>
          <h3>Total Geofences</h3>
          <p className={styles.statValue}>{stats.totalGeofences}</p>
          <p className={styles.statLabel}>Saved areas</p>
        </div>

        <div className={styles.statCard}>
          <h3>Total Places</h3>
          <p className={styles.statValue}>{stats.totalPlaces}</p>
          <p className={styles.statLabel}>Saved locations</p>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h2>Recent Activity</h2>
        {isLoaded ? (
          <div className={styles.activityMap}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={greaterAccraCenter}
              zoom={12}
              onLoad={onMapLoad}
            />
          </div>
        ) : (
          <div className={styles.loading}>Loading map...</div>
        )}
        <div className={styles.activityList}>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  {activity.action === 'visited' ? '✓' : '+'}
                </div>
                <div className={styles.activityDetails}>
                  <h4>{activity.place.name}</h4>
                  <p>
                    {activity.action === 'visited' ? 'Visited' : 'Added'} on{' '}
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.emptyState}>No recent activity to display</p>
          )}
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2>Quick Actions</h2>
        <div className={styles.actionButtons}>
          <button 
            className={styles.actionButton}
            onClick={handleCreateGeofence}
          >
            Create New Geofence
          </button>
          <button 
            className={styles.actionButton}
            onClick={handleImportKMZ}
          >
            Import KMZ File
          </button>
          <button 
            className={styles.actionButton}
            onClick={handleViewAllPlaces}
          >
            View All Places
          </button>
        </div>
      </div>

      {showGeofenceForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <GeofenceForm />
            <button 
              className={styles.closeButton}
              onClick={() => setShowGeofenceForm(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showImportManager && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <GeofenceImportManager 
              onImport={(geofences) => {
                console.log('Imported geofences:', geofences);
                setShowImportManager(false);
              }}
              onClose={() => setShowImportManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 