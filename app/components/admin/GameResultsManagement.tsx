'use client';
import React, { useState, useEffect } from 'react';
import GameManagement from '../GameManagement';
import { TournamentData } from '../../admin/page';
// Import an icon component if available (example, replace if needed)
// import { FaCalculator, FaCalendarAlt, FaCheck } from 'react-icons/fa';

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
  const [selectedNextRound, setSelectedNextRound] = useState<string>('');
  // New state for expanding the match editor
  const [isMatchEditorExpanded, setIsMatchEditorExpanded] = useState(false);

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
          } else {
            // Explicitly clear if no transition found
            setUpcomingTransition(null);
            setScheduledTransition(null);
            setTransitionDateTime('');
          }
        } else {
          // Handle cases where fetch is ok but no transition exists (e.g., 404)
          setUpcomingTransition(null);
          setScheduledTransition(null);
          setTransitionDateTime('');
        }
      } catch (error) {
        console.error('Error fetching scheduled transition:', error);
        setUpcomingTransition(null); // Clear on error too
        setScheduledTransition(null);
        setTransitionDateTime('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduledTransition();
  }, [tournamentData?.id]);

  // Update selectedNextRound when tournamentData changes or loads
  useEffect(() => {
    if (tournamentData?.currentRound) {
      const nextRoundAuto = getNextRound(tournamentData.currentRound);
      setSelectedNextRound(nextRoundAuto || ''); // Default to immediate next round or empty
    }
  }, [tournamentData?.currentRound]);

  // Get the next round based on current round
  const getNextRound = (currentRound: string): string | null => {
    const currentIndex = rounds.indexOf(currentRound);
    if (currentIndex === -1 || currentIndex === rounds.length - 1) return null;
    return rounds[currentIndex + 1];
  };

  // Get all possible rounds (excluding the current one, unless it's the only one)
  const getOtherRounds = (currentRound: string): string[] => {
    if (!currentRound) return rounds; // Return all if current is unknown
    const filtered = rounds.filter(r => r !== currentRound);
    // If filtering removed all rounds (e.g., only 1 round exists), return empty or handle as needed
    return filtered;
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
		
		const result = await response.json();
		
		// Show success message
		alert('Scores calculated successfully!');
		
		// Refresh the page to show updated scores
		// Option 1: Full page refresh
		window.location.reload();
		
		// Option 2: If you have a state update function to refresh just scores
		// refreshScores();
	  } catch (error) {
		console.error('Error calculating scores:', error);
		alert(`Error calculating scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
	  } finally {
		setIsCalculating(false);
	  }
	};

  // Schedule round transition
  const scheduleRoundTransition = async () => {
    // Use selectedNextRound from state
    if (!tournamentData?.id || !tournamentData.currentRound || !transitionDateTime || !selectedNextRound) {
      setTransitionTimeError('Please select a target round and a valid date and time');
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
          toRound: selectedNextRound, // Use selected round
          scheduledTime: scheduledDate.toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to schedule round transition');
      }
      
      const data = await response.json();
      setUpcomingTransition({
        fromRound: tournamentData.currentRound,
        toRound: selectedNextRound, // Use selected round
        scheduledTime: scheduledDate
      });
      setScheduledTransition(scheduledDate);
      setTransitionTimeError('');
      
      alert(`Round transition to ${selectedNextRound} scheduled successfully for ${scheduledDate.toLocaleString()}`);
    } catch (error) {
      console.error('Error scheduling round transition:', error);
      setTransitionTimeError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAdvancing(false);
    }
  };

  // Immediately advance to next round (override any schedule)
  const advanceToNextRound = async () => {
    // Use selectedNextRound from state
    if (!tournamentData?.id || !tournamentData.currentRound || !selectedNextRound) return;
        
    // Add more specific confirmation, especially if going backward
    const isMovingBackwards = rounds.indexOf(selectedNextRound) < rounds.indexOf(tournamentData.currentRound);
    const confirmationMessage = isMovingBackwards
      ? `WARNING: You are setting the round backwards from "${tournamentData.currentRound}" to "${selectedNextRound}". This may have unintended consequences if not supported by the backend. Are you absolutely sure?`
      : `Are you sure you want to set the current round from "${tournamentData.currentRound}" to "${selectedNextRound}" immediately?`;

    if (!confirm(confirmationMessage)) {
      return;
    }
    
    setIsAdvancing(true);
    try {
      // This API might need enhancement to handle reverts safely
      const response = await fetch('/api/tournament/advance-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: tournamentData.id,
          currentRound: tournamentData.currentRound,
          nextRound: selectedNextRound
        }),
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error setting round:', errorBody);
        throw new Error(`Failed to set round: ${response.statusText} - ${errorBody}`);
      }
      
      // Refresh the page to reflect the updated round
      alert(`Tournament round successfully set to ${selectedNextRound}. Reloading...`);
      window.location.reload();
    } catch (error) {
      console.error('Error setting round:', error);
      alert(`Error setting round: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    if (days > 0) remainingText += `${days}d `;
    if (hours > 0) remainingText += `${hours}h `;
    remainingText += `${minutes}m`;
    
    return remainingText;
  };

  if (isLoading) {
    // Consider a more engaging loading state for mobile hub
    return <div className="admin-hub-loading">Loading Admin Hub...</div>;
  }

  if (!tournamentData || !tournamentData.id) {
     return (
        <div className="admin-hub-container admin-no-data-alert">
          <h3 className="admin-no-data-title">No Tournament Setup</h3>
          <p>
            You need to set up a tournament before you can manage game results.
          </p>
          <button
            onClick={() => setActiveTab('tournament')}
            className="admin-btn admin-btn-blue admin-mt-4"
          >
            Go to Tournament Setup
          </button>
        </div>
      );
  }

  // Use getOtherRounds now
  const otherRounds = tournamentData?.currentRound ? getOtherRounds(tournamentData.currentRound) : rounds;

  // --- NEW Mobile Action Hub JSX Structure --- 
  return (
    <div className="admin-hub-container"> 
      {/* 1. Header / Status Banner */} 
      <div className="admin-hub-banner">
        <h1>{tournamentData.name}</h1>
        <p className="admin-hub-current-round">Current Round: <strong>{tournamentData.currentRound}</strong></p>
        {upcomingTransition && (
          <p className="admin-hub-scheduled-info">
            {/* <FaCalendarAlt /> Optional Icon */} 
            Transition to {upcomingTransition.toRound} scheduled: {new Date(upcomingTransition.scheduledTime as Date).toLocaleString()} ({getTimeRemaining()} left)
          </p>
        )}
        {isAdvancing && <p className="admin-hub-status-advancing">Processing round change...</p>}
      </div>

      {/* 2. Primary Action: Manage Current Round */} 
      {tournamentData.currentRound !== 'Pre-Tournament' && tournamentData.currentRound !== 'Championship' && (
        <div className="admin-hub-card admin-hub-primary-action"> 
          <h2>Manage {tournamentData.currentRound} Matches</h2>
          {/* Optional: Show quick progress summary here */} 
          {!isMatchEditorExpanded && (
             <button 
              className="admin-btn admin-btn-primary admin-btn-lg admin-mt-2"
              onClick={() => setIsMatchEditorExpanded(true)}
            >
              Edit Current Matches
            </button>
          )}
          {isMatchEditorExpanded && (
            <div className="admin-hub-match-editor-container admin-mt-4">
              {/* Button to collapse */} 
               <button 
                className="admin-btn admin-btn-secondary admin-mb-4"
                onClick={() => setIsMatchEditorExpanded(false)}
              >
                Hide Match Editor
              </button>
              {/* Embed GameManagement - Needs mobile styling adjustments later */} 
              <GameManagement tournamentId={parseInt(tournamentData.id.toString(), 10)} />
            </div>
          )}
        </div>
      )}

       {/* Show message if Pre-Tournament */} 
       {tournamentData.currentRound === 'Pre-Tournament' && (
         <div className="admin-hub-card admin-warning-box"> 
            <h3>Tournament Not Started Yet</h3>
            <p>Schedule the start or set the round to 'Round of 64' below.</p>
         </div>
       )}
        {/* Show message if Championship (final) */} 
       {tournamentData.currentRound === 'Championship' && !isMatchEditorExpanded && (
         <div className="admin-hub-card"> 
            <h2>Manage Championship Game</h2>
             <button 
              className="admin-btn admin-btn-primary admin-btn-lg admin-mt-2"
              onClick={() => setIsMatchEditorExpanded(true)}
            >
              Edit Championship Match
            </button>
         </div>
       )}
        {tournamentData.currentRound === 'Championship' && isMatchEditorExpanded && (
          <div className="admin-hub-card admin-hub-primary-action">
             <div className="admin-hub-match-editor-container admin-mt-4">
                <button 
                  className="admin-btn admin-btn-secondary admin-mb-4"
                  onClick={() => setIsMatchEditorExpanded(false)}
                >
                  Hide Match Editor
                </button>
                <GameManagement tournamentId={parseInt(tournamentData.id.toString(), 10)} />
             </div>
          </div>
        )}

      {/* 3. Secondary Action: Set Tournament Round */} 
      <div className="admin-hub-card"> 
        <h2>Set Tournament Round</h2>
        <div className="admin-form-group admin-mb-4">
          <label htmlFor="targetRoundSelect" className="admin-form-label">Target Round:</label>
          <select 
            id="targetRoundSelect"
            className="admin-form-input admin-select" 
            value={selectedNextRound}
            onChange={(e) => { setSelectedNextRound(e.target.value); }}
          >
            <option value="" disabled={selectedNextRound !== ''}>-- Select Target Round --</option>
            {rounds.map(round => (
              <option key={round} value={round} disabled={round === tournamentData.currentRound}>
                {round} {round === tournamentData.currentRound ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons - Conditionally render based on selectedNextRound */} 
        {selectedNextRound && (
          <div className="admin-hub-set-round-actions admin-mt-3">
            {/* Button to Set Immediately - Show only if NO transition scheduled */} 
            {!upcomingTransition && (
              <button 
                className="admin-btn admin-btn-green admin-mr-2"
                onClick={advanceToNextRound}
                disabled={isAdvancing || !selectedNextRound}
              >
                {isAdvancing ? 'Setting...' : `Set to ${selectedNextRound} Immediately`}
              </button>
            )}
            
            {/* Button to reveal/trigger Scheduling - Show only if NO transition scheduled */} 
            {!upcomingTransition && (
              <button 
                className="admin-btn admin-btn-blue"
                onClick={() => { 
                  if (!selectedNextRound) { 
                    setTransitionTimeError('Select a target round first.');
                  } else {
                    setTransitionTimeError('');
                    // Optionally focus the date input which should appear below
                    // setTimeout(() => document.getElementById('transitionDateTime')?.focus(), 0); 
                  }
                }}
                disabled={isAdvancing || !selectedNextRound}
              >
                Schedule Transition
              </button>
            )}

            {/* Cancel button / Warning if a transition IS scheduled */} 
            {upcomingTransition && upcomingTransition.toRound === selectedNextRound && (
              <button 
                className="admin-btn admin-btn-red"
                onClick={cancelScheduledTransition}
              >
                Cancel Scheduled Transition to {selectedNextRound}
              </button>
            )}
            {upcomingTransition && upcomingTransition.toRound !== selectedNextRound && (
              <div className="admin-warning-box admin-mt-2">
                <p style={{ margin: 0 }}>
                  A transition to <strong>{upcomingTransition.toRound}</strong> is already scheduled. Cancel it first.
                </p>
                <button 
                  className="admin-btn admin-btn-red admin-ml-2 admin-mt-1"
                  onClick={cancelScheduledTransition}
                >
                  Cancel Existing Schedule
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Scheduling Controls (Conditional) */} 
      {/* Show scheduling form only if a round is selected AND no other transition is active */} 
      {selectedNextRound && !upcomingTransition && (
        <div className="admin-hub-card admin-hub-scheduler admin-mt-4">
          <h3>Schedule Transition to {selectedNextRound}</h3>
          <div className="admin-form-group">
            <label htmlFor="transitionDateTime" className="admin-form-label">Date and Time:</label>
            <input
              type="datetime-local"
              id="transitionDateTime"
              className="admin-form-input"
              value={transitionDateTime}
              onChange={(e) => {
                setTransitionDateTime(e.target.value);
                setTransitionTimeError(''); 
              }}
              min={new Date().toISOString().slice(0, 16)} 
            />
            {transitionTimeError && (
              <div className="admin-form-error">{transitionTimeError}</div>
            )}
          </div>
          <div className="admin-actions-buttons admin-mt-2">
            <button 
              className="admin-btn admin-btn-blue"
              onClick={scheduleRoundTransition}
              disabled={isAdvancing || !transitionDateTime}
            >
              Confirm Schedule
            </button>
          </div>
        </div>
      )}

      {/* 5. Tertiary Action: Score Calculation (FAB Example) */} 
      <button 
        className="admin-hub-fab admin-btn admin-btn-accent"
        onClick={calculateAllScores}
        disabled={isCalculating}
        title="Calculate All Scores"
      >
        {isCalculating ? '...' : 'Calc Scores'}
      </button>
    </div>
  );
};

export default GameResultsManagement;