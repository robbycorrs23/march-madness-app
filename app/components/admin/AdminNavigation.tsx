'use client';
import React from 'react';

interface AdminNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AdminNavigation: React.FC<AdminNavigationProps> = ({ activeTab, setActiveTab }) => {
  // Navigation items for the nav bar
  const navItems = [
    { id: 'overview', label: 'Dashboard Overview' },
    { id: 'tournament', label: 'Tournament Management' },
    { id: 'participants', label: 'Participants' },
    { id: 'games', label: 'Game Results' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <nav className="admin-nav">
      <div className="admin-nav-container">
        <ul className="admin-nav-list">
          {navItems.map(item => (
            <li key={item.id} className="admin-nav-item">
              <button
                className={`admin-nav-button ${activeTab === item.id ? 'admin-nav-active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default AdminNavigation;
