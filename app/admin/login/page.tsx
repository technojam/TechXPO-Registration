'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin');
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 p-4">
      <div className="w-full max-w-md bg-emerald-900/30 backdrop-blur-sm border border-emerald-800 rounded-lg p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-emerald-300 text-center">Admin Login</h1>
        
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-emerald-100">Email</label>
            <input
              type="email"
              required
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-emerald-100">Password</label>
            <input
              type="password"
              required
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-500 disabled:opacity-50 font-bold transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
