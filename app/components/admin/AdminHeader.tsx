'use client';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

const AdminHeader: React.FC = () => {
  return (
    <header className="admin-header">
      <div className="admin-header-content">
        <h1 className="admin-title">Admin Dashboard - March Madness Fantasy 2025</h1>
        <div className="admin-header-actions">
          <Link href="/" className="admin-view-site-btn">
            View Site
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="admin-logout-btn"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
