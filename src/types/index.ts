export interface Geofence {
  id?: string;
  name: string;
  type: 'circle' | 'polygon';
  coordinates: google.maps.LatLng[] | google.maps.LatLngLiteral[];
  radius?: number; // For circles
  created_at?: string;
  updated_at?: string;
}

export interface Place {
  id?: string;
  geofence_id: string;
  place_id: string;
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
  is_visited: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  index?: number; // Add index for array ordering
}

export interface MapContextType {
  map: google.maps.Map | null;
  setMap: (map: google.maps.Map) => void;
  drawingManager: google.maps.drawing.DrawingManager | null;
  setDrawingManager: (manager: google.maps.drawing.DrawingManager) => void;
  selectedGeofence: Geofence | null;
  setSelectedGeofence: (geofence: Geofence | null) => void;
  places: Place[];
  setPlaces: (places: Place[]) => void;
} 