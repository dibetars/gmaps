import React, { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import styles from '../Dashboard.module.css';

interface RestaurantStats {
  totalActive: number;
  pendingApproval: number;
  totalRejected: number;
  averageRating: number;
}

interface RestaurantActivity {
  restaurant: {
    name: string;
    status: string;
    timestamp: string;
    location: {
      lat: number;
      lng: number;
    };
  };
  action: 'approved' | 'rejected' | 'pending';
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

const Restaurants: React.FC = () => {
  const [stats, setStats] = useState<RestaurantStats>({
    totalActive: 45,
    pendingApproval: 12,
    totalRejected: 8,
    averageRating: 4.2
  });
  const [recentActivity, setRecentActivity] = useState<RestaurantActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

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

      // Mock recent activity data - replace with actual API call
      const mockActivity: RestaurantActivity[] = [
        {
          restaurant: {
            name: "Tasty Kitchen",
            status: "Approved",
            timestamp: new Date().toISOString(),
            location: { lat: 5.6037, lng: -0.1870 }
          },
          action: "approved"
        },
        {
          restaurant: {
            name: "Spice House",
            status: "Pending",
            timestamp: new Date().toISOString(),
            location: { lat: 5.6137, lng: -0.1770 }
          },
          action: "pending"
        },
        {
          restaurant: {
            name: "Local Delights",
            status: "Rejected",
            timestamp: new Date().toISOString(),
            location: { lat: 5.5937, lng: -0.1970 }
          },
          action: "rejected"
        }
      ];

      setRecentActivity(mockActivity);

      // Update map markers
      if (map) {
        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));
        const newMarkers: google.maps.Marker[] = [];

        mockActivity.forEach(activity => {
          const marker = new google.maps.Marker({
            position: activity.restaurant.location,
            map,
            title: activity.restaurant.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: activity.action === 'approved' ? '#22c55e' : 
                        activity.action === 'pending' ? '#eab308' : '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div>
                <h3>${activity.restaurant.name}</h3>
                <p>Status: ${activity.restaurant.status}</p>
                <p>Updated: ${new Date(activity.restaurant.timestamp).toLocaleDateString()}</p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          newMarkers.push(marker);
        });

        setMarkers(newMarkers);
      }
    } catch (err) {
      setError('Failed to fetch restaurant data');
      console.error('Error fetching restaurant data:', err);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(intervalId);
  }, [map]);

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <h1 className={styles.title}>Restaurants</h1>
        <div className={styles.loading}>Loading restaurant data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <h1 className={styles.title}>Restaurants</h1>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Restaurants</h1>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Active Restaurants</h3>
          <p className={styles.statValue}>{stats.totalActive}</p>
          <p className={styles.statLabel}>Currently operating</p>
        </div>

        <div className={styles.statCard}>
          <h3>Pending Approval</h3>
          <p className={styles.statValue}>{stats.pendingApproval}</p>
          <p className={styles.statLabel}>Awaiting review</p>
        </div>

        <div className={styles.statCard}>
          <h3>Rejected</h3>
          <p className={styles.statValue}>{stats.totalRejected}</p>
          <p className={styles.statLabel}>Not approved</p>
        </div>

        <div className={styles.statCard}>
          <h3>Average Rating</h3>
          <p className={styles.statValue}>{stats.averageRating}</p>
          <p className={styles.statLabel}>Customer satisfaction</p>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h2>Restaurant Locations</h2>
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
                <div className={styles.activityIcon} style={{
                  backgroundColor: activity.action === 'approved' ? '#22c55e' : 
                                 activity.action === 'pending' ? '#eab308' : '#ef4444'
                }}>
                  {activity.action === 'approved' ? '✓' : 
                   activity.action === 'pending' ? '⌛' : '✕'}
                </div>
                <div className={styles.activityDetails}>
                  <h4>{activity.restaurant.name}</h4>
                  <p>
                    Status: {activity.restaurant.status} - Updated on{' '}
                    {new Date(activity.restaurant.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.emptyState}>No recent restaurant activity to display</p>
          )}
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2>Quick Actions</h2>
        <div className={styles.actionButtons}>
          <button className={styles.actionButton}>
            Add New Restaurant
          </button>
          <button className={styles.actionButton}>
            Review Pending
          </button>
          <button className={styles.actionButton}>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Restaurants; 