'use client';
import { useState, useEffect } from 'react';

// Define TypeScript interfaces
interface Team {
  id: number;
  name: string;
  seed: number;
}

interface Match {
  id: number;
  team1: Team;
  team2: Team;
  winnerId?: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
  completed: boolean;
}

interface Tournament {
  id: number;
  currentRound: string;
}

interface Pick {
  matchId: number;
  teamId: number;
  teamName: string;
  teamSeed: number;
  correct: boolean | null;
}

interface ParticipantPicks {
  participantId: number;
  participantName: string;
  totalScore: number;
  picks: Pick[];
}

interface PublicPicksResponse {
  showPicks: boolean;
  tournament: Tournament;
  matches: Match[];
  participants: ParticipantPicks[];
  message?: string;
}

const UserPicksDisplay = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picksData, setPicksData] = useState<PublicPicksResponse | null>(null);
  const [currentRound, setCurrentRound] = useState('Round of 64');

  const rounds = [
    'Round of 64',
    'Round of 32',
    'Sweet 16',
    'Elite 8',
    'Final Four',
    'Championship'
  ];

  // Fetch data for the selected round
  const fetchRoundData = async (round: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/public/picks?round=${round}`);
      if (!response.ok) {
        throw new Error('Failed to fetch picks data');
      }
      
      const data = await response.json();
      setPicksData(data);
      
      // If tournament has a current round, update the selector
      if (data.tournament?.currentRound && rounds.includes(data.tournament.currentRound)) {
        setCurrentRound(data.tournament.currentRound);
      }
    } catch (error) {
      console.error('Error fetching picks data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchRoundData(currentRound);
  }, []);

  // Handle round change
  const handleRoundChange = (round: string) => {
    setCurrentRound(round);
    fetchRoundData(round);
  };

  if (loading) {
    return (
      <div className="user_picks_loading">
        <div className="user_picks_spinner"></div>
        <p>Loading picks data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user_picks_error">
        <p>Error: {error}</p>
        <button className="user_picks_retry_button" onClick={() => fetchRoundData(currentRound)}>
          Retry
        </button>
      </div>
    );
  }

  if (!picksData) {
    return (
      <div className="user_picks_no_tournament">
        <p>No tournament data available. Please check back later.</p>
      </div>
    );
  }

  // Check tournament status
  if (picksData.tournament?.currentRound === 'Pre-Tournament') {
    return (
      <div className="user_picks_container">
        <h2 className="user_picks_title">All Participants' Picks</h2>
        <div className="user_picks_pre_tournament">
          <p>The tournament has not started yet. Picks will be visible once the tournament begins.</p>
          <p>Current tournament status: <strong>Pre-Tournament</strong></p>
        </div>
      </div>
    );
  }

  // Check if picks should be shown
  if (!picksData.showPicks) {
    return (
      <div className="user_picks_container">
        <h2 className="user_picks_title">All Participants' Picks</h2>
        
        <div className="user_picks_round_selector">
          <label htmlFor="round-select" className="user_picks_label">Round:</label>
          <select 
            id="round-select"
            className="user_picks_select"
            value={currentRound}
            onChange={(e) => handleRoundChange(e.target.value)}
          >
            {rounds.map(round => (
              <option key={round} value={round}>{round}</option>
            ))}
          </select>
        </div>
        
        <div className="user_picks_locked_message">
          <p>Picks for {currentRound} are not visible yet. They will be revealed once the tournament begins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user_picks_container">
      <h2 className="user_picks_title">All Participants' Picks</h2>
      
      <div className="user_picks_round_selector">
        <label htmlFor="round-select" className="user_picks_label">Round:</label>
        <select 
          id="round-select"
          className="user_picks_select"
          value={currentRound}
          onChange={(e) => handleRoundChange(e.target.value)}
        >
          {rounds.map(round => (
            <option key={round} value={round}>{round}</option>
          ))}
        </select>
      </div>
      
      {picksData.matches.length === 0 ? (
        <div className="user_picks_no_matches">
          <p>No matches found for {currentRound}.</p>
        </div>
      ) : picksData.participants.length === 0 ? (
        <div className="user_picks_no_picks">
          <p>No participants found for this tournament.</p>
        </div>
      ) : (
        <div className="user_picks_table_container">
          <table className="user_picks_table">
            <thead>
              <tr>
                <th className="user_picks_header user_picks_participant_column">Participant</th>
                {picksData.matches.map(match => (
                  <th key={match.id} className="user_picks_header user_picks_match_column">
                    <div className="user_picks_matchup">
                      <div className="user_picks_team">
                        <span className="user_picks_seed">{match.team1.seed}</span>
                        <span className="user_picks_name">{match.team1.name}</span>
                      </div>
                      <div className="user_picks_vs">vs</div>
                      <div className="user_picks_team">
                        <span className="user_picks_seed">{match.team2.seed}</span>
                        <span className="user_picks_name">{match.team2.name}</span>
                      </div>
                      {match.completed && match.winnerId && (
                        <div className="user_picks_result">
                          <span className="user_picks_winner">
                            Winner: {
                              match.winnerId === match.team1.id 
                                ? match.team1.name 
                                : match.team2.name
                            }
                          </span>
                          {match.team1Score !== null && match.team2Score !== null && (
                            <span className="user_picks_score">
                              {match.team1Score}-{match.team2Score}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className="user_picks_header user_picks_score_column">Score</th>
              </tr>
            </thead>
            <tbody>
              {picksData.participants.map(participant => (
                <tr key={participant.participantId} className="user_picks_row">
                  <td className="user_picks_cell user_picks_participant_cell">
                    {participant.participantName}
                  </td>
                  {picksData.matches.map(match => {
                    const pick = participant.picks.find(p => p.matchId === match.id);
                    if (!pick) {
                      return (
                        <td key={match.id} className="user_picks_cell user_picks_no_pick">
                          No pick
                        </td>
                      );
                    }
                    
                    let pickClass = "user_picks_cell";
                    
                    // Add class based on correctness (if match is completed)
                    if (match.completed && pick.correct !== null) {
                      pickClass += pick.correct 
                        ? " user_picks_correct" 
                        : " user_picks_incorrect";
                    }
                    
                    return (
                      <td key={match.id} className={pickClass}>
                        <div className="user_picks_pick">
                          <span className="user_picks_pick_seed">{pick.teamSeed}</span>
                          <span className="user_picks_pick_name">{pick.teamName}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="user_picks_cell user_picks_score_cell">
                    {participant.totalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserPicksDisplay;