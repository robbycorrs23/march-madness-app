// app/page.tsx (modified structure)
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PickSubmissionForm from './components/PickSubmissionForm';
import Leaderboard from './components/Leaderboard';
import Bracket from './components/Bracket';
import { Tournament, Team, Game } from '../lib/types';
import { generateBracketGames } from '../lib/bracketUtils';
import { adaptGamesToBracket } from '../lib/bracketAdapter';

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
		  setLoading(true);
		  
		  // Fetch tournament info
		  const tournamentResponse = await fetch('/api/tournament');
		  if (tournamentResponse.ok) {
			const tournamentData = await tournamentResponse.json();
			setTournament(tournamentData);
			if (tournamentData) {
			  setCurrentRound(tournamentData.currentRound);
			  
			  // Now fetch teams and games
			  const teamsResponse = await fetch('/api/teams');
			  if (teamsResponse.ok) {
				const teamsData = await teamsResponse.json();
				setTeams(teamsData);
			  }
			  
			  const gamesResponse = await fetch('/api/games');
			  if (gamesResponse.ok) {
				const gamesData = await gamesResponse.json();
				setGames(gamesData);
			  }
			}
		  }
		} catch (error) {
		  console.error('Error fetching data:', error);
		} finally {
		  setLoading(false);
		}
	  };
	  
	  fetchData();
	}, []); // Empty dependency array to run once on mount

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
          <div className="header-content">
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
              User Picks
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
      
      {/* Site content wrapper - this is the key addition */}
      <div className="site-content">
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
					) : teams.length > 0 ? (
					  <div>
						<Bracket
						  games={adaptGamesToBracket(games.length > 0 ? games : generateBracketGames(teams))}
						  teams={teams}
						  currentRound={currentRound}
						/>
						
						{games.length === 0 && (
						  <div className="mt-4 p-3 border border-yellow-300 bg-yellow-50 rounded text-sm">
							<p className="font-semibold">Notice for administrators</p>
							<p>The bracket is showing with generated matchups based on team seedings, but actual game records have not been created in the database yet. 
							  Log in as an admin to initialize the tournament games.</p>
						  </div>
						)}
					  </div>
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
			<div className="tournament-rules-slide-in">
			  <div className="tournament-rules-heading">
				<h2 className="tournament-rules-heading__title">Rules & Scoring</h2>
				<div className="tournament-rules-heading__divider"></div>
			  </div>
	
			  <div className="tournament-rules-card">
				<div className="tournament-rules-card__accent"></div>
				<div className="tournament-rules-card__body">
				  <div className="tournament-rules-card__title">How It Works</div>
				  <p className="tournament-rules-description">
					You will pick a pre-tourney final four, finals, and champion teams before the start of the tournament.
					This year will also include two (2) Pre-Tournament Cinderella picks as explained below.
					You will then pick the Round of 64 games and each subsequent round as the tournament progresses.
				  </p>
	
				  <div className="tournament-rules-card__title">Pre-Tournament Scoring</div>
				  <ul className="tournament-rules-list">
					<li>Pre-Tournament Final Four = <span className="font-bold text-primary">5 points each</span></li>
					<li>Pre-Tournament Finals = <span className="font-bold text-primary">10 points each</span></li>
					<li>Pre-Tournament Champion = <span className="font-bold text-primary">25 points</span></li>
					<li>Pre-Tournament Cinderella picks (must be an 11th-16th seed): <span className="font-bold text-secondary">Double points</span> for each win</li>
				  </ul>
	
				  <div className="tournament-rules-card__title">Round by Round Scoring</div>
				  <div className="overflow-x-auto">
					<table className="tournament-rules-table">
					  <thead className="tournament-rules-table__header">
						<tr className="tournament-rules-table__header-row">
						  <th className="tournament-rules-table__header-cell">Round</th>
						  <th className="tournament-rules-table__header-cell tournament-rules-table__header-cell--center">Points Per Game</th>
						</tr>
					  </thead>
					  <tbody>
						<tr className="tournament-rules-table__body-row">
						  <td className="tournament-rules-table__cell">Round of 64</td>
						  <td className="tournament-rules-table__cell tournament-rules-table__cell--center">1</td>
						</tr>
						<tr className="tournament-rules-table__body-row">
						  <td className="tournament-rules-table__cell">Round of 32</td>
						  <td className="tournament-rules-table__cell tournament-rules-table__cell--center">2</td>
						</tr>
						<tr className="tournament-rules-table__body-row">
						  <td className="tournament-rules-table__cell">Sweet 16</td>
						  <td className="tournament-rules-table__cell tournament-rules-table__cell--center">4</td>
						</tr>
						<tr className="tournament-rules-table__body-row">
						  <td className="tournament-rules-table__cell">Elite 8</td>
						  <td className="tournament-rules-table__cell tournament-rules-table__cell--center">8</td>
						</tr>
						<tr className="tournament-rules-table__body-row">
						  <td className="tournament-rules-table__cell">Final Four</td>
						  <td className="tournament-rules-table__cell tournament-rules-table__cell--center">15</td>
						</tr>
						<tr className="tournament-rules-table__body-row">
						  <td className="tournament-rules-table__cell">Championship</td>
						  <td className="tournament-rules-table__cell tournament-rules-table__cell--center">25</td>
						</tr>
					  </tbody>
					</table>
				  </div>
	
				  <div className="tournament-rules-card__title">Entry Fee & Prizes</div>
				  <div className="tournament-rules-entry-fee">
					<div className="tournament-rules-entry-fee__amount">
					  <div className="tournament-rules-entry-fee__value">$25</div>
					  <div>
						<div className="tournament-rules-entry-fee__label">Entry Fee</div>
						<div className="tournament-rules-entry-fee__note">Per participant</div>
					  </div>
					</div>
					<p className="tournament-rules-entry-fee__note">Payment must be received before tipoff on 3/21/25.</p>
					<div className="tournament-rules-entry-fee__details">
					  <span className="tournament-rules-entry-fee__details-text">Note:</span> Places paid and values will be determined by the number of entries.
					</div>
				  </div>
				</div>
			  </div>
			</div>
		  )}
        </section>
      </div>
      
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
