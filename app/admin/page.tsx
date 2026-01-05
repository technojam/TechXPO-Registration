'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, Edit, Trash2, Eye, PauseCircle, PlayCircle, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  registrations: any[];
  maxRegistrations?: number;
  registrationDeadline?: string;
  isPaused?: boolean;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchEvents(user);
      } else {
        router.push('/admin/login');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchEvents = async (user = auth.currentUser) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePause = async (event: Event) => {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isPaused: !event.isPaused }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        setEvents(events.map((e) => (e.id === event.id ? updatedEvent : e)));
      } else {
        alert('Failed to update event status');
      }
    } catch (error) {
      console.error('Failed to update event status', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setEvents(events.filter((e) => e.id !== id));
      } else {
        alert('Failed to delete event');
      }
    } catch (error) {
      console.error('Failed to delete event', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  if (loading) return <div className="p-8 text-center text-emerald-100">Loading...</div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-emerald-300">Admin Dashboard</h1>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/create-event"
            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500 transition-colors whitespace-nowrap"
          >
            Create New Event
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600/80 text-white px-4 py-2 rounded hover:bg-red-500 transition-colors flex items-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-emerald-200 mb-2">{event.title}</h2>
              <div className="flex flex-wrap gap-4 text-emerald-400/80 text-sm">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{event.startDate} - {event.endDate}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{event.registrations.length} {event.maxRegistrations ? `/ ${event.maxRegistrations}` : ''} Registrations</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={() => togglePause(event)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                  event.isPaused 
                    ? 'bg-yellow-600/50 hover:bg-yellow-600 text-yellow-100' 
                    : 'bg-emerald-700/50 hover:bg-emerald-700 text-emerald-100'
                }`}
                title={event.isPaused ? "Resume Registrations" : "Pause Registrations"}
              >
                {event.isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                <span className="md:hidden">{event.isPaused ? "Resume" : "Pause"}</span>
              </button>
              <Link
                href={`/admin/events/${event.id}/registrations`}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-800/50 hover:bg-emerald-800 text-emerald-100 px-3 py-2 rounded transition-colors"
                title="View Registrations"
              >
                <Eye className="w-4 h-4" />
                <span className="md:hidden">View</span>
              </Link>
              <Link
                href={`/admin/events/${event.id}/edit`}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-900/50 hover:bg-blue-900 text-blue-100 px-3 py-2 rounded transition-colors"
                title="Edit Event"
              >
                <Edit className="w-4 h-4" />
                <span className="md:hidden">Edit</span>
              </Link>
              <button
                onClick={() => handleDelete(event.id)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900 text-red-100 px-3 py-2 rounded transition-colors"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" />
                <span className="md:hidden">Delete</span>
              </button>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="text-center text-emerald-500/50 py-12">
            <p>No events found. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
