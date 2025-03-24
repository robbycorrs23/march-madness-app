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
  team1Score?: number | null;
  team2Score?: number | null;
  completed: boolean;
}

interface BracketProps {
  matches: Match[];
  teams: Team[];
  currentRound: string;
}

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

  const renderMatchup = (match: Match, matchupNumber: number) => {
    const team1 = getTeam(match.team1Id);
    const team2 = getTeam(match.team2Id);
    
    return (
      <ul className={`matchup matchup-${matchupNumber}`} key={match.id}>
        <li className={`team team-top ${match.winnerId === team1.id ? 'winner' : ''}`}>
          {team1.seed} {team1.name}
        </li>
        <li className={`team team-bottom ${match.winnerId === team2.id ? 'winner' : ''}`}>
          {team2.seed} {team2.name}
        </li>
      </ul>
    );
  };

  const renderRegion = (regionName: string, regionNumber: number) => {
    const regionMatches = matches.filter(m => m.region === regionName);
    const roundOneMatches = regionMatches.filter(m => m.round === 1);
    const roundTwoMatches = regionMatches.filter(m => m.round === 2);
    const sweetSixteenMatches = regionMatches.filter(m => m.round === 3);
    const eliteEightMatch = regionMatches.find(m => m.round === 4);
    
    const startMatchupNumber = (regionNumber - 1) * 8 + 1;
    
    return (
      <div className={`region region-${regionNumber}`}>
        {/* Round 1 */}
        {roundOneMatches.map((match, idx) => 
          renderMatchup(match, startMatchupNumber + idx)
        )}
        
        {/* Round 2 */}
        {roundTwoMatches.map((match, idx) => 
          renderMatchup(match, 32 + (regionNumber - 1) * 4 + idx + 1)
        )}
        
        {/* Sweet 16 */}
        {sweetSixteenMatches.map((match, idx) => 
          renderMatchup(match, 48 + (regionNumber - 1) * 2 + idx + 1)
        )}
        
        {/* Elite 8 */}
        {eliteEightMatch && renderMatchup(eliteEightMatch, 56 + regionNumber)}
      </div>
    );
  };

  const renderFinalFour = () => {
    const finalFourMatches = matches.filter(m => m.round === 5);
    const championshipMatch = matches.find(m => m.round === 6);
    
    return (
      <div className="final-four">
        {finalFourMatches.map((match, idx) => 
          renderMatchup(match, 61 + idx)
        )}
        {championshipMatch && (
          <ul className="matchup championship">
            <li className={`team team-top ${championshipMatch.winnerId === championshipMatch.team1Id ? 'winner' : ''}`}>
              {getTeam(championshipMatch.team1Id).name}
            </li>
            <li className={`team team-bottom ${championshipMatch.winnerId === championshipMatch.team2Id ? 'winner' : ''}`}>
              {getTeam(championshipMatch.team2Id).name}
            </li>
          </ul>
        )}
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