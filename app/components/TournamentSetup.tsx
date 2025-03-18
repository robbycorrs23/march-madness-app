'use client';
import { useState } from 'react';

// Define TypeScript interfaces
interface Tournament {
  id?: number;
  name: string;
  year: number;
  entryFee: number;
  currentRound: string;
  regions: string[];
}

interface TournamentSetupProps {
  existingTournament?: Tournament;
  onSetupComplete?: (tournament: Tournament) => void;
}

const TournamentSetup: React.FC<TournamentSetupProps> = ({ existingTournament, onSetupComplete }) => {
  const [step, setStep] = useState(existingTournament ? 'teams' : 'details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tournamentData, setTournamentData] = useState<Tournament>(existingTournament || {
    name: 'March Madness Fantasy 2025',
    year: 2025,
    entryFee: 25,
    currentRound: 'Pre-Tournament',
    regions: ['East', 'West', 'South', 'Midwest']
  });

  // Save tournament details
  const saveTournamentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/tournament', {
        method: existingTournament ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tournamentData),
      });
      if (!response.ok) {
        throw new Error('Failed to save tournament details');
      }
      const savedTournament: Tournament = await response.json();
      setTournamentData(savedTournament);
      setSuccess('Tournament details saved successfully!');
      setStep('teams');
      if (onSetupComplete) {
        onSetupComplete(savedTournament);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'regions') {
      // Split comma-separated regions
      setTournamentData({
        ...tournamentData,
        regions: value.split(',').map(region => region.trim()),
      });
    } else if (name === 'entryFee' || name === 'year') {
      // Convert numeric fields
      setTournamentData({
        ...tournamentData,
        [name]: parseFloat(value),
      });
    } else {
      setTournamentData({
        ...tournamentData,
        [name]: value,
      });
    }
  };

  // Render tournament details step
  const renderDetailsStep = () => (
    <div className="setup-step">
      <h3 className="step-title">Tournament Details</h3>
      <form onSubmit={saveTournamentDetails} className="setup-form">
        <div className="form-group">
          <label className="form-label">Tournament Name</label>
          <input
            type="text"
            name="name"
            value={tournamentData.name}
            onChange={handleChange}
            className="form-input"
            required
          />
       </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Year</label>
            <input
              type="number"
              name="year"
              value={tournamentData.year}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Entry Fee ($)</label>
            <input
              type="number"
              name="entryFee"
              value={tournamentData.entryFee}
              onChange={handleChange}
              className="form-input"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Regions (comma-separated)</label>
          <input
            type="text"
            name="regions"
            value={tournamentData.regions.join(', ')}
            onChange={handleChange}
            className="form-input"
            required
          />
          <div className="form-help-text">
            Standard regions are East, West, South, and Midwest
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Starting Round</label>
          <select
            name="currentRound"
            value={tournamentData.currentRound}
            onChange={handleChange}
            className="form-select"
            required
          >
            <option value="Pre-Tournament">Pre-Tournament</option>
            <option value="Round of 64">Round of 64</option>
            <option value="Round of 32">Round of 32</option>
            <option value="Sweet 16">Sweet 16</option>
            <option value="Elite 8">Elite 8</option>
            <option value="Final Four">Final Four</option>
            <option value="Championship">Championship</option>
          </select>
        </div>
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : existingTournament ? 'Update Tournament' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </div>
  );

  // Render teams step (placeholder - will be replaced by TeamImport component)
  const renderTeamsStep = () => (
    <div className="setup-step">
      <h3 className="step-title">Import Teams</h3>
      <p className="step-description">
        Now that you've set up your tournament, you can import the teams. You'll be able to:
      </p>
      <ul className="feature-list">
        <li>Upload teams via CSV</li>
        <li>Add teams manually</li>
        <li>Generate the tournament bracket</li>
      </ul>
    </div>
  );

  return (
    <div className="tournament-setup">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}
      <div className="setup-card">
        {step === 'details' && renderDetailsStep()}
        {step === 'teams' && renderTeamsStep()}
      </div>
    </div>
  );
};

export default TournamentSetup;