// components/Bracket.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';

// Define TypeScript interfaces
interface Team {
  id: number;
  name: string;
  seed: number | string;
  region?: string;
  eliminated?: boolean;
}

interface Match {
  id: number;
  round: number; // Match uses numeric round (1, 2, 3, etc.) instead of string
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
  completed: boolean;
}

interface BracketProps {
  matches: Match[];
  teams: Team[];
  currentRound: string;
}

interface MatchDisplayProps {
  match: Match;
}

interface OrganizedMatches {
  [round: string]: {
    [region: string]: Match[];
  };
}

// Map numeric round values to names
const roundNameMap: { [key: number]: string } = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite 8',
  5: 'Final Four',
  6: 'Championship'
};

// Map round names to their numeric values
const roundNumberMap: { [key: string]: number } = {
  'Round of 64': 1,
  'Round of 32': 2,
  'Sweet 16': 3,
  'Elite 8': 4,
  'Final Four': 5,
  'Championship': 6
};

const Bracket: React.FC<BracketProps> = ({ matches, teams, currentRound }) => {
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [zoomLevel, setZoomLevel] = useState(100);
  const bracketRef = useRef<HTMLDivElement>(null);
  
  const regions = ['East', 'West', 'South', 'Midwest'];
  const rounds = [
    'Round of 64',
    'Round of 32',
    'Sweet 16',
    'Elite 8',
    'Final Four',
    'Championship'
  ];
  
  // Initialize responsive features
  useEffect(() => {
    // Add scroll indicator
    const bracketContainer = bracketRef.current;
    if (!bracketContainer) return;
    
    // Only add elements if they don't already exist
    if (!document.querySelector('.bracket-scroll-indicator')) {
      // Add scroll indicator
      const scrollIndicator = document.createElement('div');
      scrollIndicator.className = 'bracket-scroll-indicator';
      scrollIndicator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Swipe to view full bracket <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      
      // Insert the elements
      bracketContainer.parentNode?.insertBefore(scrollIndicator, bracketContainer);
      
      // Fade out scroll indicator after user scrolls
      let scrollTimer: NodeJS.Timeout;
      bracketContainer.addEventListener('scroll', () => {
        scrollIndicator.style.opacity = '0.3';
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          scrollIndicator.style.opacity = '1';
        }, 1000);
      });
    }
    
    // Handle double-tap to zoom
    let lastTap = 0;
    const handleDoubleTap = (e: TouchEvent) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
        setZoomLevel(prev => prev === 100 ? 130 : 100);
        e.preventDefault();
      }
      
      lastTap = currentTime;
    };
    
    bracketContainer?.addEventListener('touchend', handleDoubleTap as EventListener);
    
    return () => {
      bracketContainer?.removeEventListener('touchend', handleDoubleTap as EventListener);
    };
  }, []);
  
  // Apply zoom effect
  useEffect(() => {
    const bracketRounds = document.querySelector('.bracket-rounds');
    if (bracketRounds && bracketRounds instanceof HTMLElement) {
      bracketRounds.style.transform = `scale(${zoomLevel / 100})`;
      bracketRounds.style.transformOrigin = 'top left';
    }
  }, [zoomLevel]);
  
  // Find team by ID
  const getTeam = (teamId: number): Team => {
    return teams.find(team => team.id === teamId) || { id: 0, name: 'TBD', seed: '-' };
  };
  
  // Get the round name from a numeric round value
  const getRoundName = (roundNumber: number): string => {
    return roundNameMap[roundNumber] || `Round ${roundNumber}`;
  };
  
  // Filter and organize matches by round and region
  const organizedMatches = (): OrganizedMatches => {
    const organized: OrganizedMatches = {};
    rounds.forEach(round => {
      organized[round] = {};
      regions.forEach(region => {
        organized[round][region] = [];
      });
      // Special case for Final Four and Championship
      if (round === 'Final Four' || round === 'Championship') {
        organized[round]['Final'] = [];
      }
    });
    
    // Sort matches into their respective rounds and regions
    matches.forEach(match => {
      const roundName = getRoundName(match.round);
      
      if (roundName === 'Final Four' || roundName === 'Championship') {
        organized[roundName]['Final'].push(match);
      } else if (organized[roundName] && organized[roundName][match.region]) {
        organized[roundName][match.region].push(match);
      }
    });
    
    // Sort matches within each round and region
    for (const round in organized) {
      for (const region in organized[round]) {
        // Sort matches by ID to ensure consistent order
        organized[round][region].sort((a, b) => a.id - b.id);
      }
    }
    
    return organized;
  };
  
  const displayRegion = (region: string, roundName: string): boolean => {
    if (selectedRegion !== 'All' && selectedRegion !== region) return false;
    if (roundName === 'Final Four' || roundName === 'Championship') {
      return region === 'Final';
    }
    return true;
  };
  
  // Determine if a match should be highlighted as part of the current round
  const isCurrentRound = (roundName: string): boolean => roundName === currentRound;
  
  // Format match display
  const MatchDisplay: React.FC<MatchDisplayProps> = ({ match }) => {
    const team1 = getTeam(match.team1Id);
    const team2 = getTeam(match.team2Id);
    const winner = match.winnerId ? getTeam(match.winnerId) : null;
    
    // Find the corresponding match in the next round that this winner advances to
    const findNextRoundMatch = (): Match | undefined => {
      if (!match.winnerId || !match.completed) return undefined;
      
      const currentRoundNumber = match.round;
      const nextRoundNumber = currentRoundNumber + 1;
      
      // Find matches in the next round
      const nextRoundMatches = matches.filter(m => m.round === nextRoundNumber);
      
      // If this is a Final Four or Championship match, look for specific next round
      if (currentRoundNumber >= 5) {
        for (const nextMatch of nextRoundMatches) {
          if (nextMatch.team1Id === match.winnerId || nextMatch.team2Id === match.winnerId) {
            return nextMatch;
          }
        }
        return undefined;
      }
      
      // For regional rounds, find the match in the same region
      const sameRegionMatches = nextRoundMatches.filter(m => m.region === match.region);
      
      // Determine which match in the next round this winner would go to
      // This requires knowing the bracket structure
      // Typically, winners of matches 1&2 go to match 1 in next round,
      // winners of matches 3&4 go to match 2 in next round, etc.
      
      // Group matches by ID to determine which pairs feed into which next round match
      const matchPairs: Record<number, Match[]> = {};
      const currentRoundMatches = matches.filter(m => 
        m.round === currentRoundNumber && m.region === match.region
      ).sort((a, b) => a.id - b.id);
      
      // Pair matches (every 2 matches feed into 1 next round match)
      for (let i = 0; i < currentRoundMatches.length; i += 2) {
        const nextMatchIndex = Math.floor(i / 2);
        if (nextMatchIndex < sameRegionMatches.length) {
          const nextMatchId = sameRegionMatches[nextMatchIndex].id;
          if (!matchPairs[nextMatchId]) {
            matchPairs[nextMatchId] = [];
          }
          matchPairs[nextMatchId].push(currentRoundMatches[i]);
          if (i + 1 < currentRoundMatches.length) {
            matchPairs[nextMatchId].push(currentRoundMatches[i + 1]);
          }
        }
      }
      
      // Find which next round match this match feeds into
      for (const nextMatchId in matchPairs) {
        if (matchPairs[nextMatchId].some(m => m.id === match.id)) {
          const nextMatch = sameRegionMatches.find(m => m.id === parseInt(nextMatchId));
          return nextMatch;
        }
      }
      
      return undefined;
    };
    
    // Has this winner been advanced to the next round?
    const nextMatch = findNextRoundMatch();
    const hasAdvanced = nextMatch && 
      (nextMatch.team1Id === match.winnerId || nextMatch.team2Id === match.winnerId);
    
    return (
      <div className={`bracket-match ${isCurrentRound(getRoundName(match.round)) ? 'current-round' : ''}`}>
        <div className={`bracket-team ${match.winnerId === match.team1Id ? 'winner' : ''}`}>
          <div className="bracket-team-info">
            <span className="bracket-seed">{team1.seed}</span>
            <span className="bracket-team-name">{team1.name}</span>
          </div>
          {match.team1Score !== null && match.team1Score !== undefined && (
            <span className="bracket-score">{match.team1Score}</span>
          )}
        </div>
        <div className={`bracket-team ${match.winnerId === match.team2Id ? 'winner' : ''}`}>
          <div className="bracket-team-info">
            <span className="bracket-seed">{team2.seed}</span>
            <span className="bracket-team-name">{team2.name}</span>
          </div>
          {match.team2Score !== null && match.team2Score !== undefined && (
            <span className="bracket-score">{match.team2Score}</span>
          )}
        </div>
        {match.completed && match.winnerId && hasAdvanced && (
          <div className="bracket-advancement">
            <span>→ {getTeam(match.winnerId).name} advances</span>
          </div>
        )}
      </div>
    );
  };

  const organized = organizedMatches();
  
  return (
    <div className="bracket-wrapper">
      <div className="bracket-filters">
        <button
          className={`btn ${selectedRegion === 'All' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setSelectedRegion('All')}
        >
          All Regions
        </button>
        {regions.map(region => (
          <button
            key={region}
            className={`btn ${selectedRegion === region ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setSelectedRegion(region)}
          >
            {region}
          </button>
        ))}
      </div>
      
      {/* Zoom controls for mobile */}
      <div className="bracket-zoom-controls">
        <button 
          className="bracket-zoom-btn zoom-out" 
          onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
        >
          -
        </button>
        <span className="bracket-zoom-level">{zoomLevel}%</span>
        <button 
          className="bracket-zoom-btn zoom-in" 
          onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
        >
          +
        </button>
      </div>
      
      <div className="bracket-container" ref={bracketRef}>
        <div className="bracket-rounds">
          {rounds.map((round) => (
            <div key={round} className="bracket-round">
              <h3 className={`bracket-round-title ${isCurrentRound(round) ? 'text-secondary' : ''}`}>
                {round}
              </h3>
              {regions.map(region => (
                displayRegion(region, round) && (
                  <div key={`${round}-${region}`} className="mb-6">
                    {region !== 'Final' && <h4 className="bracket-region-title">{region}</h4>}
                    {organized[round][region]?.map(match => (
                      <MatchDisplay key={match.id} match={match} />
                    ))}
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Bracket;