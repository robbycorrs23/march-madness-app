'use client';
import { useState, useEffect } from 'react';

// Define TypeScript interfaces
interface Team {
  id: number;
  name: string;
  seed: number;
  region: string;
}

interface NewTeam {
  name: string;
  seed: number;
  region: string;
}

interface TeamManagementProps {
  tournamentId: number;
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
    seed: 1,  // Initialize with a valid number
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
      [name]: name === 'seed' ? (value === '' ? 1 : Number(value)) : value
    });
  };

  // Add a new team manually
  const addTeam = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate input
    if (!newTeam.name || !newTeam.region) {
      setError('All fields are required');
      return;
    }
    if (isNaN(newTeam.seed) || newTeam.seed < 1 || newTeam.seed > 16) {
      setError('Seed must be a number between 1 and 16');
      return;
    }
    // Add to teams list with a temporary numeric ID
    const teamToAdd: Team = {
      ...newTeam,
      id: -Date.now()  // Use negative numbers for temporary IDs
    };
    setTeams([...teams, teamToAdd]);
    setNewTeam({ name: '', seed: 1, region: '' });
    setSuccess('Team added successfully');
  };

  // Remove a team
  const removeTeam = async (teamId: number) => {
    // Only make API call for permanent IDs (positive numbers)
    if (teamId > 0) {
      try {
        const response = await fetch(`/api/teams?id=${teamId}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          throw new Error('Failed to delete team');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
        return; // Don't update state if API call fails
      }
    }
    
    // Update UI state
    setTeams(teams.filter(team => team.id !== teamId));
    setSuccess('Team removed');
  };

  // Import teams from CSV
  const importTeamsFromCSV = () => {
    if (!csvData || csvData.length === 0) {
      setError('No CSV data to import');
      return;
    }
    // Add to teams list with temporary numeric IDs
    const teamsToAdd: Team[] = csvData.map((team, index) => ({
      ...team,
      id: -(Date.now() + index),  // Use negative numbers for temporary IDs
      seed: Number(team.seed)  // Ensure seed is a number
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
    
    setLoading(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tournamentId: Number(tournamentId),
          teams: teams.map(({ id, ...team }) => ({
            ...team,
            seed: Number(team.seed)
          }))
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save teams');
      }
      
      setSuccess('Teams saved successfully');
      
      // Generate initial bracket
      const bracketResponse = await fetch('/api/tournament/generate-bracket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tournamentId: Number(tournamentId)
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

  // Group teams by region with deduplication
	const teamsByRegion: TeamsByRegion = teams.reduce((acc: TeamsByRegion, team) => {
	  if (!acc[team.region]) {
		acc[team.region] = [];
	  }
	  
	  // Check if a team with the same name and seed already exists in this region
	  const isDuplicate = acc[team.region].some(
		existingTeam => existingTeam.name === team.name && existingTeam.seed === team.seed
	  );
	  
	  // Only add if not a duplicate
	  if (!isDuplicate) {
		acc[team.region].push(team);
	  }
	  
	  return acc;
	}, {});

  if (loading && teams.length === 0) {
    return <div className="loading-indicator">Loading...</div>;
  }

  return (
    <div className="team-management">
      <h2 className="section-title">Team Management</h2>
      
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
      
      <div className="form-grid">
        {/* Manual Team Entry */}
        <div className="card">
          <h3 className="card-title">Add Team Manually</h3>
          <form onSubmit={addTeam} className="form">
            <div className="form-group">
              <label className="form-label">Team Name</label>
              <input
                type="text"
                name="name"
                value={newTeam.name}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Seed (1-16)</label>
              <input
                type="number"
                name="seed"
                value={newTeam.seed}
                onChange={handleInputChange}
                min="1"
                max="16"
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Region</label>
              <select
                name="region"
                value={newTeam.region}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">-- Select Region --</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="South">South</option>
                <option value="Midwest">Midwest</option>
              </select>
            </div>
            
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
              >
                Add Team
              </button>
            </div>
          </form>
        </div>
        
        {/* CSV Import */}
        <div className="card">
          <h3 className="card-title">Import Teams from CSV</h3>
          <div className="csv-import-section">
            <p className="help-text">
              Upload a CSV file with columns for name, seed, and region.
            </p>
            <button
              onClick={generateCSVTemplate}
              className="csv-template-link"
            >
              Download CSV Template
            </button>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="file-input"
            />
          </div>
          
          {csvData && csvData.length > 0 && (
            <div className="csv-import-actions">
              <p className="csv-success-message">
                {csvData.length} teams parsed from CSV
              </p>
              <button
                onClick={importTeamsFromCSV}
                className="btn btn-success"
              >
                Import Teams
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Team List */}
      <div className="teams-container">
        <div className="teams-header">
          <h3 className="teams-title">Teams ({teams.length})</h3>
          {teams.length > 0 && (
            <button
              onClick={saveTeams}
              className="btn btn-save"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save All Teams'}
            </button>
          )}
        </div>
        
        {teams.length === 0 ? (
          <div className="no-teams-message">
            No teams added yet.
          </div>
        ) : (
          <div className="teams-grid">
            {Object.entries(teamsByRegion).map(([region, regionTeams]) => (
              <div key={region} className="region-card">
                <div className="region-header">
                  {region} Region
                </div>
                <ul className="team-list">
                  {regionTeams
                    .sort((a, b) => Number(a.seed) - Number(b.seed))
                    .map(team => (
                      <li key={team.id} className="team-item">
                        <span className="team-name">
                          <span className="seed-badge">
                            {team.seed}
                          </span>
                          {team.name}
                        </span>
                        <button
                          onClick={() => removeTeam(team.id)}
                          className="remove-btn"
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