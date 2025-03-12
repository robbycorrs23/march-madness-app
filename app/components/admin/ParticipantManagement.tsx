'use client';
import React, { useState } from 'react';
import ParticipantList from '../ParticipantList';
import { Participant } from '../../admin/page';

interface ParticipantManagementProps {
  participants: Participant[];
  onParticipantUpdate: (participant: Participant, action?: string) => void;
}

const ParticipantManagement: React.FC<ParticipantManagementProps> = ({ 
  participants, 
  onParticipantUpdate 
}) => {
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const sendPaymentReminders = async () => {
    setIsSendingReminders(true);
    try {
      const unpaidParticipants = participants.filter(p => !p.paid);
      if (unpaidParticipants.length === 0) {
        // Show a message that there are no unpaid participants
        return;
      }
      
      const response = await fetch('/api/participants/payment-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: unpaidParticipants.map(p => p.id)
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send payment reminders');
      }
      
      // Success message could be shown here
    } catch (error) {
      console.error('Error sending payment reminders:', error);
      // Error message could be shown here
    } finally {
      setIsSendingReminders(false);
    }
  };

  const exportParticipants = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/participants/export', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export participants');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'participants.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting participants:', error);
      // Error message could be shown here
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <h2 className="admin-section-title">Participants Management</h2>
      
      <div className="admin-card">
        <div className="admin-card-header">All Participants</div>
        <div className="admin-card-body">
          <ParticipantList 
            participants={participants}
            onUpdate={onParticipantUpdate}
          />
        </div>
      </div>
      
      <div className="admin-grid-cols-2 admin-mb-6" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card">
          <div className="admin-card-header">Payment Statistics</div>
          <div className="admin-card-body">
            <div className="admin-mb-4">
              <h4 className="admin-mb-2 admin-font-bold">Payment Status</h4>
              <ul>
                <li>Paid: {participants.filter(p => p.paid).length}</li>
                <li>Unpaid: {participants.filter(p => !p.paid).length}</li>
                <li>Total: {participants.length}</li>
              </ul>
            </div>
            
            <button 
              className="admin-btn admin-btn-blue"
              onClick={sendPaymentReminders}
              disabled={isSendingReminders || participants.filter(p => !p.paid).length === 0}
            >
              {isSendingReminders ? 'Sending...' : 'Send Payment Reminders'}
            </button>
          </div>
        </div>
        
        <div className="admin-card">
          <div className="admin-card-header">Participant Actions</div>
          <div className="admin-card-body">
            <button 
              className="admin-btn admin-btn-green admin-mb-2"
              onClick={exportParticipants}
              disabled={isExporting || participants.length === 0}
            >
              {isExporting ? 'Exporting...' : 'Export Participant List'}
            </button>
            
            <p className="admin-text-gray">
              Download a CSV file with all participant information and current standings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantManagement;
