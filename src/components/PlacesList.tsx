import { useState, useEffect, useCallback } from 'react';
import type { Place, Geofence } from '../types';
import { useMapContext } from '../context/MapContext';
import { xanoService } from '../services/xanoService';
import { PlaceModal } from './PlaceModal';
import { RouteGenerationModal } from './RouteGenerationModal';
import { ReportGenerationModal } from './ReportGenerationModal';
import styles from './PlacesList.module.css';

interface GeofencePagination {
  [geofenceId: string]: {
    currentPage: number;
    itemsPerPage: number;
  };
}

interface WeeklyReport {
  totalVisits: number;
  visitsByDay: {
    [date: string]: {
      count: number;
      places: Place[];
    };
  };
}

type SortOption = 'name' | 'date' | 'status';
type FilterOption = 'all' | 'visited' | 'not-visited';

const PlaceCard = ({ place, onClick }: { place: Place; onClick: () => void }) => (
  <div 
    className={`${styles.placeCard} ${place.is_visited ? styles.visited : ''}`}
    onClick={onClick}
  >
    <div className={styles.placeHeader}>
      <h4>{place.name}</h4>
      <span className={`${styles.statusBadge} ${place.is_visited ? styles.visited : styles.notVisited}`}>
        {place.is_visited ? 'Visited' : 'Not Visited'}
      </span>
    </div>
    <p className={styles.placeAddress}>{place.address}</p>
    {place.is_visited && place.date_visited && (
      <p className={styles.visitDate}>
        Visited on {new Date(place.date_visited).toLocaleDateString()}
      </p>
    )}
    <div className={styles.placeContact}>
      {place.website && (
        <a 
          href={place.website} 
          target="_blank" 
          rel="noopener noreferrer" 
          onClick={e => e.stopPropagation()}
          className={styles.placeLink}
        >
          🌐 Website
        </a>
      )}
      {place.phone_number && (
        <a 
          href={`tel:${place.phone_number}`} 
          onClick={e => e.stopPropagation()}
          className={styles.placeLink}
        >
          📞 {place.phone_number}
        </a>
      )}
    </div>
    {place.notes && (
      <p className={styles.placeNotes}>{place.notes}</p>
    )}
  </div>
);

const GeofenceSection = ({ 
  geofenceId, 
  places, 
  geofenceName, 
  currentPage, 
  itemsPerPage, 
  onPageChange,
  onPlaceClick 
}: { 
  geofenceId: string;
  places: Place[];
  geofenceName: string;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPlaceClick: (place: Place) => void;
}) => {
  const [showRouteModal, setShowRouteModal] = useState(false);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlaces = places.slice(startIndex, endIndex);
  const totalPages = Math.ceil(places.length / itemsPerPage);

  return (
    <div className={styles.geofenceColumn}>
      <div className={styles.geofenceHeader}>
        <div className={styles.geofenceTitle}>
          <h3>{geofenceName}</h3>
          <span className={styles.placesCount}>{places.length} places</span>
        </div>
        <div className={styles.routeControls}>
          <button 
            className={styles.routeButton}
            onClick={() => setShowRouteModal(true)}
            title="Generate route for all places in this geofence"
          >
            🗺️ Generate Route
          </button>
        </div>
      </div>
      <div className={styles.geofencePlaces}>
        {currentPlaces.map(place => (
          <PlaceCard
            key={place.id}
            place={place}
            onClick={() => onPlaceClick(place)}
          />
        ))}
      </div>

      {showRouteModal && (
        <RouteGenerationModal
          places={places}
          onClose={() => setShowRouteModal(false)}
        />
      )}
    </div>
  );
};

