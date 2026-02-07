'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          setAuthorized(true);
          if (pathname === '/admin/login') {
            router.push('/admin');
          }
        } else {
          setAuthorized(false);
          if (pathname !== '/admin/login') {
            router.push('/admin/login');
          }
        }
      } catch (error) {
        setAuthorized(false);
        if (pathname !== '/admin/login') {
           router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-emerald-950 text-emerald-100">Loading...</div>;
  }

  // If not authorized and not on login page, don't render children (redirect happens in useEffect)
  if (!authorized && pathname !== '/admin/login') {
    return null;
  }

  return <>{children}</>;
}
