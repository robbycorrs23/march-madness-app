'use client';
import React, { useState } from 'react';

interface SettingsPanelProps {
  setSuccess: (message: string) => void;
  userEmail: string;
}

interface SettingsData {
  emailNotifications: boolean;
  publicLeaderboard: boolean;
  allowLateEntries: boolean;
  adminEmail: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ setSuccess, userEmail }) => {
  const [settings, setSettings] = useState<SettingsData>({
    emailNotifications: true,
    publicLeaderboard: true,
    allowLateEntries: false,
    adminEmail: userEmail || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Handle settings change
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle settings update
  const handleSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      setSuccess('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      // Could set an error state here
    } finally {
      setIsSaving(false);
    }
  };

  const recalculateScores = async () => {
    if (!window.confirm('Are you sure you want to recalculate all scores? This might take a while.')) {
      return;
    }
    
    setIsRecalculating(true);
    try {
      const response = await fetch('/api/scores/recalculate', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to recalculate scores');
      }
      
      setSuccess('Scores recalculated successfully');
    } catch (error) {
      console.error('Error recalculating scores:', error);
      // Could set an error state here
    } finally {
      setIsRecalculating(false);
    }
  };

  const exportAllData = async () => {
    if (!window.confirm('Are you sure you want to export all data? This will download a CSV file.')) {
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await fetch('/api/export', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'tournament_data.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setSuccess('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      // Could set an error state here
    } finally {
      setIsExporting(false);
    }
  };

  const resetParticipantData = async () => {
    if (!window.confirm('⚠️ WARNING: This will reset all participant data. Are you absolutely sure?')) {
      return;
    }
    
    setIsResetting(true);
    try {
      const response = await fetch('/api/participants/reset', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset participant data');
      }
      
      setSuccess('Participant data reset successfully');
      // Could refresh the page or update state here
    } catch (error) {
      console.error('Error resetting participant data:', error);
      // Could set an error state here
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div>
      <h2 className="admin-section-title">Settings</h2>
      
      <div className="admin-card">
        <div className="admin-card-header">Application Settings</div>
        <div className="admin-card-body">
          <form onSubmit={handleSettingsUpdate}>
            <div className="admin-form-group">
              <label className="admin-form-label">Admin Email</label>
              <input
                type="email"
                name="adminEmail"
                value={settings.adminEmail}
                onChange={handleSettingsChange}
                className="admin-form-input"
                required
              />
              <p className="admin-form-help">
                Email address for receiving notifications and alerts
              </p>
            </div>
            
            <div className="admin-form-group">
              <label className="admin-flex admin-items-center">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={handleSettingsChange}
                  className="mr-2"
                />
                Enable Email Notifications
              </label>
              <p className="admin-form-help">
                Send email notifications for new participants and updates
              </p>
            </div>
            
            <div className="admin-form-group">
              <label className="admin-flex admin-items-center">
                <input
                  type="checkbox"
                  name="publicLeaderboard"
                  checked={settings.publicLeaderboard}
                  onChange={handleSettingsChange}
                  className="mr-2"
                />
                Public Leaderboard
              </label>
              <p className="admin-form-help">
                Make the leaderboard visible to all users
              </p>
            </div>
            
            <div className="admin-form-group">
              <label className="admin-flex admin-items-center">
                <input
                  type="checkbox"
                  name="allowLateEntries"
                  checked={settings.allowLateEntries}
                  onChange={handleSettingsChange}
                  className="mr-2"
                />
                Allow Late Entries
              </label>
              <p className="admin-form-help">
                Allow participants to join after the tournament has started
              </p>
            </div>
            
            <div className="admin-form-actions">
              <button
                type="submit"
                className="admin-btn admin-btn-blue"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">Database Operations</div>
        <div className="admin-card-body">
          <p className="admin-mb-4">
            Use these options with caution. These operations cannot be undone.
          </p>
          
          <div className="admin-actions-buttons">
            <button
              onClick={recalculateScores}
              className="admin-btn admin-btn-blue"
              disabled={isRecalculating}
            >
              {isRecalculating ? 'Recalculating...' : 'Recalculate All Scores'}
            </button>
            
            <button
              onClick={exportAllData}
              className="admin-btn admin-btn-green"
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
            
            <button
              onClick={resetParticipantData}
              className="admin-btn"
              style={{ backgroundColor: '#dc2626' }}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Reset Participant Data'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">System Information</div>
        <div className="admin-card-body">
          <div className="admin-mb-4">
            <h3 className="admin-font-bold admin-mb-2">Application Version</h3>
            <p>March Madness Fantasy v1.0.0</p>
          </div>
          
          <div className="admin-mb-4">
            <h3 className="admin-font-bold admin-mb-2">Database Status</h3>
            <p className="admin-flex admin-items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              Connected
            </p>
          </div>
          
          <div>
            <h3 className="admin-font-bold admin-mb-2">Last Updated</h3>
            <p>{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
