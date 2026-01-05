'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthorized(true);
        // If on login page, redirect to admin dashboard
        if (pathname === '/admin/login') {
          router.push('/admin');
        }
      } else {
        setAuthorized(false);
        // If not on login page, redirect to login
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
