// components/Bracket.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';

// Define TypeScript interfaces
interface Team {
  id: number;
  name: string;
  seed: number | string;
  region?: string;
}

interface Game {
  id: number;
  round: string;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
}

interface BracketProps {
  games: Game[];
  teams: Team[];
  currentRound: string;
}

interface GameDisplayProps {
  game: Game;
}

interface OrganizedGames {
  [round: string]: {
    [region: string]: Game[];
  };
}

const Bracket: React.FC<BracketProps> = ({ games, teams, currentRound }) => {
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
  
  // Filter and organize games by round and region
  const organizedGames = (): OrganizedGames => {
    const organized: OrganizedGames = {};
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
    
    // Sort games into their respective rounds and regions
    games.forEach(game => {
      if (game.round === 'Final Four' || game.round === 'Championship') {
        organized[game.round]['Final'].push(game);
      } else if (organized[game.round] && organized[game.round][game.region]) {
        organized[game.round][game.region].push(game);
      }
    });
    
    return organized;
  };
  
  const displayRegion = (region: string, roundName: string): boolean => {
    if (selectedRegion !== 'All' && selectedRegion !== region) return false;
    if (roundName === 'Final Four' || roundName === 'Championship') {
      return region === 'Final';
    }
    return true;
  };
  
  // Determine if a game should be highlighted as part of the current round
  const isCurrentRound = (roundName: string): boolean => roundName === currentRound;
  
  // Format game display
  const GameDisplay: React.FC<GameDisplayProps> = ({ game }) => {
    const team1 = getTeam(game.team1Id);
    const team2 = getTeam(game.team2Id);
    const winner = game.winnerId ? getTeam(game.winnerId) : null;
    
    return (
      <div className={`bracket-game ${isCurrentRound(game.round) ? 'current-round' : ''}`}>
        <div className={`bracket-team ${game.winnerId === game.team1Id ? 'winner' : ''}`}>
          <div className="bracket-team-info">
            <span className="bracket-seed">{team1.seed}</span>
            <span className="bracket-team-name">{team1.name}</span>
          </div>
          {game.team1Score !== null && game.team1Score !== undefined && (
            <span className="bracket-score">{game.team1Score}</span>
          )}
        </div>
        <div className={`bracket-team ${game.winnerId === game.team2Id ? 'winner' : ''}`}>
          <div className="bracket-team-info">
            <span className="bracket-seed">{team2.seed}</span>
            <span className="bracket-team-name">{team2.name}</span>
          </div>
          {game.team2Score !== null && game.team2Score !== undefined && (
            <span className="bracket-score">{game.team2Score}</span>
          )}
        </div>
      </div>
    );
  };

  const organized = organizedGames();
  
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
                    {organized[round][region]?.map(game => (
                      <GameDisplay key={game.id} game={game} />
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