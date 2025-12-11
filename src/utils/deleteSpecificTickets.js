/**
 * Delete specific tickets by ticket numbers or by email addresses
 * This is a utility script for one-time deletions
 */

import { 
  collectionGroup, 
  query, 
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Delete tickets by ticket numbers
 * @param {Array<string>} ticketNumbers - Array of ticket numbers to delete
 * @returns {Promise<Object>} Result with deleted count
 */
export const deleteTicketsByNumbers = async (ticketNumbers) => {
  try {
    console.log('🗑️ Deleting tickets by numbers:', ticketNumbers);
    
    const deletedTickets = [];
    const errors = [];
    
    // Query all tickets
    const ticketsQuery = query(collectionGroup(db, 'tickets'));
    const snapshot = await getDocs(ticketsQuery);
    
    console.log(`📊 Found ${snapshot.size} total tickets to check`);
    
    // Find and delete matching tickets
    for (const docSnapshot of snapshot.docs) {
      const ticketData = docSnapshot.data();
      const ticketNumber = ticketData.ticketNumber?.toString();
      
      if (ticketNumbers.includes(ticketNumber)) {
        try {
          await deleteDoc(docSnapshot.ref);
          deletedTickets.push({
            id: docSnapshot.id,
            ticketNumber: ticketNumber,
            customerName: ticketData.customerName,
            createdBy: ticketData.createdBy
          });
          console.log(`✅ Deleted ticket #${ticketNumber}`);
        } catch (error) {
          console.error(`❌ Failed to delete ticket #${ticketNumber}:`, error);
          errors.push({
            ticketNumber,
            error: error.message
          });
        }
      }
    }
    
    const result = {
      success: true,
      deletedCount: deletedTickets.length,
      deletedTickets,
      errors,
      message: `Successfully deleted ${deletedTickets.length} tickets`
    };
    
    console.log('✅ Deletion complete:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error deleting tickets:', error);
    return {
      success: false,
      error: error.message,
      deletedCount: 0
    };
  }
};

/**
 * Delete tickets by email addresses (createdBy or adminEmail)
 * @param {Array<string>} emails - Array of email addresses
 * @returns {Promise<Object>} Result with deleted count
 */
export const deleteTicketsByEmails = async (emails) => {
  try {
    console.log('🗑️ Deleting tickets by emails:', emails);
    
    const deletedTickets = [];
    const errors = [];
    
    // Query all tickets
    const ticketsQuery = query(collectionGroup(db, 'tickets'));
    const snapshot = await getDocs(ticketsQuery);
    
    console.log(`📊 Found ${snapshot.size} total tickets to check`);
    
    // Find and delete matching tickets
    for (const docSnapshot of snapshot.docs) {
      const ticketData = docSnapshot.data();
      const createdBy = (ticketData.createdBy || '').toLowerCase();
      const adminEmail = (ticketData.adminEmail || '').toLowerCase();
      
      // Check if ticket was created by any of the specified emails
      const shouldDelete = emails.some(email => {
        const emailLower = email.toLowerCase();
        return createdBy.includes(emailLower) || adminEmail === emailLower;
      });
      
      if (shouldDelete) {
        try {
          await deleteDoc(docSnapshot.ref);
          deletedTickets.push({
            id: docSnapshot.id,
            ticketNumber: ticketData.ticketNumber,
            customerName: ticketData.customerName,
            createdBy: ticketData.createdBy,
            adminEmail: ticketData.adminEmail
          });
          console.log(`✅ Deleted ticket #${ticketData.ticketNumber} (${docSnapshot.id})`);
        } catch (error) {
          console.error(`❌ Failed to delete ticket ${docSnapshot.id}:`, error);
          errors.push({
            id: docSnapshot.id,
            error: error.message
          });
        }
      }
    }
    
    const result = {
      success: true,
      deletedCount: deletedTickets.length,
      deletedTickets,
      errors,
      message: `Successfully deleted ${deletedTickets.length} tickets`
    };
    
    console.log('✅ Deletion complete:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error deleting tickets:', error);
    return {
      success: false,
      error: error.message,
      deletedCount: 0
    };
  }
};

/**
 * Delete placeholder tickets (tickets with isPlaceholder flag or minimal data)
 * @returns {Promise<Object>} Result with deleted count
 */
export const deletePlaceholderTickets = async () => {
  try {
    console.log('🗑️ Deleting placeholder tickets...');
    
    const deletedTickets = [];
    const errors = [];
    
    // Query all tickets
    const ticketsQuery = query(collectionGroup(db, 'tickets'));
    const snapshot = await getDocs(ticketsQuery);
    
    console.log(`📊 Found ${snapshot.size} total tickets to check`);
    
    // Find and delete placeholder tickets
    for (const docSnapshot of snapshot.docs) {
      const ticketData = docSnapshot.data();
      
      console.log(`🔍 Checking ticket ${docSnapshot.id}:`, {
        hasCustomerName: !!ticketData.customerName,
        hasTicketNumber: !!ticketData.ticketNumber,
        isPlaceholder: ticketData.isPlaceholder,
        customerName: ticketData.customerName,
        ticketNumber: ticketData.ticketNumber
      });
      
      // Check if it's a placeholder ticket
      const isPlaceholder = ticketData.isPlaceholder === true ||
                           !ticketData.customerName ||
                           !ticketData.ticketNumber;
      
      if (isPlaceholder) {
        console.log(`🎯 Found placeholder ticket to delete: ${docSnapshot.id}`);
        try {
          await deleteDoc(docSnapshot.ref);
          deletedTickets.push({
            id: docSnapshot.id,
            ticketNumber: ticketData.ticketNumber || 'N/A',
            isPlaceholder: ticketData.isPlaceholder,
            note: ticketData.note,
            customerName: ticketData.customerName
          });
          console.log(`✅ Deleted placeholder ticket ${docSnapshot.id}`);
        } catch (error) {
          console.error(`❌ Failed to delete ticket ${docSnapshot.id}:`, error);
          errors.push({
            id: docSnapshot.id,
            error: error.message
          });
        }
      }
    }
    
    const result = {
      success: true,
      totalChecked: snapshot.size,
      deletedCount: deletedTickets.length,
      deletedTickets,
      errors,
      message: deletedTickets.length > 0 
        ? `Successfully deleted ${deletedTickets.length} placeholder tickets`
        : `No placeholder tickets found (checked ${snapshot.size} tickets)`
    };
    
    console.log('✅ Deletion complete:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error deleting placeholder tickets:', error);
    return {
      success: false,
      error: error.message,
      deletedCount: 0
    };
  }
};

// Quick function to delete the 6 visible tickets
export const deleteVisibleTickets = async () => {
  const emails = ['pranav@gmail.com', 'azim@gmail.com', 'mubina@gmail.com', 'vaishu@gmail.com'];
  return await deleteTicketsByEmails(emails);
};
