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
    <div>
      <h3 className="text-lg font-semibold mb-4">Tournament Details</h3>
      <form onSubmit={saveTournamentDetails} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Name</label>
          <input
            type="text"
            name="name"
            value={tournamentData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
       </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              name="year"
              value={tournamentData.year}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entry Fee ($)</label>
            <input
              type="number"
              name="entryFee"
              value={tournamentData.entryFee}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Regions (comma-separated)</label>
          <input
            type="text"
            name="regions"
            value={tournamentData.regions.join(', ')}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
          <div className="mt-1 text-sm text-gray-500">
            Standard regions are East, West, South, and Midwest
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Starting Round</label>
          <select
            name="currentRound"
            value={tournamentData.currentRound}
            onChange={handleChange}
            className="w-full p-2 border rounded"
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
        <div className="pt-4">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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
    <div>
      <h3 className="text-lg font-semibold mb-4">Import Teams</h3>
      <p className="mb-4">
        Now that you've set up your tournament, you can import the teams. You'll be able to:
      </p>
      <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-700">
        <li>Upload teams via CSV</li>
        <li>Add teams manually</li>
        <li>Generate the tournament bracket</li>
      </ul>
      <div className="mt-4">
        <button
          onClick={() => setStep('details')}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Back to Details
        </button>
        {/* This would typically render the TeamImport component */}
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Continue to Team Import
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      <div className="bg-white rounded-lg p-6">
        {step === 'details' && renderDetailsStep()}
        {step === 'teams' && renderTeamsStep()}
      </div>
    </div>
  );
};

export default TournamentSetup;
