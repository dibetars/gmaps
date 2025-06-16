import { useState, useRef } from 'react';
import type { Geofence } from '../types';
import styles from './GeofenceImportManager.module.css';
import JSZip from 'jszip';
import { xanoService } from '../services/xanoService';
import { useLoadScript } from '@react-google-maps/api';

interface GeofenceImportManagerProps {
  onImport: (geofences: Geofence[], isTemporary?: boolean) => void;
  onClose: () => void;
}

const libraries: ("places" | "drawing" | "geometry")[] = ["places", "drawing", "geometry"];

export const GeofenceImportManager = ({ onImport, onClose }: GeofenceImportManagerProps) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries
  });

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importedGeofences, setImportedGeofences] = useState<Geofence[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [subdivisionDistance, setSubdivisionDistance] = useState<number>(4); // Default 4km
  const [isSubdividing, setIsSubdividing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const parseKML = (kmlContent: string): Geofence[] => {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
    const geofences: Geofence[] = [];

    // Find all Placemark elements
    const placemarks = kmlDoc.getElementsByTagName('Placemark');
    
    Array.from(placemarks).forEach((placemark) => {
      const name = placemark.getElementsByTagName('name')[0]?.textContent || 'Imported Geofence';
      const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent;

      if (coordinates) {
        // Parse coordinates string into array of lat/lng pairs
        const coordPairs = coordinates.trim().split(' ').map(coord => {
          const [lng, lat] = coord.split(',').map(Number);
          return { lat, lng };
        });

        if (coordPairs.length > 0) {
          geofences.push({
            name,
            type: 'polygon',
            coordinates: coordPairs,
          });
        }
      }
    });

    return geofences;
  };

  const processFile = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate file type
      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (!fileExtension || !['kmz', 'kml'].includes(fileExtension)) {
        throw new Error('Please upload a valid KMZ or KML file');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      let kmlContent: string;

      if (fileExtension === 'kmz') {
        // Process KMZ file
        const arrayBuffer = await file.arrayBuffer();
        
        // Validate that we have data
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('Failed to read file data');
        }

      const zip = new JSZip();
        try {
          const zipContent = await zip.loadAsync(arrayBuffer, {
            checkCRC32: true,
            optimizedBinaryString: true
          });
      
      // Find the KML file in the KMZ
          const kmlFile = Object.values(zipContent.files).find(file => 
            file.name.toLowerCase().endsWith('.kml')
          );
      
      if (!kmlFile) {
        throw new Error('No KML file found in the KMZ archive');
      }

          kmlContent = await kmlFile.async('text');
        } catch (zipError) {
          console.error('JSZip error:', zipError);
          throw new Error('Invalid KMZ file format. Please ensure the file is a valid KMZ archive.');
        }
      } else {
        // Process KML file directly
        kmlContent = await file.text();
      }

      const geofences = parseKML(kmlContent);

      if (geofences.length === 0) {
        throw new Error('No valid geofences found in the file');
      }

      setImportedGeofences(geofences);
      setShowPreview(true);
    } catch (err) {
      console.error('File processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.toLowerCase().endsWith('.kmz') || file.name.toLowerCase().endsWith('.kml'))) {
      await processFile(file);
    } else {
      setError('Please upload a valid KMZ or KML file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.toLowerCase().endsWith('.kmz') || file.name.toLowerCase().endsWith('.kml'))) {
      await processFile(file);
    } else {
      setError('Please select a valid KMZ or KML file');
    }
  };

  const handleSaveToDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Save each geofence to the database
      const savedGeofences = await Promise.all(
        importedGeofences.map(async (geofence) => {
          return await xanoService.saveGeofence(geofence);
        })
      );

      onImport(savedGeofences, false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save geofences to database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOnly = () => {
    onImport(importedGeofences, true);
    onClose();
  };

  const subdividePolygon = (polygon: Geofence, distanceKm: number): Geofence[] => {
    if (polygon.type !== 'polygon') return [polygon];

    const subdividedGeofences: Geofence[] = [];
    const coordinates = polygon.coordinates.map(coord => 
      coord instanceof google.maps.LatLng ? coord : new google.maps.LatLng(coord.lat, coord.lng)
    );

    // Calculate the bounding box of the polygon
    const bounds = new google.maps.LatLngBounds();
    coordinates.forEach(coord => bounds.extend(coord));

    // Get the center of the bounding box
    const center = bounds.getCenter();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    // Calculate the width and height in kilometers
    const width = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(center.lat(), sw.lng()),
      new google.maps.LatLng(center.lat(), ne.lng())
    ) / 1000; // Convert to km

    const height = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(sw.lat(), center.lng()),
      new google.maps.LatLng(ne.lat(), center.lng())
    ) / 1000; // Convert to km

    // Calculate number of subdivisions needed
    const numSubdivisionsX = Math.ceil(width / distanceKm);
    const numSubdivisionsY = Math.ceil(height / distanceKm);

    // Create grid of sub-polygons
    for (let i = 0; i < numSubdivisionsX; i++) {
      for (let j = 0; j < numSubdivisionsY; j++) {
        const subBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(
            sw.lat() + (j * height / numSubdivisionsY),
            sw.lng() + (i * width / numSubdivisionsX)
          ),
          new google.maps.LatLng(
            sw.lat() + ((j + 1) * height / numSubdivisionsY),
            sw.lng() + ((i + 1) * width / numSubdivisionsX)
          )
        );

        // Create a polygon for this subdivision
        const subPolygon = new google.maps.Polygon({
          paths: [
            subBounds.getNorthEast(),
            new google.maps.LatLng(subBounds.getNorthEast().lat(), subBounds.getSouthWest().lng()),
            subBounds.getSouthWest(),
            new google.maps.LatLng(subBounds.getSouthWest().lat(), subBounds.getNorthEast().lng())
          ]
        });

        // Check if the original polygon intersects with this subdivision
        const intersection = google.maps.geometry.poly.containsLocation(
          subBounds.getCenter(),
          new google.maps.Polygon({ paths: coordinates })
        );

        if (intersection) {
          // Generate a unique ID using timestamp and random string
          const uniqueId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          subdividedGeofences.push({
            id: uniqueId,
            name: `${polygon.name} - Sub ${i * numSubdivisionsY + j + 1}`,
            type: 'polygon',
            coordinates: subPolygon.getPath().getArray(),
            metadata: {
              subdivision_index: i * numSubdivisionsY + j + 1,
              original_name: polygon.name
            }
          });
        }
      }
    }

    return subdividedGeofences;
  };

  const handleSubdivide = () => {
    if (!isLoaded) {
      setError('Google Maps API is not loaded yet. Please try again.');
      return;
    }

    setIsSubdividing(true);
    try {
      const subdividedGeofences = importedGeofences.flatMap(geofence => 
        subdividePolygon(geofence, subdivisionDistance)
      );
      setImportedGeofences(subdividedGeofences);
    } catch (error) {
      console.error('Error subdividing polygons:', error);
      setError('Failed to subdivide polygons. Please try again.');
    } finally {
      setIsSubdividing(false);
    }
  };

  const renderPreview = () => {
    if (!showPreview) return null;

    return (
      <div className={styles.previewSection}>
        <h3>Imported Geofences ({importedGeofences.length})</h3>
        
        <div className={styles.subdivisionControls}>
          <label>
            Subdivision Distance (km):
            <select 
              value={subdivisionDistance} 
              onChange={(e) => setSubdivisionDistance(Number(e.target.value))}
              disabled={isSubdividing}
            >
              <option value={2}>2 km</option>
              <option value={4}>4 km</option>
              <option value={8}>8 km</option>
              <option value={16}>16 km</option>
            </select>
          </label>
          <button 
            onClick={handleSubdivide}
            disabled={isSubdividing}
            className={styles.subdivideButton}
          >
            {isSubdividing ? 'Subdividing...' : 'Subdivide Polygons'}
          </button>
        </div>

        <div className={styles.geofenceList}>
          {importedGeofences.map((geofence, index) => (
            <div key={index} className={styles.geofenceItem}>
              <span className={styles.geofenceName}>{geofence.name}</span>
              <span className={styles.geofenceType}>{geofence.type}</span>
              <span className={styles.coordinatesCount}>
                {geofence.coordinates.length} points
              </span>
            </div>
          ))}
        </div>
        <div className={styles.actionButtons}>
          <button 
            onClick={handleSaveToDatabase}
            className={styles.saveButton}
            disabled={isLoading}
          >
            Save to Database
          </button>
          <button 
            onClick={handleViewOnly}
            className={styles.viewButton}
            disabled={isLoading}
          >
            View Only
          </button>
        </div>
      </div>
    );
  };

  if (loadError) {
    return <div className={styles.error}>Error loading Google Maps API</div>;
  }

  if (!isLoaded) {
    return <div className={styles.loading}>Loading Google Maps API...</div>;
  }

  return (
    <div className={styles.importPanel}>
      <div className={styles.panelHeader}>
        <h3>Import Geofences</h3>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>
      
      {!showPreview ? (
        <div 
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".kmz,.kml"
            onChange={handleFileSelect}
            className={styles.fileInput}
          />
          <div className={styles.dropContent}>
            <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p>Drag and drop a KMZ or KML file here</p>
            <p className={styles.orText}>or</p>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className={styles.browseButton}
            >
              Browse Files
            </button>
          </div>
        </div>
      ) : renderPreview()}

      {isLoading && (
        <div className={styles.loading}>
          {showPreview ? 'Saving geofences...' : 'Processing file...'}
        </div>
      )}
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}; 