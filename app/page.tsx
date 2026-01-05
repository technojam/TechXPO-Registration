import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { getEvents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const events = await getEvents();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-8 md:mb-12">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="TechXpo 2026" className="h-24 md:h-32" />
        </div>
        <p className="text-lg md:text-xl text-emerald-200/70">Join us for the biggest tech fest of the year!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((event) => (
          <div key={event.id} className="border border-emerald-800 rounded-lg overflow-hidden shadow-lg hover:shadow-emerald-900/50 transition-all bg-emerald-900/30 text-emerald-50 backdrop-blur-sm">
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              {event.category && (
                <span className="inline-block px-2 py-1 mb-2 text-xs font-semibold text-emerald-900 bg-emerald-200 rounded-full">
                  {event.category}
                </span>
              )}
              <h2 className="text-2xl font-bold mb-2 text-emerald-300">{event.title}</h2>
              <p className="text-emerald-100/80 mb-4 line-clamp-3">{event.description}</p>
              <div className="flex items-center text-emerald-400 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  {event.startDate} {event.startTime && `at ${event.startTime}`} - {event.endDate} {event.endTime && `at ${event.endTime}`}
                </span>
              </div>
              <div className="flex items-center text-emerald-400 mb-4">
                <MapPin className="w-4 h-4 mr-2" />
                {event.mapUrl ? (
                  <a 
                    href={event.mapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:underline hover:text-emerald-300 transition-colors"
                  >
                    {event.location}
                  </a>
                ) : (
                  <span>{event.location}</span>
                )}
              </div>
              <Link
                href={`/events/${event.id}`}
                className="block w-full text-center bg-emerald-600 text-white py-2 rounded hover:bg-emerald-500 transition-colors font-medium"
              >
                View Details & Register
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {events.length === 0 && (
        <div className="text-center text-emerald-500/50 mt-12">
          <p>No events found. Check back later!</p>
        </div>
      )}
    </div>
  );
}
