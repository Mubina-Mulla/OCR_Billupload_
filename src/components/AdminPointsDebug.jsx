// src/components/AdminPointsDebug.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function AdminPointsDebug({ adminEmail }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [adminEmail]);

  const loadTickets = async () => {
    try {
      const usersRef = collection(db, "mainData", "Billuload", "users");
      const usersSnapshot = await getDocs(usersRef);
      const allTickets = [];
      
      for (const userDoc of usersSnapshot.docs) {
        if (userDoc.data().email === adminEmail) {
          const userTicketsRef = collection(db, 'mainData', 'Billuload', 'users', userDoc.id, 'tickets');
          const ticketsSnapshot = await getDocs(userTicketsRef);
          
          ticketsSnapshot.docs.forEach(ticketDoc => {
            allTickets.push({
              id: ticketDoc.id,
              ...ticketDoc.data()
            });
          });
        }
      }
      
      setTickets(allTickets);
      setLoading(false);
    } catch (error) {
      console.error("Error loading tickets:", error);
      setLoading(false);
    }
  };

  const calculateTicketPoints = (assignedAt, resolvedAt, endDate) => {
    if (!assignedAt || !resolvedAt || !endDate) {
      return { points: 0, reason: 'Missing dates' };
    }

    try {
      const assign = new Date(assignedAt);
      const resolved = new Date(resolvedAt);
      const end = new Date(endDate);

      if (resolved > end) {
        return { points: 0, reason: 'Resolved after end date' };
      }

      const diffMs = resolved - assign;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours <= 24) {
        return { points: 100, reason: `Resolved in ${diffHours.toFixed(1)} hours` };
      }

      const extraHours = diffHours - 24;
      const extraDays = Math.ceil(extraHours / 24);
      let points = 100 - (extraDays * 10);
      if (points < 0) points = 0;

      return { 
        points, 
        reason: `Resolved in ${diffHours.toFixed(1)} hours (${extraDays} days late)` 
      };
    } catch (error) {
      return { points: 0, reason: 'Error calculating' };
    }
  };

  if (loading) return <div>Loading tickets...</div>;

  const resolvedTickets = tickets.filter(t => 
    t.status === 'Resolved' || t.status === 'Completed' || t.status === 'resolved'
  );

  let totalPoints = 0;
  const ticketDetails = resolvedTickets.map(ticket => {
    const assignedAt = ticket.assignedAt || ticket.createdAt;
    const resolvedAt = ticket.resolvedAt || ticket.resolvedDate;
    const endDate = ticket.endDate || ticket.expectedEndDate;
    
    const result = calculateTicketPoints(assignedAt, resolvedAt, endDate);
    totalPoints += result.points;
    
    return {
      id: ticket.id,
      assignedAt,
      resolvedAt,
      endDate,
      ...result
    };
  });

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', margin: '20px 0' }}>
      <h3>🎯 Points Debug for {adminEmail}</h3>
      <p><strong>Total Points:</strong> {totalPoints}</p>
      <p><strong>Resolved Tickets:</strong> {resolvedTickets.length} / {tickets.length}</p>
      
      <div style={{ marginTop: '20px' }}>
        <h4>Ticket Breakdown:</h4>
        {ticketDetails.length === 0 ? (
          <p>No resolved tickets found</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr style={{ background: '#e0e0e0' }}>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Ticket ID</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Assigned</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Resolved</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>End Date</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Points</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {ticketDetails.map((ticket, index) => (
                <tr key={index}>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{ticket.id.substring(0, 8)}...</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                    {ticket.assignedAt ? new Date(ticket.assignedAt).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                    {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                    {ticket.endDate ? new Date(ticket.endDate).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ 
                    padding: '8px', 
                    border: '1px solid #ccc',
                    fontWeight: 'bold',
                    color: ticket.points === 100 ? 'green' : ticket.points >= 50 ? 'orange' : 'red'
                  }}>
                    {ticket.points}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ccc', fontSize: '12px' }}>
                    {ticket.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
