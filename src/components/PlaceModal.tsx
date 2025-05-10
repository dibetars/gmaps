import { useState } from 'react';
import type { Place } from '../types';
import styles from './PlaceModal.module.css';

type Position = 'Manager' | 'Store Clerk' | 'Sales Attendant' | 'Owner';

interface PlaceModalProps {
  place: Place;
  onClose: () => void;
  onToggleVisited: (placeId: string) => Promise<void>;
  onUpdateNotes: (placeId: string, notes: string) => Promise<void>;
}

export const PlaceModal = ({ place, onClose, onToggleVisited, onUpdateNotes }: PlaceModalProps) => {
  const [notes, setNotes] = useState(place.notes || '');
  const [isVisited, setIsVisited] = useState(place.is_visited);
  const [dateVisited, setDateVisited] = useState(place.date_visited || '');
  const [website, setWebsite] = useState(place.website || '');
  const [phoneNumber, setPhoneNumber] = useState(place.phone_number || '');
  const [pointOfContact, setPointOfContact] = useState(place.point_of_contact || '');
  const [position, setPosition] = useState<Position | ''>(place.position || '');
  const [email, setEmail] = useState(place.email || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!place.id) return;
    
    setIsSaving(true);
    try {
      if (isVisited !== place.is_visited) {
        await onToggleVisited(place.id);
      }
      if (notes !== place.notes) {
        await onUpdateNotes(place.id, notes);
      }
      onClose();
    } catch (error) {
      console.error('Error updating place:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{place.name}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {/* Left Column */}
          <div>
            {/* Place Details Section */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Place Details</h3>
              <p className={styles.address}>{place.address}</p>
              
              <div className={styles.placeDetails}>
                <div className={styles.formGroup}>
                  <label className={styles.settingToggle}>
                    <input
                      type="checkbox"
                      checked={isVisited}
                      onChange={e => {
                        setIsVisited(e.target.checked);
                        if (!e.target.checked) {
                          setDateVisited('');
                        } else if (!dateVisited) {
                          setDateVisited(new Date().toISOString().split('T')[0]);
                        }
                      }}
                    />
                    <span>Mark as visited</span>
                  </label>
                </div>

                {isVisited && (
                  <div className={styles.formGroup}>
                    <label htmlFor="dateVisited">Date Visited</label>
                    <input
                      type="date"
                      id="dateVisited"
                      value={dateVisited}
                      onChange={e => setDateVisited(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="website">Website</label>
                  <input
                    type="url"
                    id="website"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 555-5555"
                    className={styles.formInput}
                  />
                </div>
              </div>
            </section>

            {/* Notes Section */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Notes</h3>
              <div className={styles.formGroup}>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes about this place..."
                  rows={4}
                  className={styles.formInput}
                />
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div>
            {/* Contact Person Section */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Contact Person</h3>
              <div className={styles.contactDetails}>
                <div className={styles.formGroup}>
                  <label htmlFor="pointOfContact">Name</label>
                  <input
                    type="text"
                    id="pointOfContact"
                    value={pointOfContact}
                    onChange={e => setPointOfContact(e.target.value)}
                    placeholder="Enter contact name"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="position">Position</label>
                  <select
                    id="position"
                    value={position}
                    onChange={e => setPosition(e.target.value as Position)}
                    className={styles.formInput}
                  >
                    <option value="">Select position</option>
                    <option value="Manager">Manager</option>
                    <option value="Store Clerk">Store Clerk</option>
                    <option value="Sales Attendant">Sales Attendant</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contact@example.com"
                    className={styles.formInput}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.modalButton}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className={`${styles.modalButton} ${styles.primaryButton}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}; 