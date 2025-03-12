'use client';
import React, { useState } from 'react';
import GameManagement from '../GameManagement';
import { TournamentData } from '../../admin/page';

interface GameResultsManagementProps {
  tournamentData: TournamentData | null;
  setActiveTab: (tab: string) => void;
}

const GameResultsManagement: React.FC<GameResultsManagementProps> = ({ 
  tournamentData,
  setActiveTab
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const calculateAllScores = async () => {
    setIsCalculating(true);
    try {
      const response = await fetch('/api/scores/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: tournamentData?.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate scores');
      }
      
      // Handle success - could dispatch an event or update state
    } catch (error) {
      console.error('Error calculating scores:', error);
      // Could set an error state here
    } finally {
      setIsCalculating(false);
    }
  };

  const advanceToNextRound = async () => {
    if (!tournamentData || !tournamentData.currentRound) return;
    
    const rounds = [
      'Round of 64',
      'Round of 32',
      'Sweet 16',
      'Elite 8',
      'Final Four',
      'Championship'
    ];
    
    const currentIndex = rounds.indexOf(tournamentData.currentRound);
    if (currentIndex === -1 || currentIndex === rounds.length - 1) return;
    
    const nextRound = rounds[currentIndex + 1];
    
    setIsAdvancing(true);
    try {
      const response = await fetch('/api/tournament/advance-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: tournamentData.id,
          currentRound: tournamentData.currentRound,
          nextRound
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to advance to next round');
      }
      
      // Refresh the page or update state after advancing
      window.location.reload();
    } catch (error) {
      console.error('Error advancing round:', error);
      // Could set an error state here
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div>
      <h2 className="admin-section-title">Game Results Management</h2>
      
      {tournamentData && tournamentData.id ? (
        <>
          <div className="admin-card admin-mb-6">
            <div className="admin-card-header">
              Current Round: {tournamentData.currentRound || 'Not Started'}
            </div>
            <div className="admin-card-body">
              <p className="admin-mb-4">
                Update game results for the current round. Once all games in this round are complete, 
                you can generate the next round's matchups.
              </p>
              
              <div className="admin-actions-buttons">
                <button 
                  className="admin-btn admin-btn-blue"
                  onClick={calculateAllScores}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Calculating...' : 'Calculate Scores'}
                </button>
                
                <button 
                  className="admin-btn admin-btn-green"
                  onClick={advanceToNextRound}
                  disabled={isAdvancing || !tournamentData.currentRound || tournamentData.currentRound === 'Championship'}
                >
                  {isAdvancing ? 'Advancing...' : 'Advance to Next Round'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="admin-card">
            <div className="admin-card-header">
              Update Game Results - {tournamentData.currentRound}
            </div>
            <div className="admin-card-body">
              <GameManagement tournamentId={tournamentData.id} />
            </div>
          </div>
        </>
      ) : (
        <div className="admin-no-data-alert">
          <h3 className="admin-no-data-title">No Tournament Setup</h3>
          <p>
            You need to set up a tournament before you can manage game results.
          </p>
          <button
            onClick={() => setActiveTab('tournament')}
            className="admin-btn admin-btn-blue"
            style={{ marginTop: '1rem' }}
          >
            Setup Tournament
          </button>
        </div>
      )}
    </div>
  );
};

export default GameResultsManagement;
