'use client';
import { useState, useEffect } from 'react';

// Define TypeScript interfaces
interface Team {
  id: string | number;
  name: string;
  seed: number | string;
  region: string;
}

interface NewTeam {
  name: string;
  seed: number | string;
  region: string;
}

interface TeamManagementProps {
  tournamentId: number | string;
}

interface TeamsByRegion {
  [region: string]: Team[];
}

const TeamManagement: React.FC<TeamManagementProps> = ({ tournamentId }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [newTeam, setNewTeam] = useState<NewTeam>({
    name: '',
    seed: '',
    region: ''
  });

  // Load teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('/api/teams');
        if (!response.ok) {
          throw new Error('Failed to fetch teams');
        }
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const csv = event.target?.result;
      if (typeof csv === 'string') {
        parseCSV(csv);
      }
    };
    reader.readAsText(file);
  };

  // Parse CSV data
  const parseCSV = (csv: string) => {
    try {
      // Simple CSV parsing (for a more robust solution, use a library like PapaParse)
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      // Validate headers
      const requiredHeaders = ['name', 'seed', 'region'];
      const hasRequiredHeaders = requiredHeaders.every(h => 
        headers.includes(h)
      );
      if (!hasRequiredHeaders) {
        throw new Error('CSV must contain name, seed, and region columns');
      }
      // Parse rows
      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, any> = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        // Validate row
        if (!row.name || !row.seed || !row.region) {
          throw new Error(`Row ${i} is missing required fields`);
        }
        // Convert seed to number
        row.seed = parseInt(row.seed);
        if (isNaN(row.seed) || row.seed < 1 || row.seed > 16) {
          throw new Error(`Row ${i} has an invalid seed (must be 1-16)`);
        }
       parsedData.push(row);
      }
      setCsvData(parsedData);
      setSuccess(`CSV parsed successfully: ${parsedData.length} teams found`);
    } catch (error) {
      setError(`Error parsing CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle input change for new team form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTeam({
      ...newTeam,
      [name]: name === 'seed' ? (value === '' ? '' : parseInt(value)) : value
    });
  };

  // Add a new team manually
  const addTeam = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate input
    if (!newTeam.name || !newTeam.seed || !newTeam.region) {
      setError('All fields are required');
      return;
    }
    if (isNaN(Number(newTeam.seed)) || Number(newTeam.seed) < 1 || Number(newTeam.seed) > 16) {
      setError('Seed must be a number between 1 and 16');
      return;
    }
    // Add to teams list
    const teamToAdd: Team = {
      ...newTeam,
      id: `temp-${Date.now()}` // Temporary ID for UI purposes
    };
    setTeams([...teams, teamToAdd]);
    setNewTeam({ name: '', seed: '', region: '' });
    setSuccess('Team added successfully');
  };

  // Remove a team
  const removeTeam = (teamId: string | number) => {
    setTeams(teams.filter(team => team.id !== teamId));
    setSuccess('Team removed');
  };

  // Import teams from CSV
  const importTeamsFromCSV = () => {
    if (!csvData || csvData.length === 0) {
      setError('No CSV data to import');
      return;
    }
    // Add to teams list with temporary IDs
    const teamsToAdd: Team[] = csvData.map(team => ({
      ...team,
      id: `temp-${Date.now()}-${Math.random()}` // Temporary ID for UI purposes
    }));
    setTeams([...teams, ...teamsToAdd]);
    setCsvData(null);
    setSuccess(`Imported ${teamsToAdd.length} teams from CSV`);
  };

  // Save all teams to the database
  const saveTeams = async () => {
    if (teams.length === 0) {
      setError('No teams to save');
      return;
    }
    if (!tournamentId) {
      setError('Tournament ID is required');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tournamentId,
          teams: teams.map(({ id, ...team }) => team) // Remove temporary IDs
        })
      });
      if (!response.ok) {
        throw new Error('Failed to save teams');
      }
      setSuccess('Teams saved successfully');
      // Generate initial bracket
      const bracketResponse = await fetch('/api/tournament/generate-bracket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tournamentId
        })
      });
      if (!bracketResponse.ok) {
        throw new Error('Failed to generate bracket');
      }
      setSuccess('Teams saved and bracket generated successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Generate CSV template
  const generateCSVTemplate = () => {
    const template = 'name,seed,region\nTeam A,1,East\nTeam B,2,West\nTeam C,3,South\nTeam D,4,Midwest';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teams_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group teams by region
  const teamsByRegion: TeamsByRegion = teams.reduce((acc: TeamsByRegion, team) => {
    if (!acc[team.region]) {
      acc[team.region] = [];
    }
    acc[team.region].push(team);
    return acc;
  }, {});

  if (loading && teams.length === 0) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Team Management</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Manual Team Entry */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Add Team Manually</h3>
          <form onSubmit={addTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
              <input
                type="text"
                name="name"
                value={newTeam.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seed (1-16)</label>
              <input
                type="number"
                name="seed"
                value={newTeam.seed}
                onChange={handleInputChange}
                min="1"
                max="16"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select
                name="region"
                value={newTeam.region}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">-- Select Region --</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="South">South</option>
                <option value="Midwest">Midwest</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Add Team
              </button>
            </div>
          </form>
        </div>
        {/* CSV Import */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Import Teams from CSV</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Upload a CSV file with columns for name, seed, and region.
            </p>
            <button
              onClick={generateCSVTemplate}
              className="text-blue-600 hover:text-blue-800 text-sm underline mb-2"
            >
              Download CSV Template
            </button>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {csvData && csvData.length > 0 && (
            <div>
              <p className="text-sm font-medium text-green-600 mb-2">
                {csvData.length} teams parsed from CSV
              </p>
              <button
                onClick={importTeamsFromCSV}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Import Teams
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Team List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">Teams ({teams.length})</h3>
          {teams.length > 0 && (
            <button
              onClick={saveTeams}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save All Teams'}
            </button>
          )}
        </div>
        {teams.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No teams added yet.
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(teamsByRegion).map(([region, regionTeams]) => (
              <div key={region} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold">
                  {region} Region
                </div>
                <ul className="divide-y divide-gray-200">
                  {regionTeams
                    .sort((a, b) => Number(a.seed) - Number(b.seed))
                    .map(team => (
                      <li key={team.id} className="px-4 py-2 flex justify-between items-center">
                        <span>
                          <span className="inline-block bg-gray-200 rounded-full w-6 h-6 text-center text-xs font-bold mr-2">
                            {team.seed}
                          </span>
                          {team.name}
                        </span>
                        <button
                          onClick={() => removeTeam(team.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </li>
                    ))
                  }
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
