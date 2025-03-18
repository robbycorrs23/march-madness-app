'use client';
import { useState } from 'react';
import ParticipantPicks from './admin/ParticipantPicks';
import BracketPicker from './admin/BracketPicker';

// Define TypeScript interfaces
interface Participant {
  id: string | number;
  name: string;
  email: string;
  paid: boolean;
  totalScore?: number;
}

interface NewParticipant {
  name: string;
  email: string;
  paid: boolean;
}

interface ParticipantListProps {
  participants: Participant[];
  onUpdate: (participant: Participant, action?: string) => void;
  tournamentId?: number; // Make it optional
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, onUpdate, tournamentId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newParticipant, setNewParticipant] = useState<NewParticipant>({ name: '', email: '', paid: false });
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPicksFor, setViewingPicksFor] = useState<number | null>(null);

  // Toggle payment status
  const togglePaymentStatus = async (participant: Participant) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/participants/${participant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paid: !participant.paid,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }
      const updatedParticipant = await response.json();
      setSuccess(`Payment status updated for ${updatedParticipant.name}`);
      if (onUpdate) {
        onUpdate(updatedParticipant);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Add new participant
  const addParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newParticipant),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add participant');
      }
      const addedParticipant = await response.json();
      setSuccess(`${addedParticipant.name} added successfully`);
      setNewParticipant({ name: '', email: '', paid: false });
      setShowAddForm(false);
      if (onUpdate) {
        onUpdate(addedParticipant, 'add');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setNewParticipant({
      ...newParticipant,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // View picks for a participant
  const handleViewPicks = (participantId: number | string) => {
    setViewingPicksFor(Number(participantId));
  };

  // Return to participant list
  const handleBackToList = () => {
    setViewingPicksFor(null);
  };

  // Filter participants based on search term
  const filteredParticipants = participants.filter(
    (participant) =>
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If viewing picks for a specific participant, show the picks component
  if (viewingPicksFor !== null) {
    if (tournamentId !== undefined) {
      return (
        <div className="participant-picks-wrapper">
          <button 
            className="participant-back-button"
            onClick={handleBackToList}
          >
            &larr; Back to Participants
          </button>
          <BracketPicker 
			  tournamentId={tournamentId} 
			  participantId={viewingPicksFor} 
			/>
        </div>
      );
    } else {
      return (
        <div className="participant-empty-state">
          <p className="participant-empty-text">
            Cannot view picks - no active tournament found.
          </p>
          <button 
            className="participant-back-button"
            onClick={handleBackToList}
          >
            &larr; Back to Participants
          </button>
        </div>
      );
    }
  }

  // Otherwise show the participant list
  return (
    <div className="participant-list-container">
      <div className="participant-list-header">
        <div className="participant-search-container">
          <input
            type="text"
            placeholder="Search participants..."
            className="participant-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="participant-search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" className="participant-search-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <button
          className="participant-add-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Participant'}
        </button>
      </div>
      
      {error && (
        <div className="participant-error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="participant-success-message">
          {success}
        </div>
      )}
      
      {showAddForm && (
        <div className="participant-form-container">
          <h3 className="participant-form-title">Add New Participant</h3>
          <form onSubmit={addParticipant} className="participant-form">
            <div className="participant-form-grid">
              <div className="participant-form-field">
                <label className="participant-form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  value={newParticipant.name}
                  onChange={handleInputChange}
                  className="participant-form-input"
                  required
                />
              </div>
              <div className="participant-form-field">
                <label className="participant-form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newParticipant.email}
                  onChange={handleInputChange}
                  className="participant-form-input"
                  required
                />
              </div>
            </div>
            <div className="participant-form-checkbox-container">
              <input
                type="checkbox"
                id="paid"
                name="paid"
                checked={newParticipant.paid}
                onChange={handleInputChange}
                className="participant-form-checkbox"
              />
              <label htmlFor="paid" className="participant-form-checkbox-label">
                Already Paid
              </label>
            </div>
            <div>
              <button
                type="submit"
                className="participant-submit-button"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Participant'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {filteredParticipants.length > 0 ? (
        <div className="participant-table-wrapper">
          <table className="participant-table">
            <thead className="participant-table-header">
              <tr>
                <th className="participant-table-heading">Name</th>
                <th className="participant-table-heading">Email</th>
                <th className="participant-table-heading">Score</th>
                <th className="participant-table-heading">Payment Status</th>
                <th className="participant-table-heading">Actions</th>
              </tr>
            </thead>
            <tbody className="participant-table-body">
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="participant-table-row">
                  <td className="participant-table-cell">
                    <div className="participant-name">{participant.name}</div>
                  </td>
                  <td className="participant-table-cell">
                    {participant.email}
                  </td>
                  <td className="participant-table-cell">
                    {participant.totalScore}
                  </td>
                  <td className="participant-table-cell">
                    <div className="participant-payment-status">
                      <label className="participant-toggle-container">
                        <input
                          type="checkbox"
                          className="participant-toggle-input"
                          checked={participant.paid}
                          onChange={() => togglePaymentStatus(participant)}
                          disabled={loading}
                        />
                        <div className="participant-toggle-slider"></div>
                        <span className="participant-toggle-label">
                          {participant.paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </label>
                    </div>
                  </td>
                  <td className="participant-table-cell">
                    <button
                      className="participant-view-button"
                      onClick={() => handleViewPicks(participant.id)}
                    >
                      View Picks
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="participant-empty-state">
          <p className="participant-empty-text">
            {searchTerm
              ? 'No participants match your search criteria'
              : 'No participants have joined the tournament yet'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ParticipantList;