// components/AuthWrapper.tsx
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { getExtendedUser } from '../../lib/auth-types';

interface AuthWrapperProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export default function AuthWrapper({ 
  children, 
  adminOnly = false 
}: AuthWrapperProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    // If not authenticated, redirect to login
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    
    const user = getExtendedUser(session);
    
    // If admin-only page and user is not an admin
    if (adminOnly && !user?.isAdmin) {
      router.replace('/dashboard');
      return;
    }
  }, [status, session, router, adminOnly]);
  
  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Render children if authenticated (and admin if required)
  return <>{children}</>;
}