// components/Bracket.tsx
'use client';
import React from 'react';
import './Bracket.css';

interface Team {
  id: number;
  name: string;
  seed: number | string;
  region?: string;
  eliminated?: boolean;
}

interface Match {
  id: number;
  round: number;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  bracketPosition?: string;
  team1Score?: number | null;
  team2Score?: number | null;
  completed: boolean;
}

interface BracketProps {
  matches: Match[];
  teams: Team[];
  currentRound: string;
}

// Position code format: [Region][Round][Position]
// Region: E=East, W=West, S=South, M=Midwest, N=National
// Round: 1-6
// Position: 1-8 for Round 1, 1-4 for Round 2, etc.

// Map region names to region codes
const regionToCode: Record<string, string> = {
  'East': 'E',
  'West': 'W',
  'South': 'S',
  'Midwest': 'M',
  'National': 'N'
};

// Map region codes to region names
const codeToRegion: Record<string, string> = {
  'E': 'East',
  'W': 'West',
  'S': 'South',
  'M': 'Midwest',
  'N': 'National'
};

const roundDates = {
  'Round of 64': 'Mar 21/22',
  'Round of 32': 'Mar 23/24',
  'Sweet 16': 'Mar 28/29',
  'Elite 8': 'Mar 30/31',
  'Final Four': 'Apr 6',
  'Championship': 'Apr 8'
};

