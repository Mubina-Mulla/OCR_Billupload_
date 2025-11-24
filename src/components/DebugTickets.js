// Temporary Debug Component - Add this to your Dashboard to check ticket loading
import React, { useState } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

const DebugTickets = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkTickets = async () => {
    setLoading(true);
    const info = {
      localStorage: {},
      users: [],
      tickets: []
    };

    try {
      // Check localStorage
      const currentAdmin = localStorage.getItem('currentAdmin');
      const superAdmin = localStorage.getItem('superAdmin');
      
      info.localStorage = {
        currentAdmin: currentAdmin ? JSON.parse(currentAdmin) : null,
        superAdmin: superAdmin ? JSON.parse(superAdmin) : null
      };

      // Check all users
      const usersRef = collection(db, 'mainData', 'Billuload', 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userInfo = {
          id: userDoc.id,
          email: userData.email,
          name: userData.name || userData.adminName,
          ticketCount: 0,
          tickets: []
        };

        // Check tickets for this user
        const ticketsRef = collection(db, 'mainData', 'Billuload', 'users', userDoc.id, 'tickets');
        const ticketsSnapshot = await getDocs(ticketsRef);
        
        userInfo.ticketCount = ticketsSnapshot.docs.length;
        userInfo.tickets = ticketsSnapshot.docs.map(doc => ({
          id: doc.id,
          ticketNumber: doc.data().ticketNumber,
          customerName: doc.data().customerName,
          status: doc.data().status,
          createdBy: doc.data().createdBy,
          createdAt: doc.data().createdAt
        }));

        info.users.push(userInfo);
        info.tickets.push(...userInfo.tickets);
      }

      setDebugInfo(info);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      borderRadius: '8px',
      margin: '20px',
      fontFamily: 'monospace'
    }}>
      <h2>🔍 Ticket Debug Tool</h2>
      <button 
        onClick={checkTickets}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {loading ? 'Checking...' : 'Check Tickets'}
      </button>

      {debugInfo && (
        <div style={{ marginTop: '20px' }}>
          <h3>📦 LocalStorage:</h3>
          <pre style={{ 
            backgroundColor: 'white', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {JSON.stringify(debugInfo.localStorage, null, 2)}
          </pre>

          <h3>👥 Users ({debugInfo.users?.length || 0}):</h3>
          {debugInfo.users?.map((user, index) => (
            <div key={index} style={{ 
              backgroundColor: 'white', 
              padding: '10px', 
              marginBottom: '10px',
              borderRadius: '4px',
              border: user.email === debugInfo.localStorage.currentAdmin?.email ? '2px solid green' : '1px solid #ddd'
            }}>
              <strong>{user.email}</strong> (ID: {user.id})
              <br />
              Name: {user.name || 'No name'}
              <br />
              Tickets: {user.ticketCount}
              {user.tickets.length > 0 && (
                <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                  {user.tickets.map((ticket, i) => (
                    <li key={i}>
                      #{ticket.ticketNumber} - {ticket.customerName} - {ticket.status}
                      <br />
                      <small>Created by: {ticket.createdBy || 'Unknown'}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <h3>🎫 Total Tickets: {debugInfo.tickets?.length || 0}</h3>
        </div>
      )}
    </div>
  );
};

export default DebugTickets;
