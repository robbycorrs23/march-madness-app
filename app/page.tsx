// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PickSubmissionForm from './components/PickSubmissionForm';
import Leaderboard from './components/Leaderboard';
import Bracket from './components/Bracket';

// Define TypeScript interfaces
interface Tournament {
  id?: number;
  name: string;
  year: number;
  entryFee: number;
  currentRound: string;
  regions: string[];
}

interface Team {
  id: number;
  name: string;
  seed: number;
  region: string;
  eliminated?: boolean;
}

interface Game {
  id: number;
  round: string;
  region: string;
  team1Id: number;
  team2Id: number;
  winnerId: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
  completed?: boolean;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('bracket');
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentRound, setCurrentRound] = useState('');
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament info
        const tournamentResponse = await fetch('/api/tournament');
        if (tournamentResponse.ok) {
          const tournamentData = await tournamentResponse.json();
          setTournament(tournamentData);
          if (tournamentData) {
            setCurrentRound(tournamentData.currentRound);
          }
        }
        // Only fetch games and teams if we have a tournament
        if (tournament) {
          // Fetch teams
          const teamsResponse = await fetch('/api/teams');
          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json();
            setTeams(teamsData);
          }
          // Fetch games
          const gamesResponse = await fetch('/api/games');
          if (gamesResponse.ok) {
            const gamesData = await gamesResponse.json();
            setGames(gamesData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tournament?.id]);

  const getCurrentRoundLabel = () => {
    if (!currentRound) return "Tournament Not Started";
    const roundStatus: Record<string, string> = {
      "Pre-Tournament": "Selection Sunday Complete",
      "Round of 64": "First Round",
      "Round of 32": "Second Round",
      "Sweet 16": "Regional Semifinals",
      "Elite 8": "Regional Finals",
      "Final Four": "National Semifinals",
      "Championship": "National Championship"
    };
    return roundStatus[currentRound] || currentRound;
  };

  return (
    <main className="min-h-screen">
      <header className="site-header">
        <div className="container">
          <div className="flex justify-between items-center">
            <div className="site-logo-wrapper">
              <div className="basketball-icon">🏀</div>
              <h1>March Madness Fantasy 2025</h1>
            </div>
            <Link href="/admin/login" className="btn btn-secondary">
              Admin Login
            </Link>
          </div>
        </div>
      </header>
      <div className="nav-tabs">
        <div className="container">
          <div className="nav-tabs-container">
            <button
              className={activeTab === 'bracket' ? 'active' : ''}
              onClick={() => setActiveTab('bracket')}
            >
              Bracket
            </button>
            <button
              className={activeTab === 'picks' ? 'active' : ''}
              onClick={() => setActiveTab('picks')}
            >
              Make Picks
            </button>
            <button
              className={activeTab === 'leaderboard' ? 'active' : ''}
              onClick={() => setActiveTab('leaderboard')}
            >
              Leaderboard
            </button>
            <button
              className={activeTab === 'rules' ? 'active' : ''}
              onClick={() => setActiveTab('rules')}
            >
              Rules
            </button>
          </div>
        </div>
      </div>
      {/* Current tournament status */}
      {tournament && (
        <div className="container py-4">
          <div className="flex items-center justify-between bg-neutral-dark text-white p-3 rounded-lg">
            <div className="flex items-center">
              <span className="basketball-icon mr-3">🏀</span>
              <div>
                <div className="text-xs uppercase font-semibold opacity-75">Current Status</div>
                <div className="font-heading font-bold">{getCurrentRoundLabel()}</div>
              </div>
            </div>
            <div className="bg-secondary px-3 py-1 rounded-full text-sm font-bold">
              {tournament.currentRound !== "Pre-Tournament" ? "Tournament In Progress" : "Picks Open"}
            </div>
          </div>
        </div>
      )}
      <section className="container py-4">
        {activeTab === 'bracket' && (
          <div className="slide-in-up">
            <div className="section-heading">
              <h2>Tournament Bracket</h2>
            </div>
            <div className="card">
              <div className="card-accent-top"></div>
              <div className="card-body">
                {loading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <div className="loading-text">Loading bracket...</div>
                  </div>
                ) : games.length > 0 ? (
                  <Bracket
                    games={games}
                    teams={teams}
                    currentRound={currentRound}
                  />
                ) : (
                  <div className="text-center py-10 basketball-pattern">
                    <div className="mb-4">
                      <div className="basketball-icon mx-auto pulse" style={{ width: '48px', height: '48px', fontSize: '24px' }}>🏀</div>
                    </div>
                    <h3 className="text-lg font-bold mb-2">Bracket Coming Soon!</h3>
                    <p className="text-neutral-medium">The tournament bracket will be available once Selection Sunday is complete.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'picks' && (
          <div className="slide-in-up">
            <div className="section-heading">
              <h2>Make Your Picks</h2>
            </div>
            <PickSubmissionForm />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="slide-in-up">
            <div className="section-heading">
              <h2>Leaderboard</h2>
            </div>
            <Leaderboard />
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="slide-in-up">
            <div className="section-heading">
              <h2>Rules & Scoring</h2>
            </div>

            <div className="card">
              <div className="card-accent-top"></div>
              <div className="card-body">
                <div className="card-title">How It Works</div>
                <p className="mb-4">
                  You will pick a pre-tourney final four, finals, and champion teams before the start of the tournament.
                  This year will also include two (2) Pre-Tournament Cinderella picks as explained below.
                  You will then pick the Round of 64 games and each subsequent round as the tournament progresses.
                </p>

                <div className="card-title">Pre-Tournament Scoring</div>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                  <li>Pre-Tournament Final Four = <span className="font-bold text-primary">5 points each</span></li>
                  <li>Pre-Tournament Finals = <span className="font-bold text-primary">10 points each</span></li>
                  <li>Pre-Tournament Champion = <span className="font-bold text-primary">25 points</span></li>
                  <li>Pre-Tournament Cinderella picks (must be an 11th-16th seed): <span className="font-bold text-secondary">Double points</span> for each win</li>
                </ul>

                <div className="card-title">Round by Round Scoring</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left mb-4">
                    <thead className="bg-neutral-dark text-white">
                      <tr>
                        <th className="p-3 font-heading">Round</th>
                        <th className="p-3 font-heading text-center">Points Per Game</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Round of 64</td>
                        <td className="p-3 text-center font-bold">1</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Round of 32</td>
                        <td className="p-3 text-center font-bold">2</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Sweet 16</td>
                        <td className="p-3 text-center font-bold">4</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Elite 8</td>
                        <td className="p-3 text-center font-bold">8</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="p-3 font-medium">Final Four</td>
                        <td className="p-3 text-center font-bold">15</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Championship</td>
                        <td className="p-3 text-center font-bold">25</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="card-title">Entry Fee & Prizes</div>
                <div className="bg-neutral-dark text-white p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="text-secondary text-3xl font-bold mr-3">$25</div>
                    <div>
                      <div className="font-bold">Entry Fee</div>
                      <div className="text-sm opacity-75">Per participant</div>
                    </div>
                  </div>
                  <p className="text-sm">Payment must be received before tipoff on 3/21/25.</p>
                  <div className="mt-2 text-sm bg-secondary bg-opacity-20 p-2 rounded">
                    <span className="font-bold">Note:</span> Places paid and values will be determined by the number of entries.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      <div className="site-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="basketball-icon">🏀</div>
              <div className="footer-brand-name">March Madness Fantasy</div>
            </div>
            <div className="footer-links">
              <a href="#" className="footer-link">About</a>
              <a href="#" className="footer-link">Contact</a>
              <a href="#" className="footer-link">Rules</a>
              <a href="#" className="footer-link">Privacy Policy</a>
            </div>
          </div>
          <div className="footer-copyright">
            <p>Commissioner: Jon Steigele | Contact: (xxx) xxx-xxxx | Venmo: @jonsteigele</p>
            <p className="mt-2">© 2025 March Madness Fantasy League. All rights reserved.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
