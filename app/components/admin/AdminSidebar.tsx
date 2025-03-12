'use client';
import React from 'react';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, setActiveTab }) => {
  // Navigation items for the sidebar
  const navItems = [
    { id: 'overview', label: 'Dashboard Overview' },
    { id: 'tournament', label: 'Tournament Management' },
    { id: 'participants', label: 'Participants' },
    { id: 'games', label: 'Game Results' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <aside className="admin-sidebar">
      <nav>
        <ul className="admin-nav-list">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                className={`admin-nav-item ${activeTab === item.id ? 'admin-nav-active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
