'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../components/admin/AdminHeader';
import AdminNavigation from '../components/admin/AdminNavigation';
import DashboardOverview from '../components/admin/DashboardOverview';
import TournamentManagement from '../components/admin/TournamentManagement';
import ParticipantManagement from '../components/admin/ParticipantManagement';
import GameResultsManagement from '../components/admin/GameResultsManagement';
import SettingsPanel from '../components/admin/SettingsPanel';
import '../styles/admin-dashboard.css';

// Define common types that will be used across components
export type TournamentData = {
  id?: string;
  name?: string;
  year?: number;
  entryFee?: number;
  currentRound?: string;
  regions?: string[];
};

export type Participant = {
  id: string;
  name: string;
  email: string;
  totalScore: number;
  paid: boolean;
  preTournamentScore?: number;
  roundScore?: number;
  cinderellaScore?: number;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // Callback for updating tournament data
  const handleTournamentUpdate = (updatedTournament: TournamentData) => {
    setTournamentData(updatedTournament);
    setSuccess('Tournament updated successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Callback for updating participant data
  const handleParticipantUpdate = (updatedParticipant: Participant, action = 'update') => {
    if (action === 'add') {
      setParticipants(prev => [...prev, updatedParticipant]);
    } else if (action === 'delete') {
      setParticipants(prev => prev.filter(p => p.id !== updatedParticipant.id));
    } else {
      setParticipants(prev => 
        prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p)
      );
    }
    setSuccess(`Participant ${action === 'add' ? 'added' : action === 'delete' ? 'removed' : 'updated'} successfully`);
    setTimeout(() => setSuccess(''), 3000);
  };

  if (status === 'loading') {
    return <div className="admin-loading-spinner">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  // Render the appropriate component based on the active tab
  const renderActiveTab = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <DashboardOverview 
            tournamentData={tournamentData}
            participants={participants}
            setActiveTab={setActiveTab}
          />
        );
      case 'tournament':
        return (
          <TournamentManagement 
            tournamentData={tournamentData}
            onTournamentUpdate={handleTournamentUpdate}
          />
        );
      case 'participants':
        return (
          <ParticipantManagement 
            participants={participants}
            onParticipantUpdate={handleParticipantUpdate}
          />
        );
      case 'games':
        return (
          <GameResultsManagement 
            tournamentData={tournamentData}
            setActiveTab={setActiveTab}
          />
        );
      case 'settings':
        return (
          <SettingsPanel 
            setSuccess={setSuccess}
            userEmail={session?.user?.email || ''}
          />
        );
      default:
        return <DashboardOverview 
          tournamentData={tournamentData}
          participants={participants}
          setActiveTab={setActiveTab}
        />;
    }
  };

  return (
    <div className="admin-dashboard-container">
      <AdminHeader />
      <AdminNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="admin-main-content">
        <main className="admin-content-area">
          {error && (
            <div className="admin-error-alert">
              {error}
            </div>
          )}
          
          {success && (
            <div className="admin-alert-success">
              {success}
            </div>
          )}
          
          {loading ? (
            <div className="admin-loading-spinner">
              <div className="admin-spinner"></div>
            </div>
          ) : (
            renderActiveTab()
          )}
        </main>
      </div>
    </div>
  );
}
