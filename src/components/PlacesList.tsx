import { useState, useEffect } from 'react';
import type { Place } from '../types';
import { useMapContext } from '../context/MapContext';
import { xanoService } from '../services/xanoService';
import { PlaceModal } from './PlaceModal';
import { RouteGenerationModal } from './RouteGenerationModal';
import { ReportGenerationModal } from './ReportGenerationModal';
import { AddPlaceModal } from './AddPlaceModal';
import styles from './PlacesList.module.css';

interface GeofencePagination {
  [geofenceId: string]: {
    currentPage: number;
    itemsPerPage: number;
  };
}

type SortOption = 'name' | 'date' | 'status';
type FilterOption = 'all' | 'visited' | 'not-visited';

const PlaceCard = ({ place, onClick, onDelete }: { place: Place; onClick: () => void; onDelete: () => void }) => (
  <div 
    className={`${styles.placeCard} ${place.is_visited ? styles.visited : ''}`}
    onClick={onClick}
  >
    <div className={styles.placeHeader}>
      <h4>{place.name}</h4>
      <div className={styles.placeActions}>
        <span className={`${styles.statusBadge} ${place.is_visited ? styles.visited : styles.notVisited}`}>
          {place.is_visited ? 'Visited' : 'Not Visited'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={styles.deleteButton}
          title="Delete place"
        >
          ×
        </button>
      </div>
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
  places, 
  geofenceName, 
  currentPage, 
  itemsPerPage, 
  onPlaceClick,
  onPageChange,
  onDeletePlace
}: { 
  places: Place[];
  geofenceName: string;
  currentPage: number;
  itemsPerPage: number;
  onPlaceClick: (place: Place) => void;
  onPageChange: (page: number) => void;
  onDeletePlace: (placeId: string) => void;
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
            onDelete={() => place.id && onDeletePlace(place.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationButton}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className={styles.paginationButton}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {showRouteModal && (
        <RouteGenerationModal
          places={places}
          onClose={() => setShowRouteModal(false)}
        />
      )}
    </div>
  );
};

export const PlacesList = () => {
  const { places, setPlaces } = useMapContext();
  const [placesByGeofence, setPlacesByGeofence] = useState<Record<string, Place[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [pagination, setPagination] = useState<GeofencePagination>({});
  const [geofenceNames, setGeofenceNames] = useState<Record<string, string>>({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch geofences to get names
  useEffect(() => {
    const fetchGeofences = async () => {
      try {
        const geofences = await xanoService.getGeofences();
        const namesMap = geofences.reduce((acc, geofence) => {
          if (geofence.id) {
            acc[geofence.id] = geofence.name;
          }
          return acc;
        }, {} as Record<string, string>);
        setGeofenceNames(namesMap);
      } catch (err) {
        console.error('Error fetching geofences:', err);
      }
    };

    fetchGeofences();
  }, []);

  // Fetch all places when component mounts
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use xanoService to fetch places
        const fetchedPlaces = await xanoService.getPlacesInGeofence('');
        setPlaces(fetchedPlaces);
      } catch (err) {
        console.error('Error fetching places:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch places');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [setPlaces]);

  const getFilteredAndSortedPlaces = (places: Place[]) => {
    // First filter by search query
    let filtered = places.filter(place => 
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Then filter by visit status
    if (filterBy === 'visited') {
      filtered = filtered.filter(place => place.is_visited);
    } else if (filterBy === 'not-visited') {
      filtered = filtered.filter(place => !place.is_visited);
    }

    // Finally sort the results
    return filtered.sort((a, b) => {
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

  // Organize places by geofence whenever places change
  useEffect(() => {
    if (!places) return;
    
    const organized = places.reduce((acc, place) => {
      const geofenceId = place.geofences_id || 'unassigned';
      if (!acc[geofenceId]) {
        acc[geofenceId] = [];
      }
      acc[geofenceId].push(place);
      return acc;
    }, {} as Record<string, Place[]>);

    // Apply filtering and sorting to each geofence's places
    const filteredAndSorted = Object.entries(organized).reduce((acc, [geofenceId, places]) => {
      acc[geofenceId] = getFilteredAndSortedPlaces(places);
      return acc;
    }, {} as Record<string, Place[]>);

    setPlacesByGeofence(filteredAndSorted);
  }, [places, searchQuery, filterBy, sortBy, geofenceNames]);

  // Initialize pagination for each geofence
  useEffect(() => {
    const newPagination = Object.keys(placesByGeofence).reduce((acc, geofenceId) => {
      if (!pagination[geofenceId]) {
        acc[geofenceId] = {
          currentPage: 1,
          itemsPerPage: 5
        };
      } else {
        acc[geofenceId] = pagination[geofenceId];
      }
      return acc;
    }, {} as GeofencePagination);
    
    setPagination(newPagination);
  }, [placesByGeofence]);

  const handlePageChange = (geofenceId: string, page: number) => {
    setPagination(prev => ({
      ...prev,
      [geofenceId]: {
        ...prev[geofenceId],
        currentPage: page
      }
    }));
  };

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

  const handleDeletePlace = async (placeId: string) => {
    try {
      setIsDeleting(true);
      await xanoService.deletePlace(placeId);
      setPlaces(prevPlaces => prevPlaces.filter(place => place.id !== placeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete place');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  const handlePlaceAdded = (newPlace: Place) => {
    setPlaces(prevPlaces => [...prevPlaces, newPlace]);
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
            className={styles.addButton}
            onClick={() => setShowAddPlaceModal(true)}
          >
            ➕ Add Place
          </button>
          <button 
            className={styles.reportButton}
            onClick={() => setShowReportModal(true)}
            disabled={true}
            title="Report generation is temporarily disabled"
          >
            📊 Generate Report
          </button>
        </div>
      </div>

      <div className={styles.placesGrid}>
        {Object.entries(placesByGeofence).map(([geofenceId, places]) => {
          const geofenceName = geofenceNames[geofenceId] || 'Unnamed Geofence';
          return (
            <GeofenceSection
              key={geofenceId}
              places={places}
              geofenceName={geofenceName}
              currentPage={pagination[geofenceId]?.currentPage || 1}
              itemsPerPage={pagination[geofenceId]?.itemsPerPage || 5}
              onPlaceClick={setSelectedPlace}
              onPageChange={(page) => handlePageChange(geofenceId, page)}
              onDeletePlace={(placeId) => setShowDeleteConfirm(placeId)}
            />
          );
        })}
      </div>

      {selectedPlace && (
        <PlaceModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onToggleVisited={toggleVisited}
          onUpdateNotes={updateNotes}
        />
      )}

      {showAddPlaceModal && (
        <AddPlaceModal
          onClose={() => setShowAddPlaceModal(false)}
          onPlaceAdded={handlePlaceAdded}
        />
      )}

      {showReportModal && (
        <ReportGenerationModal
          places={places}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <div className={styles.deleteConfirm}>
          <p>Are you sure you want to delete this place?</p>
          <div className={styles.deleteConfirmActions}>
            <button 
              onClick={() => handleDeletePlace(showDeleteConfirm)}
              className={styles.confirmDeleteButton}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(null)}
              className={styles.cancelDeleteButton}
              disabled={isDeleting}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 