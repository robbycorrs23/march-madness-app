'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Define types for tournament and participant data
type TournamentData = {
  id?: string;
  entryFee?: number;
  currentRound?: string;
  // Add other tournament-related fields as needed
};

type Participant = {
  id: string;
  name: string;
  totalScore: number;
  paid: boolean;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  // Fetch initial data
  useEffect(() => {
    if (status === 'authenticated') {
      const fetchData = async () => {
        try {
          // Fetch current tournament
          const tournamentResponse = await fetch('/api/tournament');
          if (tournamentResponse.ok) {
            const tournamentData = await tournamentResponse.json();
            setTournamentData(tournamentData);
          }
          // Fetch participants
          const participantsResponse = await fetch('/api/participants');
          if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            setParticipants(participantsData);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          setError('Failed to load data');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [status]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  const getTotalPrizePool = () => {
    if (!participants.length) return 0;
    const entryFee = tournamentData?.entryFee ?? 25;
    return participants.length * entryFee;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Admin Dashboard - March Madness Fantasy 2025</h1>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-white hover:text-gray-300">
                View Site
              </Link>
              <button 
                onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="md:w-1/4 bg-white shadow-md rounded-lg p-4 h-fit">
            <nav>
              <ul className="space-y-1">
                <li>
                  <button 
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Dashboard Overview
                  </button>
                </li>
                <li>
                  <button 
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'tournament' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('tournament')}
                  >
                    Tournament Management
                  </button>
                </li>
                <li>
                  <button 
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'participants' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('participants')}
                  >
                    Participants
                  </button>
                </li>
                <li>
                  <button 
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'games' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('games')}
                  >
                    Game Results
                  </button>
                </li>
                <li>
                  <button 
                    className={`w-full text-left px-4 py-2 rounded ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('settings')}
                  >
                    Settings
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="md:w-3/4 bg-white shadow-md rounded-lg p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div>
                    <h2 className="text-xl font-bold mb-6">Dashboard Overview</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">Total Participants</h3>
                        <p className="text-2xl font-bold text-blue-900">{participants.length}</p>
                      </div>
                      
                      <div className="bg-green-100 p-4 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-800 mb-2">Total Prize Pool</h3>
                        <p className="text-2xl font-bold text-green-900">${getTotalPrizePool()}</p>
                        <p className="text-sm text-green-600 mt-1">
                          ${tournamentData?.entryFee || 25} × {participants.length} entries
                        </p>
                      </div>
                      
                      <div className="bg-orange-100 p-4 rounded-lg border border-orange-200">
                        <h3 className="text-sm font-medium text-orange-800 mb-2">Current Round</h3>
                        <p className="text-2xl font-bold text-orange-900">
                          {tournamentData?.currentRound || 'Not Started'}
                        </p>
                      </div>
                    </div>
                    
                    {participants.length > 0 ? (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Leaderboard (Top 5)</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Points</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {participants
                                .sort((a, b) => b.totalScore - a.totalScore)
                                .slice(0, 5)
                                .map((participant, index) => (
                                  <tr key={participant.id}>
                                    <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                                    <td className="px-4 py-3 whitespace-nowrap font-medium">{participant.name}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{participant.totalScore}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        participant.paid 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
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
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Participants Yet</h3>
                        <p>
                          There are no participants in the tournament yet. Set up your tournament and
                          share the link to start collecting entries.
                        </p>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        {!tournamentData ? (
                          <button 
                            onClick={() => setActiveTab('tournament')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                          >
                            Setup Tournament
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => setActiveTab('games')}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                            >
                              Update Games
                            </button>
                            <button 
                              onClick={() => setActiveTab('participants')}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                            >
                              Manage Participants
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'tournament' && (
                  <div>
                    <h2 className="text-xl font-bold mb-6">Tournament Management</h2>
                    {/* Tournament management content will go here */}
                    <p className="text-gray-600">
                      {tournamentData 
                        ? 'Edit tournament settings and manage teams' 
                        : 'Set up your tournament by creating regions and importing teams'}
                    </p>
                  </div>
                )}

                {activeTab === 'participants' && (
                  <div>
                    <h2 className="text-xl font-bold mb-6">Participants</h2>
                    {/* Participants management content will go here */}
                    <p className="text-gray-600">Manage tournament participants and track payments</p>
                  </div>
                )}

                {activeTab === 'games' && (
                  <div>
                    <h2 className="text-xl font-bold mb-6">Game Results</h2>
                    {/* Game results management content will go here */}
                    <p className="text-gray-600">Update game results and advance rounds</p>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div>
                    <h2 className="text-xl font-bold mb-6">Settings</h2>
                    {/* Settings content will go here */}
                    <p className="text-gray-600">Configure application settings</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