const Bracket: React.FC<BracketProps> = ({ matches, teams, currentRound }) => {
  const getTeam = (teamId: number): Team => {
    return teams.find(team => team.id === teamId) || { id: 0, name: 'TBD', seed: '-' };
  };

  const renderMatchup = (match: Match | null, matchupNumber: number, positionCode?: string) => {
    // If no match exists, render TBD teams
    if (!match) {
      return (
        <ul className={`matchup matchup-${matchupNumber}`}>
          <li className="team team-top" data-position={`${positionCode}-top`}>- TBD</li>
          <li className="team team-bottom" data-position={`${positionCode}-bottom`}>- TBD</li>
        </ul>
      );
    }

    const team1 = getTeam(match.team1Id);
    const team2 = getTeam(match.team2Id);
    
    // Get the position code for this matchup
    const position = match.bracketPosition || positionCode || '';
    
    // Validate seeds based on position
    const validateSeeds = (position: string, team1: Team, team2: Team) => {
      const region = position.charAt(0);
      const round = parseInt(position.charAt(1));
      const positionNum = parseInt(position.substring(2));
      
      // Round 1 validations
      if (round === 1) {
        const validSeeds: Record<string, number[]> = {
          '1': [1, 16],
          '2': [8, 9],
          '3': [5, 12],
          '4': [4, 13],
          '5': [6, 11],
          '6': [3, 14],
          '7': [7, 10],
          '8': [2, 15]
        };
        
        const validPair = validSeeds[positionNum.toString()];
        if (!validPair.includes(team1.seed as number) || !validPair.includes(team2.seed as number)) {
          console.warn(`Invalid seeds in position ${position}: ${team1.seed} vs ${team2.seed}`);
        }
      }
      
      // Round 2 validations
      if (round === 2) {
        // Define which Round 1 matchups feed into each Round 2 matchup
        const round2Feeds: Record<string, [string, string]> = {
          '1': ['13', '14'],  // E21 should be winner of E13 vs winner of E14
          '2': ['15', '16'],  // E22 should be winner of E15 vs winner of E16
          '3': ['17', '12'],  // E23 should be winner of E17 vs winner of E12
          '4': ['11', '18']   // E24 should be winner of E11 vs winner of E18
        };

        const feeds = round2Feeds[positionNum.toString()];
        if (feeds) {
          const [feed1, feed2] = feeds;
          const feed1Match = getMatchByPosition(`${region}1${feed1}`);
          const feed2Match = getMatchByPosition(`${region}1${feed2}`);
          
          if (feed1Match && feed2Match) {
            const feed1Winner = feed1Match.winnerId ? getTeam(feed1Match.winnerId) : null;
            const feed2Winner = feed2Match.winnerId ? getTeam(feed2Match.winnerId) : null;
            
            if (feed1Winner && feed2Winner) {
              // Check if the teams in this Round 2 matchup match the winners of the feeding Round 1 matchups
              if ((team1.id !== feed1Winner.id && team1.id !== feed2Winner.id) ||
                  (team2.id !== feed1Winner.id && team2.id !== feed2Winner.id)) {
                console.warn(`Invalid Round 2 matchup in ${position}: ${team1.seed} vs ${team2.seed}`);
                console.warn(`Should be winner of ${region}1${feed1} vs winner of ${region}1${feed2}`);
              }
            }
          }
        }
      }
      
      // Add more validations for later rounds as needed
    };
    
    // Validate seeds for this matchup
    validateSeeds(position, team1, team2);
    
    return (
      <ul className={`matchup matchup-${matchupNumber}`} key={match.id}>
        <li 
          className={`team team-top ${match.winnerId === team1.id ? 'winner' : ''}`}
          data-position={`${position}-top`}
        >
          {team1.seed} {team1.name}
        </li>
        <li 
          className={`team team-bottom ${match.winnerId === team2.id ? 'winner' : ''}`}
          data-position={`${position}-bottom`}
        >
          {team2.seed} {team2.name}
        </li>
      </ul>
    );
  };

  // Get match by its bracket position
  const getMatchByPosition = (positionCode: string): Match | null => {
    const regionCode = positionCode.charAt(0);
    const round = parseInt(positionCode.charAt(1));
    const position = parseInt(positionCode.substring(2));
    const regionName = codeToRegion[regionCode];
    
    // First, check for a match with this exact bracketPosition
    const matchWithPosition = matches.find(m => m.bracketPosition === positionCode);
    if (matchWithPosition) {
      return matchWithPosition;
    }
    
    // If no match has a bracketPosition, fall back to finding by round and region
    const regionMatches = matches.filter(m => 
      m.round === round && 
      m.region === regionName
    );
    
    // For Round 1, we need to determine position by seed
    if (round === 1 && regionMatches.length > 0) {
      return regionMatches.find(m => getPositionForRound1Match(m) === position) || null;
    }
    
    // For other rounds, just use the position as an index (if available)
    if (regionMatches.length >= position) {
      return regionMatches[position - 1];
    }
    
    return null;
  };

  // Helper to determine position for Round 1 match based on seeds
  const getPositionForRound1Match = (match: Match): number => {
    const team1 = getTeam(match.team1Id);
    const team2 = getTeam(match.team2Id);
    
    const seed1 = parseInt(String(team1.seed)) || 0;
    const seed2 = parseInt(String(team2.seed)) || 0;
    
    // First determine which seed pair this match represents
    if ((seed1 === 1 && seed2 === 16) || (seed1 === 16 && seed2 === 1)) return 1;
    if ((seed1 === 8 && seed2 === 9) || (seed1 === 9 && seed2 === 8)) return 2;
    if ((seed1 === 5 && seed2 === 12) || (seed1 === 12 && seed2 === 5)) return 3;
    if ((seed1 === 4 && seed2 === 13) || (seed1 === 13 && seed2 === 4)) return 4;
    if ((seed1 === 6 && seed2 === 11) || (seed1 === 11 && seed2 === 6)) return 5;
    if ((seed1 === 3 && seed2 === 14) || (seed1 === 14 && seed2 === 3)) return 6;
    if ((seed1 === 7 && seed2 === 10) || (seed1 === 10 && seed2 === 7)) return 7;
    if ((seed1 === 2 && seed2 === 15) || (seed1 === 15 && seed2 === 2)) return 8;
    
    return 0; // Invalid position
  };

  const renderRegion = (regionName: string, regionNumber: number) => {
    const regionCode = regionToCode[regionName];
    
    // Calculate base matchup numbers for each round
    const round1Base = (regionNumber - 1) * 8 + 1;
    const round2Base = 32 + (regionNumber - 1) * 4 + 1;
    const round3Base = 48 + (regionNumber - 1) * 2 + 1;
    const round4Num = 56 + regionNumber;
    
    return (
      <div className={`region region-${regionNumber}`}>
        {/* Round 1 - 8 matchups per region */}
        {Array.from({length: 8}).map((_, idx) => {
          const positionCode = `${regionCode}1${idx + 1}`;
          const match = getMatchByPosition(positionCode);
          if (match && !match.bracketPosition) {
            match.bracketPosition = positionCode; // Set position if not already set
          }
          return renderMatchup(match, round1Base + idx, positionCode);
        })}
        
        {/* Round 2 - 4 matchups per region */}
        {Array.from({length: 4}).map((_, idx) => {
          const positionCode = `${regionCode}2${idx + 1}`;
          const match = getMatchByPosition(positionCode);
          if (match && !match.bracketPosition) {
            match.bracketPosition = positionCode; // Set position if not already set
          }
          return renderMatchup(match, round2Base + idx, positionCode);
        })}
        
        {/* Round 3 (Sweet 16) - 2 matchups per region */}
        {Array.from({length: 2}).map((_, idx) => {
          const positionCode = `${regionCode}3${idx + 1}`;
          const match = getMatchByPosition(positionCode);
          if (match && !match.bracketPosition) {
            match.bracketPosition = positionCode; // Set position if not already set
          }
          return renderMatchup(match, round3Base + idx, positionCode);
        })}
        
        {/* Round 4 (Elite 8) - 1 matchup per region */}
        {(() => {
          const positionCode = `${regionCode}41`;
          const match = getMatchByPosition(positionCode);
          if (match && !match.bracketPosition) {
            match.bracketPosition = positionCode; // Set position if not already set
          }
          return renderMatchup(match, round4Num, positionCode);
        })()}
      </div>
    );
  };

  const renderFinalFour = () => {
    return (
      <div className="final-four">
        {/* Final Four - 2 national semifinal matchups */}
        {Array.from({length: 2}).map((_, idx) => {
          const positionCode = `N5${idx + 1}`;
          const match = getMatchByPosition(positionCode);
          if (match && !match.bracketPosition) {
            match.bracketPosition = positionCode; // Set position if not already set
          }
          return renderMatchup(match, 61 + idx, positionCode);
        })}

        {/* Championship - 1 matchup */}
        {(() => {
          const positionCode = "N61";
          const match = getMatchByPosition(positionCode);
          if (match && !match.bracketPosition) {
            match.bracketPosition = positionCode; // Set position if not already set
          }
          return renderMatchup(match, 63, positionCode);
        })()}
      </div>
    );
  };

  return (
    <div>
      <header>
        <ol>
          <li>Round 1<br/><span>{roundDates['Round of 64']}</span></li>
          <li>Round 2<br/><span>{roundDates['Round of 32']}</span></li>
          <li>Sweet 16<br/><span>{roundDates['Sweet 16']}</span></li>
          <li>Elite 8<br/><span>{roundDates['Elite 8']}</span></li>
          <li>Final Four<br/><span>{roundDates['Final Four']}</span></li>
          <li>Elite 8<br/><span>{roundDates['Elite 8']}</span></li>
          <li>Sweet 16<br/><span>{roundDates['Sweet 16']}</span></li>
          <li>Round 2<br/><span>{roundDates['Round of 32']}</span></li>
          <li>Round 1<br/><span>{roundDates['Round of 64']}</span></li>
        </ol>
      </header>
      <div className="bracket">
        {renderRegion('East', 1)}
        {renderRegion('West', 2)}
        {renderFinalFour()}
        {renderRegion('South', 3)}
        {renderRegion('Midwest', 4)}
      </div>
    </div>
  );
};

export default Bracket;