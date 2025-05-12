import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { MapContextType, Geofence, Place } from '../types';

const MapContext = createContext<MapContextType | null>(null);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  return (
    <MapContext.Provider
      value={{
        map,
        setMap,
        drawingManager,
        setDrawingManager,
        selectedGeofence,
        setSelectedGeofence,
        places,
        setPlaces,
        geofences,
        setGeofences,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}; 