import React, { useState } from 'react';
import styles from './Settings.module.css';

interface SettingsState {
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    visitReminders: boolean;
  };
  mapDisplay: {
    showPlaces: boolean;
    showGeofences: boolean;
    showHexagons: boolean;
    defaultZoom: number;
  };
  preferences: {
    darkMode: boolean;
    language: string;
    units: 'metric' | 'imperial';
  };
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      emailNotifications: false,
      pushNotifications: false,
      visitReminders: true,
    },
    mapDisplay: {
      showPlaces: true,
      showGeofences: true,
      showHexagons: true,
      defaultZoom: 12,
    },
    preferences: {
      darkMode: false,
      language: 'en',
      units: 'metric',
    },
  });

  const handleNotificationChange = (key: keyof SettingsState['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handleMapDisplayChange = (key: keyof SettingsState['mapDisplay']) => {
    setSettings(prev => ({
      ...prev,
      mapDisplay: {
        ...prev.mapDisplay,
        [key]: !prev.mapDisplay[key],
      },
    }));
  };

  const handleZoomChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      mapDisplay: {
        ...prev.mapDisplay,
        defaultZoom: value,
      },
    }));
  };

  const handlePreferenceChange = (key: keyof SettingsState['preferences'], value: any) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value,
      },
    }));
  };

  return (
    <div className={styles.settings}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2>Notifications</h2>
        <div className={styles.options}>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.notifications.emailNotifications}
              onChange={() => handleNotificationChange('emailNotifications')}
            />
            <span>Email Notifications</span>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.notifications.pushNotifications}
              onChange={() => handleNotificationChange('pushNotifications')}
            />
            <span>Push Notifications</span>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.notifications.visitReminders}
              onChange={() => handleNotificationChange('visitReminders')}
            />
            <span>Visit Reminders</span>
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Map Display</h2>
        <div className={styles.options}>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.mapDisplay.showPlaces}
              onChange={() => handleMapDisplayChange('showPlaces')}
            />
            <span>Show Places</span>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.mapDisplay.showGeofences}
              onChange={() => handleMapDisplayChange('showGeofences')}
            />
            <span>Show Geofences</span>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.mapDisplay.showHexagons}
              onChange={() => handleMapDisplayChange('showHexagons')}
            />
            <span>Show Hexagonal Areas</span>
          </label>
          <div className={styles.rangeOption}>
            <label>Default Zoom Level</label>
            <input
              type="range"
              min="1"
              max="20"
              value={settings.mapDisplay.defaultZoom}
              onChange={(e) => handleZoomChange(parseInt(e.target.value))}
            />
            <span>{settings.mapDisplay.defaultZoom}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Preferences</h2>
        <div className={styles.options}>
          <label className={styles.option}>
            <input
              type="checkbox"
              checked={settings.preferences.darkMode}
              onChange={() => handlePreferenceChange('darkMode', !settings.preferences.darkMode)}
            />
            <span>Dark Mode</span>
          </label>
          <div className={styles.selectOption}>
            <label>Language</label>
            <select
              value={settings.preferences.language}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div className={styles.selectOption}>
            <label>Units</label>
            <select
              value={settings.preferences.units}
              onChange={(e) => handlePreferenceChange('units', e.target.value)}
            >
              <option value="metric">Metric (km)</option>
              <option value="imperial">Imperial (mi)</option>
            </select>
          </div>
        </div>
      </section>

      <div className={styles.actions}>
        <button className={styles.saveButton}>Save Changes</button>
        <button className={styles.resetButton}>Reset to Defaults</button>
      </div>
    </div>
  );
};

export default Settings; 