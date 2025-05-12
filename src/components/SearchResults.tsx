import { useState } from 'react';
import type { Place } from '../types';

interface SearchResultsProps {
  places: Place[];
}

export function SearchResults({ places }: SearchResultsProps) {
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleSelectAll = () => {
    if (selectedPlaces.size === currentPlaces.length) {
      setSelectedPlaces(new Set());
    } else {
      setSelectedPlaces(new Set(currentPlaces.map(place => place.id!)));
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(places.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlaces = places.slice(startIndex, endIndex);

  return (
    <div className="search-results">
      <div className="search-results-header">
        <div className="search-results-title">
          <h3>Found Places</h3>
          <span className="places-count">{places.length} places</span>
          <div className="select-all-container">
            <label className="select-all-label">
              <input
                type="checkbox"
                checked={selectedPlaces.size === currentPlaces.length}
                onChange={handleSelectAll}
              />
              <span>Select All</span>
            </label>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        )}
      </div>
      <div className="places-list">
        {currentPlaces.map((place) => (
          <div key={place.id} className="place-item">
            <div className="place-info">
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
          </div>
        ))}
      </div>
    </div>
  );
} 