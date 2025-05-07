import { useMapContext } from '../context/MapContext';
import { xanoService } from '../services/xanoService';


export const PlacesList = () => {
  const { places, setPlaces } = useMapContext();

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

  if (places.length === 0) {
    return (
      <div className="places-list">
        No places found in the selected geofence
      </div>
    );
  }

  return (
    <div className="places-list">
      <h2>Places in Geofence</h2>
      <div>
        {places.map((place) => (
          <div key={place.id} className="place-card">
            <div className="place-header">
              <h3>{place.name}</h3>
              <button
                onClick={() => toggleVisited(place.id!)}
                className={`visited-button ${place.is_visited ? 'visited' : 'not-visited'}`}
              >
                {place.is_visited ? 'Visited' : 'Not Visited'}
              </button>
            </div>
            <p>{place.address}</p>
            <textarea
              className="notes-textarea"
              placeholder="Add notes..."
              value={place.notes || ''}
              onChange={(e) => updateNotes(place.id!, e.target.value)}
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}; 