// app/dashboard/page.tsx
'use client';
import AuthWrapper from '../components/AuthWrapper';
import LogoutButton from '../components/LogoutButton';
import { useSession } from 'next-auth/react';
import { getExtendedUser } from '../../lib/auth-types';

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = getExtendedUser(session);
  
  return (
    <AuthWrapper>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">
          Welcome, {user?.name || 'User'}
        </h1>
        <p>Email: {user?.email}</p>
        {user?.isAdmin && (
          <p className="text-green-600">Admin Access</p>
        )}
        <LogoutButton />
      </div>
    </AuthWrapper>
  );
}