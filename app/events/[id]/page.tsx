'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, CheckCircle, X } from 'lucide-react';

interface CustomQuestion {
  id: string;
  text: string;
  type: 'text' | 'select';
  options?: string[];
  required: boolean;
  scope?: 'team' | 'member';
}

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location: string;
  mapUrl?: string;
  imageUrl?: string;
  paymentQrUrl?: string;
  paymentInstructions?: string;
  customQuestions?: CustomQuestion[];
  isPaused?: boolean;
  category?: 'Hackathon' | 'Event' | 'Workshop';
  isTeamEvent?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
}

export default function EventDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [firstMissingFieldId, setFirstMissingFieldId] = useState<string | null>(null);
  const [paymentProofImage, setPaymentProofImage] = useState<File | null>(null);
  
  // Individual Registration State
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Team Registration State
  const [teamName, setTeamName] = useState('');
  const [teamAnswers, setTeamAnswers] = useState<Record<string, string>>({});
  const [teamSize, setTeamSize] = useState(1);
  const [memberAnswers, setMemberAnswers] = useState<Record<string, string>[]>([]);
  const [currentStep, setCurrentStep] = useState(0); // Represents the index of the member being edited (0-based)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data);
          if (data.isTeamEvent) {
            const minSize = Number(data.minTeamSize) || 1;
            setTeamSize(minSize);
            setMemberAnswers(Array.from({ length: minSize }, () => ({})));
          }
        } else {
          // Handle error
        }
      } catch (error) {
        console.error('Failed to fetch event', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleTeamSizeChange = (size: number) => {
    setTeamSize(size);
    setMemberAnswers(prev => {
      const newAnswers = [...prev];
      if (size > prev.length) {
        // Add new members
        for (let i = prev.length; i < size; i++) {
          newAnswers.push({});
        }
      } else {
        // Remove members
        newAnswers.splice(size);
      }
      return newAnswers;
    });
    // Reset to first member tab if current tab is out of bounds
    if (currentStep >= size) {
      setCurrentStep(0);
    }
  };

  const handleMemberAnswerChange = (memberIndex: number, questionId: string, value: string) => {
    setMemberAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[memberIndex] = { ...newAnswers[memberIndex], [questionId]: value };
      return newAnswers;
    });
  };

  const nextStep = () => {
    // Basic validation could go here
    setCurrentStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);

    if (!event) return;

    // Validation
    const missingFields: string[] = [];
    let firstMissingId: string | null = null;

    if (event.isTeamEvent) {
       // Validate Team Answers
       event.customQuestions?.filter(q => q.scope === 'team' && q.required).forEach(q => {
           if (!teamAnswers[q.id] || !teamAnswers[q.id].trim()) {
               missingFields.push(`Team Question: ${q.text}`);
               if (!firstMissingId) firstMissingId = `team-question-${q.id}`;
           }
       });

       // Validate Member Answers
       for (let i = 0; i < teamSize; i++) {
           const memberAns = memberAnswers[i] || {};
           event.customQuestions?.filter(q => q.scope !== 'team' && q.required).forEach(q => {
               if (!memberAns[q.id] || !memberAns[q.id].trim()) {
                   missingFields.push(`Member ${i + 1}: ${q.text}`);
                   if (!firstMissingId) firstMissingId = `member-question-${i}-${q.id}`;
               }
           });
       }
    } else {
       // Validate Individual Answers
        event.customQuestions?.filter(q => q.required).forEach(q => {
           if (!answers[q.id] || !answers[q.id].trim()) {
               missingFields.push(q.text);
               if (!firstMissingId) firstMissingId = `question-${q.id}`;
           }
       });
    }

    if (!paymentProofImage) {
        missingFields.push('Payment Proof (Screenshot)');
        if (!firstMissingId) firstMissingId = event.isTeamEvent ? 'team-payment-proof-input' : 'payment-proof-input';
    }

    if (missingFields.length > 0) {
        setErrorMessage(missingFields.join(', '));
        setFirstMissingFieldId(firstMissingId);
        setShowErrorModal(true);
        setRegistering(false);
        return;
    }

    let paymentProofUrl = '';

    if (paymentProofImage) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', paymentProofImage);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        paymentProofUrl = data.url;
      }
    }

    let payload = {};

    if (event?.isTeamEvent) {
      // Team Registration Logic
      
      // Try to find team name in team answers if not set in state (since we removed the hardcoded field)
      let finalTeamName = teamName;
      if (!finalTeamName) {
         const teamNameQuestion = event.customQuestions?.find(q => q.text.toLowerCase().trim() === 'team name');
         if (teamNameQuestion && teamAnswers[teamNameQuestion.id]) {
             finalTeamName = teamAnswers[teamNameQuestion.id];
         }
      }

      const members = memberAnswers.map(ans => {
        let mName = '';
        let mEmail = '';
        // Extract name/email from answers if present
        event.customQuestions?.forEach(q => {
          const text = q.text.toLowerCase().trim();
          if (text === 'name') mName = ans[q.id];
          if (text === 'email') mEmail = ans[q.id];
        });
        return {
          name: mName,
          email: mEmail,
          answers: ans
        };
      });

      payload = {
        teamName: finalTeamName,
        members,
        paymentProofUrl,
        // Use leader's details for top-level fields
        name: members[0]?.name,
        email: members[0]?.email,
        answers: teamAnswers,
      };
    } else {
      // Individual Registration Logic
      let name = '';
      let email = '';
      let tName = '';

      // Map answers back to question text for storage and extract standard fields
      // Note: We are sending the raw answers object now, consistent with previous logic, 
      // but we extract name/email for the top-level fields.
      event?.customQuestions?.forEach(q => {
        const val = answers[q.id];
        if (val) {
          const text = q.text.toLowerCase().trim();
          if (text === 'name') name = val;
          if (text === 'email') email = val;
          if (text === 'team name') tName = val;
        }
      });

      payload = {
        name,
        email,
        teamName: tName,
        paymentProofUrl,
        answers
      };
    }

    const res = await fetch(`/api/events/${id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowSuccessModal(true);
    } else {
      const errorText = await res.text();
      try {
        const data = JSON.parse(errorText);
        alert(data.error || 'Registration failed');
      } catch (e) {
        console.error('Registration failed with non-JSON response:', errorText);
        alert('Registration failed. Please try again later.');
      }
    }
    setRegistering(false);
  };

  const isFormComplete = (() => {
    if (!event) return false;
    if (!paymentProofImage) return false;

    if (event.isTeamEvent) {
       // Validate Team Answers
       const teamQuestionsValid = event.customQuestions
         ?.filter(q => q.scope === 'team' && q.required)
         .every(q => teamAnswers[q.id] && teamAnswers[q.id].trim());
       
       if (teamQuestionsValid === false) return false;

       // Validate Member Answers
       for (let i = 0; i < teamSize; i++) {
           const memberAns = memberAnswers[i] || {};
           const memberValid = event.customQuestions
             ?.filter(q => q.scope !== 'team' && q.required)
             .every(q => memberAns[q.id] && memberAns[q.id].trim());
           
           if (memberValid === false) return false;
       }
       return true;
    } else {
       // Validate Individual Answers
        return event.customQuestions
           ?.filter(q => q.required)
           .every(q => answers[q.id] && answers[q.id].trim()) ?? true;
    }
  })();

  if (loading) return <div className="p-8 text-center text-emerald-100">Loading...</div>;
  if (!event) return <div className="p-8 text-center text-emerald-100">Event not found</div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Link href="/" className="inline-block mb-6 text-emerald-400 hover:text-emerald-300 transition-colors">
        &larr; Back to Events
      </Link>
      <div className="max-w-4xl mx-auto bg-emerald-900/30 backdrop-blur-sm border border-emerald-800 rounded-lg shadow-lg overflow-hidden text-emerald-50">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-48 md:h-64 object-cover"
          />
        )}
        <div className="p-4 md:p-8">
          {event.category && (
            <span className="inline-block px-3 py-1 mb-3 text-sm font-semibold text-emerald-900 bg-emerald-200 rounded-full">
              {event.category}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-emerald-300">{event.title}</h1>
          
          <div className="flex flex-wrap gap-6 mb-6 text-emerald-200/80">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-emerald-400" />
              <span>
                {event.startDate} {event.startTime && `at ${event.startTime}`} - {event.endDate} {event.endTime && `at ${event.endTime}`}
              </span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-emerald-400" />
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
          </div>

          <div className="prose max-w-none mb-8 text-emerald-100/90">
            <p className="whitespace-pre-wrap">{event.description}</p>
          </div>

          <div className="border-t border-emerald-800 pt-8">
            <h2 className="text-2xl font-bold mb-6 text-emerald-300">Register for Event</h2>
            
            {event.isPaused ? (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6 text-center">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Registrations Paused</h3>
                <p className="text-yellow-200/80">Registration for this event is currently paused. Please check back later.</p>
              </div>
            ) : (
              <>
            <form onSubmit={handleRegister} className="space-y-6 w-full">
              {event.isTeamEvent ? (
                <>
                  {/* Team Details Section */}
                  <div className="bg-emerald-900/30 p-4 rounded border border-emerald-800">
                    <h3 className="text-lg font-semibold mb-4 text-emerald-200">Team Details</h3>
                    
                    <div>
                      <label className="block mb-2 font-medium text-emerald-100">Number of Members</label>
                      {event.minTeamSize === event.maxTeamSize ? (
                           <div className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50">
                             {event.minTeamSize} Members
                           </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: (Number(event.maxTeamSize) || 4) - (Number(event.minTeamSize) || 1) + 1 }, (_, i) => (Number(event.minTeamSize) || 1) + i).map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleTeamSizeChange(num)}
                                className={`px-4 py-2 rounded border transition-colors flex-1 ${
                                  teamSize === num
                                    ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/50'
                                    : 'bg-emerald-900/30 border-emerald-700 text-emerald-300 hover:bg-emerald-800 hover:border-emerald-600'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Team Scoped Questions */}
                    {event.customQuestions?.filter(q => q.scope === 'team').map((question) => (
                      <div key={question.id} className="mt-4">
                        <label className="block mb-1 font-medium text-emerald-100">
                          {question.text}
                          {question.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {question.type === 'select' ? (
                          <select
                            id={`team-question-${question.id}`}
                            required={question.required}
                            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
                            value={teamAnswers[question.id] || ''}
                            onChange={(e) => setTeamAnswers({ ...teamAnswers, [question.id]: e.target.value })}
                          >
                            <option value="">Select an option</option>
                            {question.options?.map((opt) => (
                              <option key={opt} value={opt} className="bg-emerald-900 text-emerald-50">
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            id={`team-question-${question.id}`}
                            required={question.required}
                            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
                            value={teamAnswers[question.id] || ''}
                            onChange={(e) => setTeamAnswers({ ...teamAnswers, [question.id]: e.target.value })}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Member Details Tabs */}
                  <div className="bg-emerald-900/20 p-4 rounded border border-emerald-800/50">
                    <div className="flex overflow-x-auto mb-4 border-b border-emerald-800 pb-2 gap-2">
                      {Array.from({ length: teamSize }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCurrentStep(i)}
                          className={`px-4 py-2 rounded whitespace-nowrap transition-colors ${
                            currentStep === i
                              ? 'bg-emerald-600 text-white font-medium'
                              : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800'
                          }`}
                        >
                          {i === 0 ? 'Team Leader' : `Member ${i + 1}`}
                        </button>
                      ))}
                    </div>

                    <h4 className="font-semibold text-emerald-200 mb-3">
                      {currentStep === 0 ? 'Team Leader Details' : `Member ${currentStep + 1} Details`}
                    </h4>
                    
                    {event.customQuestions?.filter(q => q.scope !== 'team').map((question) => (
                      <div key={`${currentStep}-${question.id}`} className="mb-3">
                        <label className="block mb-1 text-sm font-medium text-emerald-100">
                          {question.text}
                          {question.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {question.type === 'select' ? (
                          <select
                            id={`member-question-${currentStep}-${question.id}`}
                            required={question.required}
                            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none text-sm"
                            value={memberAnswers[currentStep]?.[question.id] || ''}
                            onChange={(e) => handleMemberAnswerChange(currentStep, question.id, e.target.value)}
                          >
                            <option value="">Select an option</option>
                            {question.options?.map((opt) => (
                              <option key={opt} value={opt} className="bg-emerald-900 text-emerald-50">
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`member-question-${currentStep}-${question.id}`}
                            type="text"
                            required={question.required}
                            className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none text-sm"
                            value={memberAnswers[currentStep]?.[question.id] || ''}
                            onChange={(e) => handleMemberAnswerChange(currentStep, question.id, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Payment Section */}
                  <div>
                    {event.paymentQrUrl && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 text-emerald-200">Scan to Pay</h3>
                        <img
                          src={event.paymentQrUrl}
                          alt="Payment QR Code"
                          className="w-48 h-48 object-contain border border-emerald-700 rounded bg-white p-2 mb-2"
                        />
                        {event.paymentInstructions && (
                          <p className="text-emerald-200/90 text-sm whitespace-pre-wrap bg-emerald-900/30 p-3 rounded border border-emerald-800">
                            {event.paymentInstructions}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block mb-1 font-medium text-emerald-100">Payment Proof (Screenshot) <span className="text-red-400">*</span></label>
                      <input
                        type="file"
                        id="team-payment-proof-input"
                        accept="image/*"
                        required
                        onChange={(e) => setPaymentProofImage(e.target.files?.[0] || null)}
                        className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      />
                    </div>
                    
                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={registering || !isFormComplete}
                        className={`px-8 py-3 rounded font-bold transition-colors w-full ${
                          registering || !isFormComplete
                            ? 'bg-gray-500 text-gray-200 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {registering ? 'Registering...' : 'Complete Registration'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {event.customQuestions?.map((question) => (
                    <div key={question.id}>
                      <label className="block mb-1 font-medium text-emerald-100">
                        {question.text}
                        {question.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {question.type === 'select' ? (
                        <select
                          id={`question-${question.id}`}
                          required={question.required}
                          className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        >
                          <option value="">Select an option</option>
                          {question.options?.map((opt) => (
                            <option key={opt} value={opt} className="bg-emerald-900 text-emerald-50">
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`question-${question.id}`}
                          type="text"
                          required={question.required}
                          className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 focus:border-emerald-500 focus:outline-none"
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}

                  {event.paymentQrUrl && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 text-emerald-200">Scan to Pay</h3>
                      <img
                        src={event.paymentQrUrl}
                        alt="Payment QR Code"
                        className="w-48 h-48 object-contain border border-emerald-700 rounded bg-white p-2 mb-2"
                      />
                      {event.paymentInstructions && (
                        <p className="text-emerald-200/90 text-sm whitespace-pre-wrap bg-emerald-900/30 p-3 rounded border border-emerald-800">
                          {event.paymentInstructions}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block mb-1 font-medium text-emerald-100">Payment Proof (Screenshot) <span className="text-red-400">*</span></label>
                    <input
                      type="file"
                      id="payment-proof-input"
                      accept="image/*"
                      required
                      onChange={(e) => setPaymentProofImage(e.target.files?.[0] || null)}
                      className="w-full p-2 border border-emerald-700 rounded text-emerald-50 bg-emerald-900/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={registering || !isFormComplete}
                    className={`px-8 py-3 rounded font-bold transition-colors w-full ${
                          registering || !isFormComplete
                            ? 'bg-gray-500 text-gray-200 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                  >
                    {registering ? 'Registering...' : 'Register Now'}
                  </button>
                </>
              )}
            </form>
            </>
            )}
          </div>
        </div>
      </div>

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-red-900/90 border border-red-500 rounded-xl shadow-2xl max-w-md w-full p-6 text-center transform transition-all animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center mb-4">
              <div className="bg-red-500/20 p-3 rounded-full">
                <X className="w-12 h-12 text-red-400" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">Missing Information</h3>
            <p className="text-red-100/80 mb-4">
              Please complete the following fields before registering:
            </p>
            
            <div className="bg-red-950/50 p-4 rounded text-left mb-6 max-h-40 overflow-y-auto border border-red-800">
                <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
                    {errorMessage.split(', ').map((err, i) => (
                        <li key={i}>{err}</li>
                    ))}
                </ul>
            </div>
            
            <button
              onClick={() => {
                setShowErrorModal(false);
                if (firstMissingFieldId) {
                   // If the missing field is a specific member's question (e.g. member-question-2-abc), switch to that tab
                   if (firstMissingFieldId.startsWith('member-question-')) {
                       const parts = firstMissingFieldId.split('-');
                       const memberIndex = parseInt(parts[2]);
                       if (!isNaN(memberIndex)) {
                           setCurrentStep(memberIndex);
                           // Wait for render to switch tabs then focus
                           setTimeout(() => {
                               const el = document.getElementById(firstMissingFieldId);
                               el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                               el?.focus();
                           }, 100);
                           return;
                       }
                   }
                   
                   // Default behavior for team questions or individual questions
                   setTimeout(() => {
                        const el = document.getElementById(firstMissingFieldId);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el?.focus();
                   }, 100);
                }
              }}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              Close and Complete
            </button>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-emerald-900 border border-emerald-500 rounded-xl shadow-2xl max-w-md w-full p-6 text-center transform transition-all animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-500/20 p-3 rounded-full">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">Registration Successful!</h3>
            <p className="text-emerald-100/80 mb-6">
              You have successfully registered for <span className="text-emerald-300 font-semibold">{event.title}</span>.
              We'll see you there!
            </p>
            
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
