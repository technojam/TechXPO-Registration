'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/firebase';

interface CustomQuestion {
  id: string;
  text: string;
  type: 'text' | 'select';
  options?: string[];
  required: boolean;
  scope?: 'team' | 'member';
}

export default function CreateEvent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    category: 'Event',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: '',
    mapUrl: '',
    maxRegistrations: '',
    registrationDeadline: '',
    paymentInstructions: '',
    isTeamEvent: false,
    minTeamSize: '1',
    maxTeamSize: '4',
  });
  const [image, setImage] = useState<File | null>(null);
  const [paymentQrImage, setPaymentQrImage] = useState<File | null>(null);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  
  // New Question State
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'text' | 'select'>('text');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionScope, setNewQuestionScope] = useState<'team' | 'member'>('member');

  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    if (newQuestionText.trim()) {
      const newQuestion: CustomQuestion = {
        id: uuidv4(),
        text: newQuestionText.trim(),
        type: newQuestionType,
        required: newQuestionRequired,
        scope: formData.isTeamEvent ? newQuestionScope : 'member',
        options: newQuestionType === 'select' 
          ? newQuestionOptions.split(',').map(opt => opt.trim()).filter(opt => opt) 
          : undefined
      };

      setCustomQuestions([...customQuestions, newQuestion]);
      
      // Reset form
      setNewQuestionText('');
      setNewQuestionType('text');
      setNewQuestionOptions('');
      setNewQuestionRequired(false);
      setNewQuestionScope('member');
    }
  };

  const removeQuestion = (id: string) => {
    setCustomQuestions(customQuestions.filter((q) => q.id !== id));
  };

  const addPresetQuestion = (text: string) => {
    const newQuestion: CustomQuestion = {
      id: uuidv4(),
      text,
      type: 'text',
      required: true,
    };
    setCustomQuestions([...customQuestions, newQuestion]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = '';
    let paymentQrUrl = '';

    if (image) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', image);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageUrl = data.url;
      }
    }

    if (paymentQrImage) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', paymentQrImage);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        paymentQrUrl = data.url;
      }
    }

    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to create an event');
      setLoading(false);
      return;
    }
    const token = await user.getIdToken();

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ...formData, imageUrl, paymentQrUrl, customQuestions }),
    });

    if (res.ok) {
      router.push('/admin');
    } else {
      alert('Failed to create event');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <Link href="/admin" className="inline-block mb-6 text-emerald-400 hover:text-emerald-300 transition-colors">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-6 text-emerald-400">Create New Event</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium text-emerald-100">Event Title</label>
          <input
            type="text"
            required
            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-emerald-100">Event Category</label>
          <select
            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="Event" className="bg-emerald-900">Event</option>
            <option value="Hackathon" className="bg-emerald-900">Hackathon</option>
            <option value="Workshop" className="bg-emerald-900">Workshop</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium text-emerald-100">Description</label>
          <textarea
            required
            className="w-full p-2 border border-emerald-700 rounded h-32 text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium text-emerald-100">Start Date</label>
            <input
              type="date"
              required
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-emerald-100">End Date</label>
            <input
              type="date"
              required
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium text-emerald-100">Start Time (Optional)</label>
            <input
              type="time"
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-emerald-100">End Time (Optional)</label>
            <input
              type="time"
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block mb-1 font-medium text-emerald-100">Location</label>
            <input
              type="text"
              required
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
        <div>
          <label className="block mb-1 font-medium text-emerald-100">Map Link (Optional)</label>
          <input
            type="url"
            placeholder="https://maps.google.com/..."
            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none placeholder-emerald-700"
            value={formData.mapUrl}
            onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium text-emerald-100">Max Registrations (Optional)</label>
            <input
              type="number"
              min="1"
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={formData.maxRegistrations || ''}
              onChange={(e) => setFormData({ ...formData, maxRegistrations: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-emerald-100">Registration Deadline (Optional)</label>
            <input
              type="datetime-local"
              className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
              value={formData.registrationDeadline || ''}
              onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-emerald-900/30 p-4 rounded border border-emerald-800">
          <label className="flex items-center cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={formData.isTeamEvent}
              onChange={(e) => setFormData({ ...formData, isTeamEvent: e.target.checked })}
              className="w-5 h-5 text-emerald-600 rounded border-emerald-700 focus:ring-emerald-500 bg-emerald-900/50 mr-3"
            />
            <span className="font-medium text-emerald-100">This is a Hackathon / Team Event</span>
          </label>
          
          {formData.isTeamEvent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
              <div>
                <label className="block mb-1 font-medium text-emerald-100">Min Team Size</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
                  value={formData.minTeamSize}
                  onChange={(e) => setFormData({ ...formData, minTeamSize: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-emerald-100">Max Team Size</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
                  value={formData.maxTeamSize}
                  onChange={(e) => setFormData({ ...formData, maxTeamSize: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block mb-1 font-medium text-emerald-100">Header Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-emerald-100">Payment QR Code</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPaymentQrImage(e.target.files?.[0] || null)}
            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-emerald-100">Payment Instructions / Text below QR</label>
          <textarea
            className="w-full p-2 border border-emerald-700 rounded h-24 text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
            value={formData.paymentInstructions}
            onChange={(e) => setFormData({ ...formData, paymentInstructions: e.target.value })}
            placeholder="e.g., Scan the QR code to pay. Please include your name in the payment remarks."
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-emerald-100 text-lg">Add Questions</label>
          
          <div className="mb-4 flex flex-wrap gap-2">
            {['Name', 'Email', 'Phone Number', 'College/University', 'Admission Number'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addPresetQuestion(preset)}
                className="bg-emerald-800/50 hover:bg-emerald-700 text-emerald-100 px-3 py-1 rounded text-sm border border-emerald-700 transition-colors"
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="bg-emerald-900/30 border border-emerald-800 p-4 rounded mb-4">
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm text-emerald-200 mb-1">Question Text</label>
                <input
                  type="text"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="e.g., T-Shirt Size"
                  className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none placeholder-emerald-700"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-emerald-200 mb-1">Type</label>
                  <select
                    value={newQuestionType}
                    onChange={(e) => setNewQuestionType(e.target.value as 'text' | 'select')}
                    className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="text">Text Input</option>
                    <option value="select">Multiple Choice</option>
                  </select>
                </div>

                {formData.isTeamEvent && (
                  <div>
                    <label className="block text-sm text-emerald-200 mb-1">Scope</label>
                    <select
                      value={newQuestionScope}
                      onChange={(e) => setNewQuestionScope(e.target.value as 'team' | 'member')}
                      className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="member">Ask for Each Member</option>
                      <option value="team">Ask Once for Team</option>
                    </select>
                  </div>
                )}
                
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer mt-6">
                    <input
                      type="checkbox"
                      checked={newQuestionRequired}
                      onChange={(e) => setNewQuestionRequired(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded border-emerald-700 focus:ring-emerald-500 bg-emerald-900/50"
                    />
                    <span className="ml-2 text-emerald-200">Required</span>
                  </label>
                </div>
              </div>

              {newQuestionType === 'select' && (
                <div>
                  <label className="block text-sm text-emerald-200 mb-1">Options (comma separated)</label>
                  <input
                    type="text"
                    value={newQuestionOptions}
                    onChange={(e) => setNewQuestionOptions(e.target.value)}
                    placeholder="e.g., Small, Medium, Large, XL"
                    className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none placeholder-emerald-700"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-600 transition-colors w-full"
            >
              Add Question
            </button>
          </div>

          <ul className="space-y-2">
            {customQuestions.map((q) => (
              <li key={q.id} className="flex justify-between items-start bg-emerald-900/30 border border-emerald-800 p-3 rounded text-emerald-50">
                <div>
                  <div className="font-medium">{q.text}</div>
                  <div className="text-sm text-emerald-400/70">
                    {q.type === 'select' ? 'Multiple Choice' : 'Text Input'} • {q.required ? 'Required' : 'Optional'}
                    {formData.isTeamEvent && (
                      <span> • {q.scope === 'team' ? 'Team Question' : 'Member Question'}</span>
                    )}
                  </div>
                  {q.type === 'select' && q.options && (
                    <div className="text-xs text-emerald-500/60 mt-1">
                      Options: {q.options.join(', ')}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="text-red-400 hover:text-red-300 ml-4"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-500 disabled:opacity-50 w-full font-bold transition-colors"
        >
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}
