'use client';
import React, { useState, useEffect } from 'react';
import GameManagement from '../GameManagement';
import { TournamentData } from '../../admin/page';

interface GameResultsManagementProps {
  tournamentData: TournamentData | null;
  setActiveTab: (tab: string) => void;
}

// New interface for scheduled round transitions
interface RoundTransition {
  fromRound: string;
  toRound: string;
  scheduledTime: Date | null;
}

const GameResultsManagement: React.FC<GameResultsManagementProps> = ({ 
  tournamentData,
  setActiveTab
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [scheduledTransition, setScheduledTransition] = useState<Date | null>(null);
  const [transitionDateTime, setTransitionDateTime] = useState<string>('');
  const [transitionTimeError, setTransitionTimeError] = useState<string>('');
  const [upcomingTransition, setUpcomingTransition] = useState<RoundTransition | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const rounds = [
    'Pre-Tournament',
    'Round of 64',
    'Round of 32',
    'Sweet 16',
    'Elite 8',
    'Final Four',
    'Championship'
  ];

  // Fetch any scheduled transition
  useEffect(() => {
    const fetchScheduledTransition = async () => {
      if (!tournamentData?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/tournament/${tournamentData.id}/scheduled-transition`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.scheduledTime) {
            setUpcomingTransition(data);
            setScheduledTransition(new Date(data.scheduledTime));
            // Format for datetime-local input
            const localDateTime = new Date(data.scheduledTime)
              .toISOString()
              .slice(0, 16); // Format: YYYY-MM-DDTHH:MM
            setTransitionDateTime(localDateTime);
          }
        }
      } catch (error) {
        console.error('Error fetching scheduled transition:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduledTransition();
  }, [tournamentData?.id]);

  // Get the next round based on current round
  const getNextRound = (currentRound: string): string | null => {
    const currentIndex = rounds.indexOf(currentRound);
    if (currentIndex === -1 || currentIndex === rounds.length - 1) return null;
    return rounds[currentIndex + 1];
  };

  // Calculate scores for the current round
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
      
      alert('Scores calculated successfully!');
    } catch (error) {
      console.error('Error calculating scores:', error);
      alert(`Error calculating scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
    }
  };

  // Schedule round transition
  const scheduleRoundTransition = async () => {
    if (!tournamentData?.id || !tournamentData.currentRound || !transitionDateTime) {
      setTransitionTimeError('Please select a valid date and time');
      return;
    }

    const nextRound = getNextRound(tournamentData.currentRound);
    if (!nextRound) {
      setTransitionTimeError('No next round available');
      return;
    }

    // Validate the transition date is in the future
    const scheduledDate = new Date(transitionDateTime);
    if (scheduledDate <= new Date()) {
      setTransitionTimeError('Scheduled time must be in the future');
      return;
    }

    setIsAdvancing(true);
    try {
      const response = await fetch('/api/tournament/schedule-transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: tournamentData.id,
          fromRound: tournamentData.currentRound,
          toRound: nextRound,
          scheduledTime: scheduledDate.toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to schedule round transition');
      }
      
      const data = await response.json();
      setUpcomingTransition({
        fromRound: tournamentData.currentRound,
        toRound: nextRound,
        scheduledTime: scheduledDate
      });
      setScheduledTransition(scheduledDate);
      setTransitionTimeError('');
      
      alert(`Round transition scheduled successfully for ${scheduledDate.toLocaleString()}`);
    } catch (error) {
      console.error('Error scheduling round transition:', error);
      setTransitionTimeError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAdvancing(false);
    }
  };

  // Immediately advance to next round (override any schedule)
  const advanceToNextRound = async () => {
    if (!tournamentData?.id || !tournamentData.currentRound) return;
    
    const nextRound = getNextRound(tournamentData.currentRound);
    if (!nextRound) return;
    
    if (!confirm(`Are you sure you want to advance from "${tournamentData.currentRound}" to "${nextRound}" immediately?`)) {
      return;
    }
    
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
      
      // Refresh the page to reflect the updated round
      window.location.reload();
    } catch (error) {
      console.error('Error advancing round:', error);
      alert(`Error advancing round: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAdvancing(false);
    }
  };

  // Cancel scheduled transition
  const cancelScheduledTransition = async () => {
    if (!tournamentData?.id || !upcomingTransition) return;
    
    if (!confirm('Are you sure you want to cancel the scheduled round transition?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/tournament/cancel-transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: tournamentData.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel scheduled transition');
      }
      
      setUpcomingTransition(null);
      setScheduledTransition(null);
      setTransitionDateTime('');
      
      alert('Scheduled round transition cancelled successfully');
    } catch (error) {
      console.error('Error cancelling scheduled transition:', error);
      alert(`Error cancelling transition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Get time remaining for scheduled transition
  const getTimeRemaining = (): string => {
    if (!scheduledTransition) return '';
    
    const now = new Date();
    const timeRemaining = scheduledTransition.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      return 'Transition pending...';
    }
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    let remainingText = '';
    if (days > 0) remainingText += `${days} days `;
    if (hours > 0) remainingText += `${hours} hours `;
    remainingText += `${minutes} minutes`;
    
    return remainingText;
  };

  if (isLoading) {
    return <div className="admin-loading">Loading...</div>;
  }

  return (
    <div>
      <h2 className="admin-section-title">Game Results Management</h2>
      
      {tournamentData && tournamentData.id ? (
        <>
          <div className="admin-card admin-mb-6">
            <div className="admin-card-header">
              <div className="admin-tournament-status">
                <span className="admin-status-label">Current Tournament Status:</span>
                <span className={`admin-status-badge ${tournamentData.currentRound === 'Pre-Tournament' ? 'admin-status-prestart' : 'admin-status-active'}`}>
                  {tournamentData.currentRound || 'Not Started'}
                </span>
              </div>
            </div>
            <div className="admin-card-body">
              <p className="admin-mb-4">
                {tournamentData.currentRound === 'Pre-Tournament' 
                  ? 'The tournament has not started yet. Schedule when it should transition to Round of 64 or start it immediately.' 
                  : `Update game results for the current round (${tournamentData.currentRound}). Once all games in this round are complete, you can schedule or immediately advance to the next round.`}
              </p>
              
              {/* Round Transition Scheduling */}
              <div className="admin-round-transition">
                <h3 className="admin-subsection-title">
                  {tournamentData.currentRound === 'Championship' 
                    ? 'Tournament Finals' 
                    : `Schedule Transition to ${getNextRound(tournamentData.currentRound || '')}`}
                </h3>
                
                {tournamentData.currentRound !== 'Championship' && (
                  <>
                    {upcomingTransition ? (
                      <div className="admin-scheduled-transition">
                        <div className="admin-info-box">
                          <p>
                            <strong>Scheduled Transition:</strong> {tournamentData.currentRound} → {upcomingTransition.toRound}
                          </p>
                          <p>
                            <strong>Scheduled Time:</strong> {new Date(upcomingTransition.scheduledTime as Date).toLocaleString()}
                          </p>
                          <p>
                            <strong>Time Remaining:</strong> {getTimeRemaining()}
                          </p>
                        </div>
                        <div className="admin-actions-buttons">
                          <button 
                            className="admin-btn admin-btn-red"
                            onClick={cancelScheduledTransition}
                          >
                            Cancel Scheduled Transition
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="admin-schedule-form">
                        <div className="admin-form-group">
                          <label htmlFor="transitionDateTime" className="admin-form-label">
                            Schedule Transition Time:
                          </label>
                          <input
                            type="datetime-local"
                            id="transitionDateTime"
                            className="admin-form-input"
                            value={transitionDateTime}
                            onChange={(e) => setTransitionDateTime(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                          {transitionTimeError && (
                            <div className="admin-form-error">{transitionTimeError}</div>
                          )}
                        </div>
                        <div className="admin-actions-buttons">
                          <button 
                            className="admin-btn admin-btn-blue"
                            onClick={scheduleRoundTransition}
                            disabled={isAdvancing || !transitionDateTime}
                          >
                            {isAdvancing ? 'Scheduling...' : 'Schedule Transition'}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="admin-divider">
                      <span>OR</span>
                    </div>
                    
                    <div className="admin-actions-buttons">
                      <button 
                        className="admin-btn admin-btn-green"
                        onClick={advanceToNextRound}
                        disabled={isAdvancing}
                      >
                        {isAdvancing ? 'Advancing...' : `Advance to ${getNextRound(tournamentData.currentRound || '')} Immediately`}
                      </button>
                      
                      {tournamentData.currentRound !== 'Pre-Tournament' && (
                        <button 
                          className="admin-btn admin-btn-blue"
                          onClick={calculateAllScores}
                          disabled={isCalculating}
                        >
                          {isCalculating ? 'Calculating...' : 'Calculate Current Round Scores'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {tournamentData.currentRound === 'Pre-Tournament' ? (
            <div className="admin-card">
              <div className="admin-card-header">
                Pre-Tournament Setup
              </div>
              <div className="admin-card-body">
                <div className="admin-warning-box">
                  <h3>Tournament Not Started Yet</h3>
                  <p>The tournament is currently in Pre-Tournament mode. You can view and manage matches, but any winners you select now will not affect participant scores until the tournament officially begins.</p>
                  <p>Please schedule when the tournament should start or use the "Advance to Round of 64 Immediately" button above to start the tournament.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-card">
              <div className="admin-card-header">
                Update Game Results - {tournamentData.currentRound}
              </div>
              <div className="admin-card-body">
                <GameManagement tournamentId={tournamentData.id} />
              </div>
            </div>
          )}
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