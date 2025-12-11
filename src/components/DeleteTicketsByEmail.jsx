import React, { useState } from 'react';
import { deleteTicketsByEmails, previewTicketsDeletion } from '../utils/deleteTicketsByEmail';
import './DeleteTicketsByEmail.css';

const DeleteTicketsByEmail = ({ onClose }) => {
  const [emails, setEmails] = useState('mubina@gmail.com,azim@gmail.com,pranav@gmail.com');
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    setResult(null);
    
    const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
    const tickets = await previewTicketsDeletion(emailList);
    setPreview(tickets);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${preview.length} tickets? This action cannot be undone!`)) {
      return;
    }

    setLoading(true);
    const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
    const deleteResult = await deleteTicketsByEmails(emailList);
    setResult(deleteResult);
    setPreview([]);
    setLoading(false);
  };

  return (
    <div className="delete-tickets-modal">
      <div className="delete-tickets-content">
        <div className="modal-header">
          <h2>🗑️ Delete Tickets by Email</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Email Addresses (comma-separated)</label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="email1@gmail.com, email2@gmail.com"
              rows="3"
            />
          </div>

          <div className="action-buttons">
            <button 
              className="btn-preview" 
              onClick={handlePreview}
              disabled={loading || !emails.trim()}
            >
              👀 Preview Tickets
            </button>
            
            {preview.length > 0 && (
              <button 
                className="btn-delete" 
                onClick={handleDelete}
                disabled={loading}
              >
                🗑️ Delete {preview.length} Tickets
              </button>
            )}
          </div>

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Processing...</p>
            </div>
          )}

          {preview.length > 0 && !result && (
            <div className="preview-section">
              <h3>📋 Tickets to be deleted ({preview.length})</h3>
              <div className="tickets-list">
                {preview.map((ticket, idx) => (
                  <div key={idx} className="ticket-item">
                    <div className="ticket-info">
                      <strong>#{ticket.ticketNumber}</strong>
                      <span>{ticket.customerName}</span>
                    </div>
                    <div className="ticket-meta">
                      <span className="badge">{ticket.category}</span>
                      <span className="badge">{ticket.status}</span>
                      <small>Created by: {ticket.createdBy || ticket.adminEmail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className={`result-section ${result.success ? 'success' : 'error'}`}>
              <h3>{result.success ? '✅ Success!' : '❌ Error'}</h3>
              <p>{result.message || result.error}</p>
              {result.success && (
                <div className="result-details">
                  <p>Total tickets checked: {result.totalChecked}</p>
                  <p>Tickets deleted: {result.deletedCount}</p>
                  {result.errors.length > 0 && (
                    <p className="error-text">Errors: {result.errors.length}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTicketsByEmail;
