'use client';
import React from 'react';
import TournamentSetup from '../TournamentSetup';
import TeamManagement from '../TeamManagement';
import { TournamentData } from '../../admin/page';

interface TournamentManagementProps {
  tournamentData: TournamentData | null;
  onTournamentUpdate: (tournament: TournamentData) => void;
}

const TournamentManagement: React.FC<TournamentManagementProps> = ({ 
  tournamentData, 
  onTournamentUpdate 
}) => {
  // When using a type assertion, ensure the runtime values are compatible
  const adaptTournamentData = () => {
    if (!tournamentData) return undefined;
    
    // Create a new object with numeric ID
    const adapted = {
      ...tournamentData,
      id: tournamentData.id ? Number(tournamentData.id) : undefined,
      // Ensure other required properties have default values if they might be undefined
      name: tournamentData.name || '',
      year: tournamentData.year || 2025,
      entryFee: tournamentData.entryFee || 25,
      currentRound: tournamentData.currentRound || 'Pre-Tournament',
      regions: tournamentData.regions || []
    };
    
    return adapted;
  };

  return (
    <div>
      <h2 className="admin-section-title">Tournament Management</h2>
      
      {tournamentData && tournamentData.id ? (
        <div className="admin-grid-cols-2">
          <div className="admin-card">
            <div className="admin-card-header">Tournament Details</div>
            <div className="admin-card-body">
              <TournamentSetup 
                // Use type assertion to bypass TypeScript's type checking
                existingTournament={adaptTournamentData() as any} 
                onSetupComplete={(tournament) => {
                  // Convert back to the expected type
                  onTournamentUpdate({
                    ...tournament,
                    id: tournament.id ? String(tournament.id) : undefined
                  });
                }} 
              />
            </div>
          </div>
          
          <div className="admin-card">
            <div className="admin-card-header">Team Management</div>
            <div className="admin-card-body">
              <TeamManagement 
                tournamentId={tournamentData.id} 
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-card">
          <div className="admin-card-header">Create New Tournament</div>
          <div className="admin-card-body">
            <TournamentSetup 
              onSetupComplete={(tournament) => {
                // Convert number id to string if needed
                onTournamentUpdate({
                  ...tournament,
                  id: tournament.id ? String(tournament.id) : undefined
                });
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManagement;
