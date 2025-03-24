'use client';
import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log('Attempting to sign in...');
      const result = await signIn('credentials', {
        password,
        redirect: false,
        callbackUrl: '/admin'
      });
      
      console.log('Sign in result:', result);

      if (result?.error) {
        console.error('Sign in error:', result.error);
        setError('Invalid password. Please try again.');
      } else if (result?.ok) {
        console.log('Sign in successful, redirecting...');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 basketball-pattern">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="site-logo-wrapper">
              <div className="basketball-icon">🏀</div>
              <h1 className="text-2xl font-bold">March Madness Fantasy</h1>
            </div>
          </Link>
        </div>
        <div className="card">
          <div className="card-accent-top"></div>
          <div className="card-header">
            <h2 className="text-xl font-bold">Admin Login</h2>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-control"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <>
                    <span className="spinner mr-2" style={{ width: '20px', height: '20px' }}></span>
                    Logging in...
                  </>
                ) : 'Sign In to Dashboard'}
              </button>
            </form>
          </div>
          <div className="card-action text-center">
            <Link href="/" className="text-primary hover:text-primary-dark">
              ← Return to March Madness Fantasy
            </Link>
          </div>
        </div>
        <div className="text-center mt-4 text-sm text-neutral-medium">
          © 2025 March Madness Fantasy. All rights reserved.
        </div>
      </div>
    </div>
  );
}