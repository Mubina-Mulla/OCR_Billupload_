import React, { useState } from 'react';
import { deleteVisibleTickets, deletePlaceholderTickets } from '../utils/deleteSpecificTickets';

/**
 * Quick component to delete tickets
 * Add this temporarily to any page to delete tickets
 */
const QuickDeleteTickets = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDeleteByEmail = async () => {
    if (!window.confirm('Delete all tickets from pranav@gmail.com, azim@gmail.com, mubina@gmail.com, and vaishu@gmail.com?\n\nThis cannot be undone!')) {
      return;
    }

    setLoading(true);
    try {
      const deleteResult = await deleteVisibleTickets();
      setResult(deleteResult);
      alert(`✅ Deleted ${deleteResult.deletedCount} tickets successfully!`);
      // Reload page to see changes
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaceholders = async () => {
    setLoading(true);
    try {
      // First, let's see what we find
      const deleteResult = await deletePlaceholderTickets();
      setResult(deleteResult);
      
      if (deleteResult.deletedCount > 0) {
        alert(`✅ Deleted ${deleteResult.deletedCount} placeholder tickets successfully!`);
        // Reload page to see changes
        setTimeout(() => window.location.reload(), 1500);
      } else {
        alert(`ℹ️ No placeholder tickets found to delete.\n\nTotal tickets checked: ${deleteResult.totalChecked || 0}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      minWidth: '200px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '600' }}>Quick Delete</h3>
      
      <button
        onClick={handleDeleteByEmail}
        disabled={loading}
        style={{
          background: '#dc2626',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          width: '100%',
          marginBottom: '10px'
        }}
      >
        {loading ? 'Deleting...' : '🗑️ Delete by Email'}
      </button>

      <button
        onClick={handleDeletePlaceholders}
        disabled={loading}
        style={{
          background: '#f97316',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          width: '100%'
        }}
      >
        {loading ? 'Deleting...' : '🧹 Delete Placeholders'}
      </button>
      
      {result && (
        <div style={{ marginTop: '15px', fontSize: '12px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ margin: '5px 0', color: result.success ? '#059669' : '#dc2626', fontWeight: '600' }}>
            {result.message}
          </p>
          {result.deletedTickets && result.deletedTickets.length > 0 && (
            <div style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto' }}>
              <strong style={{ fontSize: '11px' }}>Deleted:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '11px' }}>
                {result.deletedTickets.slice(0, 10).map((ticket, idx) => (
                  <li key={idx}>
                    #{ticket.ticketNumber || 'N/A'} - {ticket.customerName || 'Placeholder'}
                  </li>
                ))}
                {result.deletedTickets.length > 10 && (
                  <li>... and {result.deletedTickets.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickDeleteTickets;
