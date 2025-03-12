// components/Leaderboard.tsx
'use client';
import { useState, useEffect } from 'react';

// Define types for TypeScript
interface Participant {
  id: number;
  name: string;
  preTournamentScore: number;
  cinderellaScore: number;
  roundScore: number;
  totalScore: number;
}

const Leaderboard = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        setParticipants(data);
      } catch (error) {
        // Fix the TypeScript error by checking if error is an Error object
        setError('Error loading leaderboard: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Function to get the appropriate CSS class for ranking
  const getRankClass = (index: number): string => {
    if (index === 0) return "leaderboard-rank-1";
    if (index === 1) return "leaderboard-rank-2";
    if (index === 2) return "leaderboard-rank-3";
    return "";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="card">
        <div className="card-accent-top"></div>
        <div className="card-body text-center py-10 basketball-pattern">
          <div className="mb-4">
            <div className="basketball-icon mx-auto" style={{ width: '48px', height: '48px', fontSize: '24px' }}>🏀</div>
          </div>
          <h3 className="text-lg font-bold mb-2">No Participants Yet</h3>
          <p className="text-neutral-medium">Be the first to join and submit your picks!</p>
          <button className="btn btn-primary mt-4">Make Your Picks</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-accent-top"></div>
      <div className="card-body p-0">
        <div className="overflow-x-auto">
          <table className="leaderboard-table w-full">
            <thead>
              <tr>
                <th className="w-16">Rank</th>
                <th>Name</th>
                <th className="text-center">Pre-Tournament</th>
                <th className="text-center">Cinderella</th>
                <th className="text-center">Round Points</th>
                <th className="text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant, index) => (
                <tr key={participant.id}>
                  <td>
                    <div className={`leaderboard-rank ${getRankClass(index)}`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="leaderboard-name">{participant.name}</td>
                  <td className="text-center">{participant.preTournamentScore}</td>
                  <td className="text-center">{participant.cinderellaScore}</td>
                  <td className="text-center">{participant.roundScore}</td>
                  <td className="text-center">
                    <span className="leaderboard-total">{participant.totalScore}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {participants.length > 0 && (
        <div className="card-action">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-medium">
              Total Participants: <span className="font-bold">{participants.length}</span>
            </div>
            <button className="btn btn-sm btn-secondary">
              <i className="btn-icon">📊</i> View Full Stats
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
