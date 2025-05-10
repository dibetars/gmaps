import { useState, useRef } from 'react';
import type { Geofence } from '../types';
import styles from './GeofenceImportManager.module.css';
import JSZip from 'jszip';
import { xanoService } from '../services/xanoService';

interface GeofenceImportManagerProps {
  onImport: (geofences: Geofence[], isTemporary?: boolean) => void;
  onClose: () => void;
}

export const GeofenceImportManager = ({ onImport, onClose }: GeofenceImportManagerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importedGeofences, setImportedGeofences] = useState<Geofence[]>([]);
  const [showPreview, setShowPreview] = useState(false);
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

  const processKMZFile = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);

      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Find the KML file in the KMZ
      const kmlFile = Object.values(zipContent.files).find(file => file.name.endsWith('.kml'));
      
      if (!kmlFile) {
        throw new Error('No KML file found in the KMZ archive');
      }

      const kmlContent = await kmlFile.async('text');
      const geofences = parseKML(kmlContent);

      if (geofences.length === 0) {
        throw new Error('No valid geofences found in the file');
      }

      setImportedGeofences(geofences);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process KMZ file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.kmz')) {
      await processKMZFile(file);
    } else {
      setError('Please upload a valid KMZ file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.kmz')) {
      await processKMZFile(file);
    } else {
      setError('Please select a valid KMZ file');
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

  const renderPreview = () => {
    if (!showPreview) return null;

    return (
      <div className={styles.previewSection}>
        <h3>Imported Geofences ({importedGeofences.length})</h3>
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
            accept=".kmz"
            onChange={handleFileSelect}
            className={styles.fileInput}
          />
          <div className={styles.dropContent}>
            <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p>Drag and drop a KMZ file here</p>
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