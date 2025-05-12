import { useState } from 'react';
import type { Geofence } from '../types';
import styles from './GeofenceEdit.module.css';

interface GeofenceEditProps {
  geofence: Geofence;
  onSave: (updatedGeofence: Geofence) => void;
  onCancel: () => void;
}

export const GeofenceEdit = ({ geofence, onSave, onCancel }: GeofenceEditProps) => {
  const [name, setName] = useState(geofence.name);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    onSave({
      ...geofence,
      name: name.trim()
    });
  };

  return (
    <div className={styles.editPanel}>
      <div className={styles.panelHeader}>
        <h3>Edit Geofence</h3>
        <button onClick={onCancel} className={styles.closeButton}>×</button>
      </div>
      <div className={styles.editForm}>
        <div className={styles.formGroup}>
          <label htmlFor="geofenceName">Name</label>
          <input
            id="geofenceName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter geofence name"
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}
        </div>
        <div className={styles.buttonGroup}>
          <button onClick={handleSave} className={styles.saveButton}>
            Save Changes
          </button>
          <button onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}; 