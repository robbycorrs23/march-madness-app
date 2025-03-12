'use client';
import React from 'react';
import { TournamentData, Participant } from '../../admin/page';

interface DashboardOverviewProps {
  tournamentData: TournamentData | null;
  participants: Participant[];
  setActiveTab: (tab: string) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  tournamentData, 
  participants,
  setActiveTab
}) => {
  // Calculate statistics
  const getTotalPrizePool = () => {
    if (!participants.length) return 0;
    const entryFee = tournamentData?.entryFee ?? 25;
    return participants.length * entryFee;
  };

  const getPaymentStatus = () => {
    if (!participants.length) return { paid: 0, unpaid: 0, percentage: 0 };
    const paid = participants.filter(p => p.paid).length;
    const unpaid = participants.length - paid;
    const percentage = Math.round((paid / participants.length) * 100);
    return { paid, unpaid, percentage };
  };

  const paymentStatus = getPaymentStatus();

  return (
    <div>
      <h2 className="admin-section-title">Dashboard Overview</h2>
      
      <div className="admin-stats-grid">
        {/* Participants Stat */}
        <div className="admin-stat-card admin-stat-card-blue">
          <h3 className="admin-stat-label admin-stat-label-blue">Total Participants</h3>
          <p className="admin-stat-value admin-stat-value-blue">{participants.length}</p>
        </div>
        
        {/* Prize Pool Stat */}
        <div className="admin-stat-card admin-stat-card-green">
          <h3 className="admin-stat-label admin-stat-label-green">Total Prize Pool</h3>
          <p className="admin-stat-value admin-stat-value-green">${getTotalPrizePool()}</p>
          <p className="admin-stat-subtext admin-stat-subtext-green">
            ${tournamentData?.entryFee || 25} × {participants.length} entries
          </p>
        </div>
        
        {/* Current Round Stat */}
        <div className="admin-stat-card admin-stat-card-orange">
          <h3 className="admin-stat-label admin-stat-label-orange">Current Round</h3>
          <p className="admin-stat-value admin-stat-value-orange">
            {tournamentData?.currentRound || 'Not Started'}
          </p>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="admin-card admin-mb-6">
        <div className="admin-card-header">
          Payment Status
        </div>
        <div className="admin-card-body">
          <div className="admin-flex admin-justify-between admin-items-center admin-mb-2">
            <div className="admin-font-bold">
              {paymentStatus.paid} of {participants.length} participants paid
            </div>
            <div>
              {paymentStatus.percentage}%
            </div>
          </div>
          <div className="admin-progress">
            <div 
              className="admin-progress-bar" 
              style={{ width: `${paymentStatus.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {participants.length > 0 ? (
        <div className="admin-mb-6">
          <h3 className="admin-actions-title">Leaderboard (Top 5)</h3>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead className="admin-table-header">
                <tr>
                  <th className="admin-table-header-cell">Rank</th>
                  <th className="admin-table-header-cell">Name</th>
                  <th className="admin-table-header-cell">Total Points</th>
                  <th className="admin-table-header-cell">Payment Status</th>
                </tr>
              </thead>
              <tbody className="admin-table-body">
                {participants
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .slice(0, 5)
                  .map((participant, index) => (
                    <tr key={participant.id} className="admin-table-row">
                      <td className="admin-table-cell admin-table-cell-rank">{index + 1}</td>
                      <td className="admin-table-cell admin-table-cell-name">{participant.name}</td>
                      <td className="admin-table-cell">{participant.totalScore}</td>
                      <td className="admin-table-cell">
                        <span className={`admin-badge ${
                          participant.paid
                            ? 'admin-badge-paid'
                            : 'admin-badge-unpaid'
                        }`}>
                          {participant.paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="admin-no-data-alert">
          <h3 className="admin-no-data-title">No Participants Yet</h3>
          <p>
            There are no participants in the tournament yet. Set up your tournament and
            share the link to start collecting entries.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="admin-actions-container">
        <h3 className="admin-actions-title">Quick Actions</h3>
        <div className="admin-actions-buttons">
          {!tournamentData ? (
            <button
              onClick={() => setActiveTab('tournament')}
              className="admin-btn admin-btn-blue"
            >
              Setup Tournament
            </button>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('games')}
                className="admin-btn admin-btn-green"
              >
                Update Games
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className="admin-btn admin-btn-purple"
              >
                Manage Participants
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
