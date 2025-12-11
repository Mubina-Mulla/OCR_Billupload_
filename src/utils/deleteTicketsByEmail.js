/**
 * Script to delete tickets created by specific email addresses
 * Run this from the browser console or as a standalone script
 */

import { 
  collectionGroup, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Delete tickets created by specific email addresses
 * @param {Array<string>} emails - Array of email addresses
 * @returns {Promise<Object>} Result with deleted count and details
 */
export const deleteTicketsByEmails = async (emails) => {
  try {
    console.log('🗑️ Starting ticket deletion for emails:', emails);
    
    const deletedTickets = [];
    const errors = [];
    
    // Query all tickets using collectionGroup
    const ticketsQuery = query(collectionGroup(db, 'tickets'));
    const snapshot = await getDocs(ticketsQuery);
    
    console.log(`📊 Found ${snapshot.size} total tickets to check`);
    
    // Filter tickets by createdBy email
    const ticketsToDelete = [];
    snapshot.forEach(docSnapshot => {
      const ticketData = docSnapshot.data();
      const createdBy = ticketData.createdBy || '';
      const adminEmail = ticketData.adminEmail || '';
      
      // Check if ticket was created by any of the specified emails
      if (emails.some(email => 
        createdBy.toLowerCase().includes(email.toLowerCase()) ||
        adminEmail.toLowerCase() === email.toLowerCase()
      )) {
        ticketsToDelete.push({
          ref: docSnapshot.ref,
          id: docSnapshot.id,
          data: ticketData
        });
      }
    });
    
    console.log(`🎯 Found ${ticketsToDelete.length} tickets to delete`);
    
    // Delete each ticket
    for (const ticket of ticketsToDelete) {
      try {
        await deleteDoc(ticket.ref);
        deletedTickets.push({
          id: ticket.id,
          ticketNumber: ticket.data.ticketNumber,
          createdBy: ticket.data.createdBy,
          adminEmail: ticket.data.adminEmail,
          customerName: ticket.data.customerName
        });
        console.log(`✅ Deleted ticket #${ticket.data.ticketNumber} (${ticket.id})`);
      } catch (error) {
        console.error(`❌ Failed to delete ticket ${ticket.id}:`, error);
        errors.push({
          id: ticket.id,
          error: error.message
        });
      }
    }
    
    const result = {
      success: true,
      totalChecked: snapshot.size,
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
 * Preview tickets that would be deleted (without actually deleting)
 * @param {Array<string>} emails - Array of email addresses
 * @returns {Promise<Array>} List of tickets that would be deleted
 */
export const previewTicketsDeletion = async (emails) => {
  try {
    console.log('👀 Previewing tickets for deletion:', emails);
    
    const ticketsQuery = query(collectionGroup(db, 'tickets'));
    const snapshot = await getDocs(ticketsQuery);
    
    const ticketsToDelete = [];
    snapshot.forEach(docSnapshot => {
      const ticketData = docSnapshot.data();
      const createdBy = ticketData.createdBy || '';
      const adminEmail = ticketData.adminEmail || '';
      
      if (emails.some(email => 
        createdBy.toLowerCase().includes(email.toLowerCase()) ||
        adminEmail.toLowerCase() === email.toLowerCase()
      )) {
        ticketsToDelete.push({
          id: docSnapshot.id,
          ticketNumber: ticketData.ticketNumber,
          createdBy: ticketData.createdBy,
          adminEmail: ticketData.adminEmail,
          customerName: ticketData.customerName,
          category: ticketData.category,
          status: ticketData.status,
          createdAt: ticketData.createdAt
        });
      }
    });
    
    console.log(`📋 Preview: ${ticketsToDelete.length} tickets would be deleted`);
    console.table(ticketsToDelete);
    
    return ticketsToDelete;
    
  } catch (error) {
    console.error('❌ Error previewing tickets:', error);
    return [];
  }
};
