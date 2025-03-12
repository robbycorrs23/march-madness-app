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
  return (
    <div>
      <h2 className="admin-section-title">Tournament Management</h2>
      
      {tournamentData && tournamentData.id ? (
        <div className="admin-grid-cols-2">
          <div className="admin-card">
            <div className="admin-card-header">Tournament Details</div>
            <div className="admin-card-body">
              <TournamentSetup 
                existingTournament={tournamentData} 
                onSetupComplete={onTournamentUpdate} 
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
              onSetupComplete={onTournamentUpdate} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManagement;