const WeeklyReportPanel = ({ 
  report, 
  onClose, 
  onDownload 
}: { 
  report: WeeklyReport;
  onClose: () => void;
  onDownload: () => void;
}) => (
  <div className={styles.weeklyReport}>
    <div className={styles.reportHeader}>
      <h2>Weekly Visits Report</h2>
      <div className={styles.reportActions}>
        <button 
          className={styles.downloadButton}
          onClick={onDownload}
        >
          Download Report
        </button>
        <button 
          className={styles.closeButton}
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
    <div className={styles.reportContent}>
      <div className={styles.reportSummary}>
        <h3>Summary</h3>
        <p>Total Visits: {report.totalVisits}</p>
      </div>
      <div className={styles.visitsByDay}>
        <h3>Visits by Day</h3>
        {Object.entries(report.visitsByDay).map(([date, data]) => (
          <div key={date} className={styles.dayEntry}>
            <h4>
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h4>
            <p>Visits: {data.count}</p>
            {data.places.length > 0 && (
              <ul>
                {data.places.map(place => (
                  <li key={place.id}>
                    {place.name} - {place.address}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const PlacesList = () => {
  const { places, setPlaces, geofences, setGeofences } = useMapContext();
  const [placesByGeofence, setPlacesByGeofence] = useState<Record<string, Place[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [pagination, setPagination] = useState<GeofencePagination>({});
  const [geofenceNames, setGeofenceNames] = useState<Record<string, string>>({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleVisited = async (placeId: string) => {
    const updatedPlaces = places.map(place => 
      place.id === placeId 
        ? { ...place, is_visited: !place.is_visited }
        : place
    );
    setPlaces(updatedPlaces);

    // Find the updated place
    const updatedPlace = updatedPlaces.find(p => p.id === placeId);
    if (updatedPlace) {
      try {
        await xanoService.updatePlace(updatedPlace);
      } catch (error) {
        console.error('Error updating place:', error);
        // Revert the change if the update fails
        setPlaces(places);
      }
    }
  };

  const updateNotes = async (placeId: string, notes: string) => {
    const updatedPlaces = places.map(place =>
      place.id === placeId
        ? { ...place, notes }
        : place
    );
    setPlaces(updatedPlaces);

    // Find the updated place
    const updatedPlace = updatedPlaces.find(p => p.id === placeId);
    if (updatedPlace) {
      try {
        await xanoService.updatePlace(updatedPlace);
      } catch (error) {
        console.error('Error updating place:', error);
        // Revert the change if the update fails
        setPlaces(places);
      }
    }
  };

  const organizePlacesByGeofence = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch places
      const placesResponse = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:jMKnESWk/places');
      const places: Place[] = await placesResponse.json();
      
      // Fetch geofences to get their names
      const geofencesResponse = await fetch('https://x8ki-letl-twmt.n7.xano.io/api:jMKnESWk/geofences');
      const geofences = await geofencesResponse.json();
      
      // Create a map of geofence IDs to names
      const namesMap = geofences.reduce((acc: Record<string, string>, geofence: any) => {
        acc[geofence.id] = geofence.name;
        return acc;
      }, {});
      setGeofenceNames(namesMap);
      
      // Group places by geofence_id
      const groupedPlaces = places.reduce((acc, place) => {
        const geofenceId = place.geofence_id;
        if (!acc[geofenceId]) {
          acc[geofenceId] = [];
        }
        acc[geofenceId].push(place);
        return acc;
      }, {} as Record<string, Place[]>);

      setPlacesByGeofence(groupedPlaces);

      // Initialize pagination for each geofence
      const initialPagination = Object.keys(groupedPlaces).reduce((acc, geofenceId) => {
        acc[geofenceId] = {
          currentPage: 1,
          itemsPerPage: 5
        };
        return acc;
      }, {} as GeofencePagination);
      setPagination(initialPagination);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const places = await xanoService.getPlacesInGeofence('');
        const geofences = await xanoService.getGeofences();
        
        setPlaces(places);
        setGeofences(geofences);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handlePlaceUpdate = (updatedPlace: Place) => {
    setPlaces((prevPlaces: Place[]) => 
      prevPlaces.map((place: Place) => 
        place.id === updatedPlace.id ? updatedPlace : place
      )
    );
    
    setPlacesByGeofence((prev: Record<string, Place[]>) => {
      const newPlacesByGeofence = { ...prev };
      const geofencePlaces = newPlacesByGeofence[updatedPlace.geofence_id] || [];
      const updatedPlaces = geofencePlaces.map((place: Place) =>
        place.id === updatedPlace.id ? updatedPlace : place
      );
      newPlacesByGeofence[updatedPlace.geofence_id] = updatedPlaces;
      return newPlacesByGeofence;
    });
  };

  const handlePageChange = (geofenceId: string, newPage: number) => {
    setPagination(prev => ({
      ...prev,
      [geofenceId]: {
        ...prev[geofenceId],
        currentPage: newPage
      }
    }));
  };

  const sortPlaces = (places: Place[]): Place[] => {
    return [...places].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          if (!a.date_visited && !b.date_visited) return 0;
          if (!a.date_visited) return 1;
          if (!b.date_visited) return -1;
          return new Date(b.date_visited).getTime() - new Date(a.date_visited).getTime();
        case 'status':
          if (a.is_visited === b.is_visited) return 0;
          return a.is_visited ? -1 : 1;
        default:
          return 0;
      }
    });
  };

  const filterPlaces = (places: Place[]): Place[] => {
    return places.filter(place => {
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'visited' && place.is_visited) ||
        (filterBy === 'not-visited' && !place.is_visited);
      
      const matchesSearch = searchQuery === '' ||
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (place.notes && place.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  };

  if (isLoading) {
    return (
      <div className={styles.placesContainer}>
        <div className={styles.loading}>Loading places...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.placesContainer}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.placesContainer}>
      <div className={styles.header}>
        <h1>Places</h1>
        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filters}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={styles.select}
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
            </select>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className={styles.select}
            >
              <option value="all">All Places</option>
              <option value="visited">Visited</option>
              <option value="not-visited">Not Visited</option>
            </select>
          </div>
          <button 
            className={styles.reportButton}
            onClick={() => setShowReportModal(true)}
          >
            📊 Generate Report
          </button>
        </div>
      </div>

      <div className={styles.placesGrid}>
        {Object.entries(placesByGeofence).map(([geofenceId, places]) => (
          <GeofenceSection
            key={geofenceId}
            geofenceId={geofenceId}
            places={places}
            geofenceName={geofenceNames[geofenceId] || 'Unnamed Geofence'}
            currentPage={pagination[geofenceId]?.currentPage || 1}
            itemsPerPage={pagination[geofenceId]?.itemsPerPage || 10}
            onPageChange={(page) => handlePageChange(geofenceId, page)}
            onPlaceClick={setSelectedPlace}
          />
        ))}
      </div>

      {selectedPlace && (
        <PlaceModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onToggleVisited={toggleVisited}
          onUpdateNotes={updateNotes}
        />
      )}

      {showReportModal && (
        <ReportGenerationModal
          places={places}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}; 