'use client';
import React, { useState, useEffect, useRef } from 'react';
import './bracket-picker.css';

interface Team {
  id: number;
  name: string;
  seed: number;
  region: string;
  eliminated: boolean;
}

interface Match {
  id: number;
  round: number;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId?: number;
}

interface Tournament {
  id: number;
  year: number;
  name: string;
  currentRound: string;
  regions: string[];
}

interface MatchPick {
  matchId: number;
  teamId: number;
}

interface BracketPickerProps {
  tournamentId: number;
  participantId: number | string;
}

// Convert round number to display name
const getRoundName = (round: number): string => {
  switch (round) {
    case 1: return 'Round of 64';
    case 2: return 'Round of 32';
    case 3: return 'Sweet 16';
    case 4: return 'Elite 8';
    case 5: return 'Final Four';
    case 6: return 'Championship';
    default: return `Round ${round}`;
  }
};

// Get points value for a round
const getPointsForRound = (round: number): number => {
  switch (round) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 4;
    case 4: return 8;
    case 5: return 15;
    case 6: return 25;
    default: return 1;
  }
};

const BracketPicker: React.FC<BracketPickerProps> = ({ tournamentId, participantId }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [currentRound, setCurrentRound] = useState(1);
  const [picks, setPicks] = useState<MatchPick[]>([]);
  const [savingPickId, setSavingPickId] = useState<number | null>(null);
  
  // Refs for swipe functionality
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const mobileRoundsRef = useRef<HTMLDivElement>(null);
  
  // Group matches by round and region
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);
  
  const matchesByRegion = matches.reduce((acc, match) => {
    if (!acc[match.region]) {
      acc[match.region] = [];
    }
    acc[match.region].push(match);
    return acc;
  }, {} as Record<string, Match[]>);
  
  const maxRound = Math.max(...Object.keys(matchesByRound).map(Number), 0);

  // Load tournament data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch teams
        const teamsResponse = await fetch(`/api/tournaments/${tournamentId}/teams`);
        if (!teamsResponse.ok) throw new Error('Failed to load teams');
        const teamsData = await teamsResponse.json();
        
        // Fetch matches
        const matchesResponse = await fetch(`/api/tournaments/${tournamentId}/matches`);
        if (!matchesResponse.ok) throw new Error('Failed to load bracket');
        const matchesData = await matchesResponse.json();
        
        // Fetch tournament
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) throw new Error('Failed to load tournament');
        const tournamentData = await tournamentResponse.json();
        
        // Fetch existing picks
        try {
          const picksResponse = await fetch(`/api/participants/${participantId}/match-picks`);
          if (picksResponse.ok) {
            const picksData = await picksResponse.json();
            setPicks(picksData);
          }
        } catch (err) {
          console.log('No match picks found, starting fresh');
        }
        
        setTeams(teamsData);
        setMatches(matchesData);
        setTournament(tournamentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set initial view mode based on screen size
    const handleResize = () => {
      setViewMode(window.innerWidth > 768 ? 'desktop' : 'mobile');
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [tournamentId, participantId]);

  // Get team by ID
  const getTeamById = (teamId: number): Team | undefined => {
    return teams.find(team => team.id === teamId);
  };

  // Handle team selection for a match with auto-save
  const handleTeamSelect = async (matchId: number, teamId: number) => {
    // Don't allow selection while saving
    if (savingPickId === matchId) return;
    
    // Update local state
    const newPicks = [...picks.filter(pick => pick.matchId !== matchId), { matchId, teamId }];
    setPicks(newPicks);
    
    // Auto-save this pick
    try {
      setSavingPickId(matchId);
      const response = await fetch(`/api/participants/${participantId}/match-picks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          picks: [{ matchId, teamId }] 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save pick');
      }
      
      // Show brief success message
      setSuccess('Pick saved');
      
      // Clear success message after 1.5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 1500);
      
    } catch (err) {
      // Set error message
      setError(err instanceof Error ? err.message : 'Failed to save');
      
      // Revert the pick in local state
      setPicks(picks);
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setSavingPickId(null);
    }
  };
  
  // Check if a team is selected for a match
  const isTeamSelected = (matchId: number, teamId: number): boolean => {
    const pick = picks.find(p => p.matchId === matchId);
    return pick?.teamId === teamId;
  };
  
  // Swipe handlers for mobile view
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Minimum swipe distance
    
    if (diff > threshold && currentRound < maxRound) {
      // Swiped left, go to next round
      setCurrentRound(prev => Math.min(prev + 1, maxRound));
    } else if (diff < -threshold && currentRound > 1) {
      // Swiped right, go to previous round
      setCurrentRound(prev => Math.max(prev - 1, 1));
    }
    
    // Reset touch positions
    touchStartX.current = null;
    touchEndX.current = null;
  };
  
  // Render a single matchup
  const renderMatchup = (match: Match) => {
    const team1 = getTeamById(match.team1Id);
    const team2 = getTeamById(match.team2Id);
    
    if (!team1 || !team2) return null;
    
    return (
      <div key={match.id} className="bracket-matchup">
        <div className="bracket-matchup-header">
          <span>{match.region}</span>
          <span>{getPointsForRound(match.round)} pts</span>
        </div>
        
        <div 
          className={`bracket-team ${isTeamSelected(match.id, team1.id) ? 'bracket-team-selected' : ''} ${savingPickId === match.id ? 'bracket-team-saving' : ''}`}
          onClick={() => handleTeamSelect(match.id, team1.id)}
        >
          <span className="bracket-seed">{team1.seed}</span>
          <span className="bracket-team-name">{team1.name}</span>
          {match.winnerId === team1.id && <span className="bracket-winner-badge">Winner</span>}
        </div>
        
        <div className="bracket-vs">vs</div>
        
        <div 
          className={`bracket-team ${isTeamSelected(match.id, team2.id) ? 'bracket-team-selected' : ''} ${savingPickId === match.id ? 'bracket-team-saving' : ''}`}
          onClick={() => handleTeamSelect(match.id, team2.id)}
        >
          <span className="bracket-seed">{team2.seed}</span>
          <span className="bracket-team-name">{team2.name}</span>
          {match.winnerId === team2.id && <span className="bracket-winner-badge">Winner</span>}
        </div>
      </div>
    );
  };
  
  // Render mobile view (round by round)
  const renderMobileView = () => {
    return (
      <div 
        className="bracket-mobile-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={mobileRoundsRef}
      >
        <div className="bracket-round-selector">
          {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => (
            <button
              key={round}
              className={`bracket-round-button ${round === currentRound ? 'bracket-round-active' : ''}`}
              onClick={() => setCurrentRound(round)}
            >
              {getRoundName(round).split(' ').pop()}
            </button>
          ))}
        </div>
        
        <h3 className="bracket-round-title">{getRoundName(currentRound)}</h3>
        
        <div className="bracket-matchups-container">
          {matchesByRound[currentRound]?.length > 0 ? (
            matchesByRound[currentRound].map(match => renderMatchup(match))
          ) : (
            <div className="bracket-empty-state">
              <p>No games scheduled for this round yet.</p>
            </div>
          )}
        </div>
        
        <div className="bracket-swipe-hint">
          Swipe left or right to navigate rounds
        </div>
      </div>
    );
  };
  
  // Render desktop view (full bracket)
  const renderDesktopView = () => {
    return (
      <div className="bracket-desktop-container">
        <div className="bracket-controls">
          <button className="bracket-zoom-button">Zoom In</button>
          <button className="bracket-zoom-button">Zoom Out</button>
          <button className="bracket-reset-button">Reset View</button>
        </div>
        
        <div className="bracket-full-container">
          <div className="bracket-regions-container">
            {tournament?.regions.map(region => (
              <div key={region} className="bracket-region">
                <h4 className="bracket-region-title">{region}</h4>
                <div className="bracket-region-rounds">
                  {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => (
                    <div key={round} className="bracket-round-column">
                      <div className="bracket-round-heading">{getRoundName(round)}</div>
                      <div className="bracket-round-matches">
                        {matchesByRound[round]
                          ?.filter(match => match.region === region)
                          .map(match => renderMatchup(match))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return <div className="bracket-loading">Loading bracket...</div>;
  }
  
  if (error) {
    return <div className="bracket-error">Error: {error}</div>;
  }

  return (
    <div className="bracket-picker-container">
      <div className="bracket-header">
        <h2 className="bracket-title">
          {tournament?.name} {tournament?.year} Bracket
        </h2>
        
        <div className="bracket-view-toggle">
          <button 
            className={`bracket-view-button ${viewMode === 'mobile' ? 'bracket-view-active' : ''}`}
            onClick={() => setViewMode('mobile')}
          >
            Mobile View
          </button>
          <button 
            className={`bracket-view-button ${viewMode === 'desktop' ? 'bracket-view-active' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            Full Bracket
          </button>
        </div>
      </div>
      
      {/* Message displays */}
      {error && <div className="bracket-error-message">{error}</div>}
      {success && <div className="bracket-success-message">{success}</div>}
      
      {/* Render appropriate view based on mode */}
      {viewMode === 'mobile' ? renderMobileView() : renderDesktopView()}
    </div>
  );
};

export default BracketPicker;