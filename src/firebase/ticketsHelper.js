/**
 * Optimized Tickets Helper
 * Uses Firestore collectionGroup queries for fast ticket fetching
 * Supports real-time updates and pagination
 */

import { 
  collectionGroup, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './config';

/**
 * Fetch tickets optimized with collectionGroup
 * @param {Object} options - Query options
 * @param {string} options.adminId - Filter by admin ID (optional)
 * @param {string} options.category - Filter by category (optional)
 * @param {string} options.status - Filter by status (optional)
 * @param {number} options.pageSize - Number of tickets to fetch (default: 50)
 * @returns {Promise<Array>} Array of tickets
 */
export const fetchTicketsOptimized = async (options = {}) => {
  const {
    adminId,
    category,
    status,
    pageSize = 50
  } = options;

  try {
    console.log('🚀 Fetching tickets with optimized collectionGroup query...');
    
    // Use collectionGroup to query all 'tickets' subcollections at once
    let ticketsQuery = collectionGroup(db, 'tickets');
    
    // Build query with filters
    const constraints = [];
    
    if (adminId) {
      constraints.push(where('userId', '==', adminId));
    }
    
    if (category) {
      constraints.push(where('category', '==', category));
    }
    
    if (status) {
      constraints.push(where('status', '==', status));
  }

  // Order by creation date (oldest first) and limit results
  constraints.push(orderBy('createdAt', 'asc'));
  constraints.push(limit(pageSize));    // Build final query
    ticketsQuery = query(ticketsQuery, ...constraints);
    
    // Execute query
    const snapshot = await getDocs(ticketsQuery);
    
    const tickets = [];
    snapshot.forEach(doc => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Fetched ${tickets.length} tickets in one query`);
    return tickets;
    
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    
    // If collectionGroup query fails (e.g., missing index), provide helpful message
    if (error.code === 'failed-precondition') {
      console.error('⚠️ Firestore index required. Click the link in the error to create it.');
    }
    
    throw error;
  }
};

/**
 * Subscribe to real-time ticket updates
 * @param {Object} options - Query options (same as fetchTicketsOptimized)
 * @param {Function} onUpdate - Callback function called with updated tickets
 * @returns {Function} Unsubscribe function
 */
export const subscribeTickets = (options = {}, onUpdate) => {
  const {
    adminId,
    category,
    status,
    pageSize = 50
  } = options;

  try {
    console.log('🔄 Setting up real-time ticket subscription...');
    
    // Use collectionGroup for real-time updates
    let ticketsQuery = collectionGroup(db, 'tickets');
    
    // Build query with filters
    const constraints = [];
    
    if (adminId) {
      constraints.push(where('userId', '==', adminId));
    }
    
    if (category) {
      constraints.push(where('category', '==', category));
    }
    
    if (status) {
      constraints.push(where('status', '==', status));
    }

    // Order by creation date (oldest first) and limit
    constraints.push(orderBy('createdAt', 'asc'));
    constraints.push(limit(pageSize));    // Build final query
    ticketsQuery = query(ticketsQuery, ...constraints);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      ticketsQuery,
      (snapshot) => {
        const tickets = [];
        snapshot.forEach(doc => {
          tickets.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log(`🔄 Real-time update: ${tickets.length} tickets`);
        onUpdate(tickets);
      },
      (error) => {
        console.error('❌ Error in ticket subscription:', error);
        
        if (error.code === 'failed-precondition') {
          console.error('⚠️ Firestore index required. Click the link in the error to create it.');
        }
      }
    );
    
    return unsubscribe;
    
  } catch (error) {
    console.error('❌ Error setting up ticket subscription:', error);
    throw error;
  }
};

/**
 * Fetch all tickets (for admin/superadmin views)
 * Uses pagination to avoid loading too many at once
 * @param {number} pageSize - Number of tickets per page
 * @returns {Promise<Array>} Array of all tickets
 */
export const fetchAllTickets = async (pageSize = 100) => {
  try {
    console.log('🚀 Fetching all tickets with pagination...');
    
    // Simple query to get tickets (oldest first)
    const ticketsQuery = query(
      collectionGroup(db, 'tickets'),
      orderBy('createdAt', 'asc'),
      limit(pageSize)
    );
    
    const snapshot = await getDocs(ticketsQuery);
    
    const tickets = [];
    snapshot.forEach(doc => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Fetched ${tickets.length} tickets`);
    return tickets;
    
  } catch (error) {
    console.error('❌ Error fetching all tickets:', error);
    throw error;
  }
};
