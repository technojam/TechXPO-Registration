'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ArrowLeft, Trash2, Mail } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';

interface Registration {
  id: string;
  name: string;
  email: string;
  teamName?: string;
  paymentProofUrl?: string;
  answers?: Record<string, string>;
  members?: {
    name?: string;
    email?: string;
    answers: Record<string, string>;
  }[];
}

interface Event {
  id: string;
  title: string;
  isTeamEvent?: boolean;
  isFree?: boolean;
  customQuestions?: { id: string; text: string; scope?: 'team' | 'member' }[];
  registrations: Registration[];
}

export default function EventRegistrations({ params }: { params: Promise<{ id: string }> }) {
  // Force rebuild for updated logic
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchEvent(user);
      } else {
        router.push('/admin/login');
      }
    });
    return () => unsubscribe();
  }, [id, router]);

  const fetchEvent = async (user = auth.currentUser) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/events/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
      } else {
        alert('Event not found or unauthorized');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Failed to fetch event', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (registrationId: string) => {
    if (!auth.currentUser) return;
    setSendingEmail(registrationId);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/events/${id}/registrations/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ registrationId })
      });

      if (res.ok) {
        alert('Email queued for sending successfully');
      } else {
        const err = await res.json();
        alert(`Failed to send email: ${err.error}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email');
    } finally {
      setSendingEmail(null);
    }
  };

  const downloadCSV = () => {
    if (!event) return;

    const headers = ['S.No'];
    if (!event.isFree) {
        headers.push('Payment Proof URL');
    }

    if (event.isTeamEvent) {
      headers.push('Member Type'); // Leader or Member
    }
    event.customQuestions?.forEach(q => headers.push(q.text));

    const rows: string[] = [];

    event.registrations.forEach((reg, regIndex) => {
      // Helper to generate row string
      const generateRow = (memberType: string, answers: Record<string, string>) => {
        const row = [(regIndex + 1).toString()];
        if (!event.isFree) {
            row.push(reg.paymentProofUrl || '');
        }

        if (event.isTeamEvent) {
          row.push(memberType);
        }

        event.customQuestions?.forEach(q => {
          // If team event, check scope
          // If scope is team -> use reg.answers (Team Leader/Team Scope)
          // If scope is member -> use answers (which is passed in for current member)
          let val = '';
          if (event.isTeamEvent) {
             if (q.scope === 'team') {
               val = reg.answers?.[q.id] || '';
             } else {
               val = answers?.[q.id] || '';
             }
          } else {
             val = answers?.[q.id] || '';
          }
          row.push(val);
        });

        return row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',');
      };

      if (event.isTeamEvent && reg.members && reg.members.length > 0) {
        reg.members.forEach((member, index) => {
           rows.push(generateRow(index === 0 ? 'Team Leader' : `Member ${index + 1}`, member.answers));
        });
      } else {
        // Fallback for individual or legacy data
        rows.push(generateRow('Individual', reg.answers || {}));
      }
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_')}_registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (regId: string) => {
    if (!confirm('Are you sure you want to delete this registration? This will also delete their payment proof permanently.')) {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to delete registrations.');
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/events/${id}/registrations/${regId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setEvent(prev => prev ? {
          ...prev,
          registrations: prev.registrations.filter(r => r.id !== regId)
        } : null);
        alert('Registration deleted successfully');
      } else {
        alert('Failed to delete registration');
      }
    } catch (error) {
      console.error('Error deleting registration:', error);
      alert('An error occurred while deleting');
    }
  };

  if (loading) return <div className="p-8 text-center text-emerald-100">Loading...</div>;
  if (!event) return <div className="p-8 text-center text-emerald-100">Event not found</div>;

  // Flatten logic for rendering
  const flattenedRows: {
    reg: Registration;
    answers: Record<string, string>;
    memberType?: string;
    isFirstRow: boolean;
    key: string;
    serialNumber: number;
  }[] = [];

  event.registrations.forEach((reg, index) => {
    if (event.isTeamEvent && reg.members && reg.members.length > 0) {
      reg.members.forEach((member, idx) => {
        flattenedRows.push({
          reg,
          answers: member.answers,
          memberType: idx === 0 ? 'Team Leader' : `Member ${idx + 1}`,
          isFirstRow: idx === 0,
          key: `${reg.id}-${idx}`,
          serialNumber: index + 1
        });
      });
    } else {
      flattenedRows.push({
        reg,
        answers: reg.answers || {},
        isFirstRow: true,
        key: reg.id,
        serialNumber: index + 1
      });
    }
  });

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href="/admin" className="flex items-center text-emerald-400 hover:text-emerald-300 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-emerald-300">Registrations: {event.title}</h1>
          <p className="text-emerald-200/70 mt-1">Total Registrations: {event.registrations.length}</p>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-500 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg overflow-hidden shadow-lg overflow-x-auto">
        <table className="w-full text-left text-emerald-100">
          <thead className="bg-emerald-900/50 text-emerald-300 uppercase text-sm font-semibold">
            <tr>
              <th className="p-4 border-b border-emerald-800 w-16">S.No</th>
              {!event.isFree && <th className="p-4 border-b border-emerald-800">Payment Proof</th>}
              {event.isTeamEvent && <th className="p-4 border-b border-emerald-800">Member Type</th>}
              {event.customQuestions?.map(q => (
                <th key={q.id} className="p-4 border-b border-emerald-800 min-w-[200px]">{q.text}</th>
              ))}
              <th className="p-4 border-b border-emerald-800 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-800/50">
            {flattenedRows.map((row) => (
              <tr key={row.key} className="hover:bg-emerald-900/20 transition-colors">
                <td className="p-4 text-emerald-400 font-mono text-sm">
                  {row.isFirstRow ? row.serialNumber : ''}
                </td>
                {!event.isFree && (
                <td className="p-4">
                  {row.isFirstRow ? (
                    row.reg.paymentProofUrl ? (
                      <a 
                        href={row.reg.paymentProofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline"
                      >
                        View Image
                      </a>
                    ) : (
                      <span className="text-emerald-500/50">No Proof</span>
                    )
                  ) : (
                    <span className="text-emerald-500/30 text-sm">See above</span>
                  )}
                </td>
                )}
                {event.isTeamEvent && <td className="p-4 text-emerald-300">{row.memberType}</td>}
                {event.customQuestions?.map(q => {
                   let val = '';
                   if (event.isTeamEvent && q.scope === 'team') {
                      val = row.reg.answers?.[q.id] || '';
                   } else {
                      val = row.answers[q.id] || '';
                   }
                   return (
                     <td key={q.id} className="p-4">
                       {val || '-'}
                     </td>
                   );
                })}
                <td className="p-4 text-right">
                  {row.isFirstRow && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDelete(row.reg.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                        title="Delete Registration"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleResendEmail(row.reg.id)}
                        disabled={sendingEmail === row.reg.id}
                        className={`p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors ${sendingEmail === row.reg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Resend Confirmation Email"
                      >
                        <Mail className={`w-5 h-5 ${sendingEmail === row.reg.id ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {flattenedRows.length === 0 && (
              <tr>
                <td colSpan={1 + (event.isFree ? 0 : 1) + (event.isTeamEvent ? 1 : 0) + (event.customQuestions?.length || 0) + 1} className="p-8 text-center text-emerald-500/50">
                  No registrations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
