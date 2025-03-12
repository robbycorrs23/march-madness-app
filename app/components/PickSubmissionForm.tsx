'use client';
import { useState, useEffect } from 'react';

// Define TypeScript interfaces
interface Tournament {
  id: number;
  currentRound: string;
  // Add other tournament properties as needed
}

interface Team {
  id: number;
  name: string;
  seed: number;
  region: string;
  eliminated?: boolean;
}

interface Game {
  id: number;
  round: string;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId?: number | null;
}

interface UserInfo {
  name: string;
  email: string;
}

interface PreTournamentPicks {
  finalFour: string[];
  finals: string[];
  champion: string;
  cinderellas: string[];
}

interface RoundPicks {
  [gameId: string]: string;
}

const PickSubmissionForm = () => {
  const [step, setStep] = useState('user-info');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    email: ''
  });
  const [preTournamentPicks, setPreTournamentPicks] = useState<PreTournamentPicks>({
    finalFour: ['', '', '', ''],
    finals: ['', ''],
    champion: '',
    cinderellas: ['', '']
  });
  const [roundPicks, setRoundPicks] = useState<RoundPicks>({});

  // Load tournament data, teams, and games
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament
        const tournamentResponse = await fetch('/api/tournament');
        if (tournamentResponse.ok) {
          const tournamentData = await tournamentResponse.json();
          setTournament(tournamentData);
        }
        // Fetch teams
        const teamsResponse = await fetch('/api/teams');
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(teamsData);
        }
        // Fetch current round games if tournament exists
        if (tournament?.currentRound && tournament.currentRound !== 'Pre-Tournament') {
          const gamesResponse = await fetch(`/api/games?round=${tournament.currentRound}`);
          if (gamesResponse.ok) {
            const gamesData = await gamesResponse.json();
            setGames(gamesData);
            // Initialize round picks
            const initialRoundPicks: RoundPicks = {};
            gamesData.forEach((game: Game) => {
              initialRoundPicks[game.id] = '';
            });
            setRoundPicks(initialRoundPicks);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load necessary data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tournament?.currentRound]);

  // Handle user info changes
  const handleUserInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle pre-tournament pick changes
  const handleFinalFourChange = (index: number, teamId: string) => {
    const newFinalFour = [...preTournamentPicks.finalFour];
    newFinalFour[index] = teamId;
    setPreTournamentPicks(prev => ({
      ...prev,
      finalFour: newFinalFour
    }));
  };
  
  const handleFinalsChange = (index: number, teamId: string) => {
    const newFinals = [...preTournamentPicks.finals];
    newFinals[index] = teamId;
    setPreTournamentPicks(prev => ({
      ...prev,
      finals: newFinals
    }));
  };
  
  const handleChampionChange = (teamId: string) => {
    setPreTournamentPicks(prev => ({
      ...prev,
      champion: teamId
    }));
  };
  
  const handleCinderellaChange = (index: number, teamId: string) => {
    const newCinderellas = [...preTournamentPicks.cinderellas];
    newCinderellas[index] = teamId;
    setPreTournamentPicks(prev => ({
      ...prev,
      cinderellas: newCinderellas
    }));
  };

  // Handle round pick changes
  const handleRoundPickChange = (gameId: number, teamId: string) => {
    setRoundPicks(prev => ({
      ...prev,
      [gameId]: teamId
    }));
  };

  // Move to next step
  const goToNextStep = () => {
    if (step === 'user-info') {
      if (!userInfo.name || !userInfo.email) {
        setError('Please provide your name and email');
        return;
      }
      setStep('pre-tournament');
      setError('');
    } else if (step === 'pre-tournament') {
      // Validate pre-tournament picks
      if (!preTournamentPicks.finalFour.every(pick => pick) ||
          !preTournamentPicks.finals.every(pick => pick) ||
          !preTournamentPicks.champion ||
          !preTournamentPicks.cinderellas.every(pick => pick)) {
        setError('Please complete all pre-tournament picks');
        return;
      }
      if (tournament?.currentRound && tournament.currentRound !== 'Pre-Tournament') {
        setStep('round-picks');
      } else {
        submitPicks();
      }
      setError('');
    }
  };

  // Go back to previous step
  const goToPreviousStep = () => {
    if (step === 'pre-tournament') {
      setStep('user-info');
    } else if (step === 'round-picks') {
      setStep('pre-tournament');
    }
    setError('');
  };

  // Submit all picks
  const submitPicks = async () => {
    if (!tournament) return;
    
    setSubmitting(true);
    setError('');
    try {
      // Prepare the payload
      const payload: any = {
        tournamentId: tournament.id,
        participant: userInfo,
        preTournament: preTournamentPicks
      };
      
      // Add round picks if applicable
      if (step === 'round-picks') {
        payload.roundPicks = {
          round: tournament.currentRound,
          picks: Object.entries(roundPicks).map(([gameId, teamId]) => ({
            gameId: parseInt(gameId),
            teamId
          }))
        };
      }
      
      // Submit picks
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit picks');
      }
      
      setSuccess('Your picks have been submitted successfully!');
      
      // Reset form after successful submission
      setTimeout(() => {
        setUserInfo({ name: '', email: '' });
        setPreTournamentPicks({
          finalFour: ['', '', '', ''],
          finals: ['', ''],
          champion: '',
          cinderellas: ['', '']
        });
        setRoundPicks({});
        setStep('user-info');
      }, 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 p-4 rounded">
        <p>The tournament has not been set up yet. Please check back later.</p>
      </div>
    );
  }

  // Group teams by region
  const teamsByRegion: { [region: string]: Team[] } = {};
  teams.forEach(team => {
    if (!teamsByRegion[team.region]) {
      teamsByRegion[team.region] = [];
    }
    teamsByRegion[team.region].push(team);
  });

  // Get Cinderella eligible teams (seeds 11-16)
  const cinderellaTeams = teams.filter(team => team.seed >= 11 && team.seed <= 16);

  return (
    <div className="max-w-4xl mx-auto">
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
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <div className={`rounded-full h-8 w-8 flex items-center justify-center mr-3 ${
            step === 'user-info' ? 'bg-blue-600 text-white' : 'bg-gray-300'
          }`}>
            1
          </div>
          <div className={`h-1 flex-grow mx-2 ${
            step === 'user-info' ? 'bg-blue-600' : 'bg-gray-300'
          }`}></div>
          <div className={`rounded-full h-8 w-8 flex items-center justify-center mx-3 ${
            step === 'pre-tournament' ? 'bg-blue-600 text-white' : 'bg-gray-300'
          }`}>
            2
          </div>
          {(tournament?.currentRound && tournament.currentRound !== 'Pre-Tournament') && (
            <>
              <div className={`h-1 flex-grow mx-2 ${
                step === 'round-picks' ? 'bg-blue-600' : 'bg-gray-300'
              }`}></div>
              <div className={`rounded-full h-8 w-8 flex items-center justify-center ml-3 ${
                step === 'round-picks' ? 'bg-blue-600 text-white' : 'bg-gray-300'
              }`}>
                3
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between">
          <div className="text-center">
            <span className="text-sm font-medium">Your Info</span>
          </div>
          <div className="text-center">
            <span className="text-sm font-medium">Pre-Tournament Picks</span>
          </div>
          {(tournament?.currentRound && tournament.currentRound !== 'Pre-Tournament') && (
            <div className="text-center">
              <span className="text-sm font-medium">{tournament.currentRound} Picks</span>
            </div>
          )}
        </div>
      </div>
      {step === 'user-info' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Your Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={userInfo.name}
                onChange={handleUserInfoChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={userInfo.email}
                onChange={handleUserInfoChange}
                className="w-full p-2 border rounded"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Your email will be used to identify your picks.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={goToNextStep}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Continue to Picks
              </button>
            </div>
          </div>
        </div>
      )}
      {step === 'pre-tournament' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Pre-Tournament Picks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Final Four Teams (5 pts each)</h3>
              <div className="space-y-2">
                {preTournamentPicks.finalFour.map((teamId, index) => (
                  <div key={`ff-${index}`}>
                    <select
                      value={teamId}
                      onChange={(e) => handleFinalFourChange(index, e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">-- Select Team {index + 1} --</option>
                      {Object.entries(teamsByRegion).map(([region, regionTeams]) => (
                        <optgroup key={region} label={region}>
                          {regionTeams
                            .sort((a, b) => a.seed - b.seed)
                            .map(team => (
                              <option key={team.id} value={team.id.toString()}>
                                ({team.seed}) {team.name}
                              </option>
                            ))
                          }
                        </optgroup>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Finals Teams (10 pts each)</h3>
              <div className="space-y-2">
                {preTournamentPicks.finals.map((teamId, index) => (
                  <div key={`finals-${index}`}>
                    <select
                      value={teamId}
                      onChange={(e) => handleFinalsChange(index, e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">-- Select Team {index + 1} --</option>
                      {teams
                        .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name))
                        .map(team => (
                          <option key={team.id} value={team.id.toString()}>
                            ({team.seed}) {team.name} - {team.region}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                ))}
              </div>
              <h3 className="font-medium mb-2 mt-6">Champion (25 pts)</h3>
              <select
                value={preTournamentPicks.champion}
                onChange={(e) => handleChampionChange(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">-- Select Champion --</option>
                {teams
                  .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name))
                  .map(team => (
                    <option key={team.id} value={team.id.toString()}>
                      ({team.seed}) {team.name} - {team.region}
                    </option>
                  ))
                }
              </select>
              <h3 className="font-medium mb-2 mt-6">Cinderella Picks (seeds 11-16, double pts)</h3>
              <div className="space-y-2">
                {preTournamentPicks.cinderellas.map((teamId, index) => (
                  <div key={`cinderella-${index}`}>
                    <select
                      value={teamId}
                      onChange={(e) => handleCinderellaChange(index, e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    >
                    <option value="">-- Select Cinderella {index + 1} --</option>
                      {cinderellaTeams
                        .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name))
                        .map(team => (
                          <option key={team.id} value={team.id.toString()}>
                            ({team.seed}) {team.name} - {team.region}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={goToPreviousStep}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            >
              Back
            </button>
            <button
              onClick={goToNextStep}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {tournament?.currentRound && tournament.currentRound !== 'Pre-Tournament'
                ? 'Continue to Round Picks'
                : 'Submit Picks'
              }
            </button>
          </div>
        </div>
      )}
      {step === 'round-picks' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {tournament.currentRound} Picks
          </h2>
          {games.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {games.map(game => {
                  const team1 = teams.find(t => t.id === game.team1Id) || { id: 0, name: 'TBD', seed: 0, region: '' };
                  const team2 = teams.find(t => t.id === game.team2Id) || { id: 0, name: 'TBD', seed: 0, region: '' };
                  return (
                    <div key={game.id} className="border p-4 rounded">
                      <div className="text-sm font-medium text-gray-500 mb-2">
                        {game.region} Region
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`game-${game.id}`}
                            value={team1.id.toString()}
                            checked={roundPicks[game.id] === team1.id.toString()}
                            onChange={() => handleRoundPickChange(game.id, team1.id.toString())}
                            className="mr-2"
                            required
                          />
                          <span>
                            ({team1.seed}) {team1.name}
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`game-${game.id}`}
                            value={team2.id.toString()}
                            checked={roundPicks[game.id] === team2.id.toString()}
                            onChange={() => handleRoundPickChange(game.id, team2.id.toString())}
                            className="mr-2"
                            required
                          />
                          <span>
                            ({team2.seed}) {team2.name}
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={goToPreviousStep}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                >
                  Back
                </button>
                <button
                  onClick={submitPicks}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit All Picks'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded">
              <p>No games found for the current round. Please check back later.</p>
              <div className="mt-4">
                <button
                  onClick={goToPreviousStep}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PickSubmissionForm;
