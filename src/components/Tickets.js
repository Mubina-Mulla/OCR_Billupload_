import React, { useState, useEffect } from "react";
import { onSnapshot, deleteDoc, updateDoc, getDocs, collection, doc } from "firebase/firestore";
import { db, getCollectionRef, getDocRef, getAdminTicketDocRef, getAdminTicketsCollectionRef } from "../firebase/config";
import { subscribeTickets, fetchTicketsPaginated } from "../firebase/ticketsHelper";
import ConfirmDialog from './ConfirmDialog';
import Notification from './Notification';
import useNotification from '../hooks/useNotification';
import Loader from './Loader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import "./Tickets.css";

// Cache tickets globally to avoid reloading
let cachedTickets = [];
let lastLoadTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

const Tickets = ({ filterCategory, excludeResolved = false, showStatusFilter = true, showEditableNotes = false, inStockStatusFilter = null, setInStockStatusFilter }) => {
  const [allTickets, setAllTickets] = useState(cachedTickets); // Start with cached tickets
  const [displayedTickets, setDisplayedTickets] = useState([]); // Only tickets to show (9 at a time)
  const [currentBatch, setCurrentBatch] = useState(0); // Current batch number (0, 1, 2...)
  const [searchTerm, setSearchTerm] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // "active", "cancelled", "resolved", "all"
  const [technicians, setTechnicians] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', ticketId: null });
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [isLoading, setIsLoading] = useState(cachedTickets.length === 0); // Only show loading if no cache
  const [loadingMore, setLoadingMore] = useState(false); // Loading next batch
  const BATCH_SIZE = 9; // Show 9 tickets per batch
  const { notification, showNotification, hideNotification } = useNotification();
  const [editingNote, setEditingNote] = useState({}); // Track which ticket's note is being edited
  const [noteValues, setNoteValues] = useState({}); // Store note values being edited
  const [editingTicket, setEditingTicket] = useState({}); // Track which ticket is in full edit mode
  const [ticketEditValues, setTicketEditValues] = useState({}); // Store ticket field values being edited
  const [showExportMenu, setShowExportMenu] = useState(false); // Track export menu visibility


  // Get current user ID for user-specific tickets
 const getCurrentUserId = () => {
  try {
    const currentAdmin = localStorage.getItem('currentAdmin');
    const superAdmin = localStorage.getItem('superAdmin');

    console.log('🔍 Tickets.js - Getting user ID');
    console.log('currentAdmin raw:', currentAdmin);
    console.log('superAdmin raw:', superAdmin);

    if (currentAdmin) {
      const adminData = JSON.parse(currentAdmin);
      const userId = adminData?.uid;  // ✅ FIXED
      console.log('🆔 Tickets.js - Extracted user ID from currentAdmin:', userId);
      console.log('🆔 Type:', typeof userId);
      return userId;
    }

    if (superAdmin) {
      const adminData = JSON.parse(superAdmin);
      const userId = adminData?.uid;  // ✅ FIXED
      console.log('🆔 Tickets.js - Extracted user ID from superAdmin:', userId);
      console.log('🆔 Type:', typeof userId);
      return userId;
    }

    console.log('❌ Tickets.js - No admin data found');
    return null;
  } catch (error) {
    console.error('❌ Tickets.js - Error getting user ID:', error);
    return null;
  }
};

  const getCurrentUserName = () => {
    try {
      const currentAdmin = localStorage.getItem('currentAdmin');
      const superAdmin = localStorage.getItem('superAdmin');

      if (currentAdmin) {
        const adminData = JSON.parse(currentAdmin);
        return adminData?.name || adminData?.email || 'Admin';
      }

      if (superAdmin) {
        const adminData = JSON.parse(superAdmin);
        return adminData?.name || adminData?.email || 'Super Admin';
      }

      return 'Unknown';
    } catch (error) {
      console.error('Error getting user name:', error);
      return 'Unknown';
    }
  };


  // Load tickets from current user only to prevent Firestore internal errors
  const loadAllTickets = async (forceReload = false) => {
    try {
      // Check if we have cached tickets and they're still fresh
      const now = Date.now();
      if (!forceReload && cachedTickets.length > 0 && (now - lastLoadTime) < CACHE_DURATION) {
        console.log('✅ Using cached tickets');
        setAllTickets(cachedTickets);
        setDisplayedTickets(cachedTickets.slice(0, BATCH_SIZE));
        setCurrentBatch(0);
        const categories = [...new Set(cachedTickets.map(t => t.category).filter(Boolean))];
        setAllCategories(categories);
        setIsLoading(false);
        return;
      }

      console.log('📥 Loading fresh tickets...');
      setIsLoading(true);
      
      const allTickets = [];
      const seenTicketIds = new Set();
      
      // Load only current user's tickets to prevent Firestore internal errors
      const currentUserId = getCurrentUserId();
      const currentUserName = getCurrentUserName();
      
      if (currentUserId) {
        try {
          console.log('📥 Loading current user tickets...');
          const userTicketsRef = getAdminTicketsCollectionRef(currentUserId);
          const userTicketsSnapshot = await getDocs(userTicketsRef);
          
          userTicketsSnapshot.docs.forEach(ticketDoc => {
            const ticketData = ticketDoc.data();
            const ticketIdentifier = ticketData.ticketNumber || ticketDoc.id;
            
            if (!seenTicketIds.has(ticketIdentifier)) {
              seenTicketIds.add(ticketIdentifier);
              allTickets.push({
                id: ticketDoc.id,
                userId: currentUserId,
                ...ticketData
              });
            }
          });
          
          console.log(`✅ Loaded ${allTickets.length} regular tickets for current user`);
          
          // Also load In Stock tickets
          console.log('📥 Loading In Stock tickets...');
          const inStockRef = collection(db, 'mainData', 'Billuload', 'inStock');
          const inStockSnapshot = await getDocs(inStockRef);
          
          inStockSnapshot.docs.forEach(ticketDoc => {
            const ticketData = ticketDoc.data();
            const ticketIdentifier = ticketData.ticketNumber || ticketDoc.id;
            
            // Only add In Stock tickets created by current user
            if (!seenTicketIds.has(ticketIdentifier) && ticketData.userId === currentUserId) {
              seenTicketIds.add(ticketIdentifier);
              allTickets.push({
                id: ticketDoc.id,
                userId: currentUserId,
                ...ticketData
              });
            }
          });
          
          console.log(`✅ Total loaded: ${allTickets.length} tickets (including In Stock)`);
        } catch (currentUserError) {
          console.error('❌ Error loading current user tickets:', currentUserError);
          
          // Show user-friendly error message
          showNotification('Unable to load tickets. Please check your connection and try again.', 'error');
        }
      } else {
        console.error('❌ No current user ID found');
        showNotification('Please log in again to view tickets.', 'error');
      }
      
      // Sort tickets by creation date (oldest first)
      allTickets.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA - dateB;
      });
      
      console.log(`✅ Loaded ${allTickets.length} tickets`);
      
      // Update cache
      cachedTickets = allTickets;
      lastLoadTime = Date.now();
      
      setAllTickets(allTickets);
      setDisplayedTickets(allTickets.slice(0, BATCH_SIZE));
      setCurrentBatch(0);
      
      const categories = [...new Set(allTickets.map(t => t.category).filter(Boolean))];
      setAllCategories(categories);
      
      setIsLoading(false);
      
    } catch (error) {
      console.error("❌ Error loading tickets:", error);
      setIsLoading(false);
      setAllTickets([]);
      setDisplayedTickets([]);
      
      if (error.code === 'permission-denied') {
        showNotification('Permission denied. Please check your access rights or contact an administrator.', 'error');
      } else {
        showNotification('Error loading tickets. Please try again.', 'error');
      }
    }
  };

  // Load all tickets initially
  useEffect(() => {
    // If we have cached tickets, use them immediately
    if (cachedTickets.length > 0) {
      console.log('✅ Using cached tickets on mount');
      setAllTickets(cachedTickets);
      setDisplayedTickets(cachedTickets.slice(0, BATCH_SIZE));
      const categories = [...new Set(cachedTickets.map(t => t.category).filter(Boolean))];
      setAllCategories(categories);
      setIsLoading(false);
    } else {
      console.log('🚀 Loading tickets for first time...');
      loadAllTickets();
    }
    
    return () => {
      console.log('🔌 Tickets component unmounting...');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Load next batch of 9 tickets
  const loadNextBatch = () => {
    setLoadingMore(true);
    
    setTimeout(() => {
      const nextBatch = currentBatch + 1;
      const startIndex = 0;
      const endIndex = (nextBatch + 1) * BATCH_SIZE;
      
      // Show tickets from start to end of next batch
      setDisplayedTickets(allTickets.slice(startIndex, endIndex));
      setCurrentBatch(nextBatch);
      setLoadingMore(false);
      
      console.log(`📦 Loaded batch ${nextBatch + 1}, showing ${endIndex} tickets`);
    }, 500); // Small delay for smooth UX
  };

  // Check if there are more batches to load
  const hasMoreBatches = () => {
    return (currentBatch + 1) * BATCH_SIZE < allTickets.length;
  };

  // Scroll listener for auto-loading next batch
  useEffect(() => {
    const handleScroll = () => {
      // Only trigger if there are actually more tickets to load
      if (!hasMoreBatches() || loadingMore) {
        return;
      }
      
      // Check if user scrolled near bottom (300px from bottom)
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        loadNextBatch();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBatch, loadingMore, allTickets]);

  // Fetch technicians (disabled to prevent Firestore internal errors)
  useEffect(() => {
    // Disable real-time listeners to prevent Firestore internal assertion errors
    // Load technicians once instead of using onSnapshot
    const loadTechnicians = async () => {
      try {
        const techRef = getCollectionRef("technicians");
        const snapshot = await getDocs(techRef);
        const techArray = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTechnicians(techArray);
      } catch (error) {
        console.warn('⚠️ Could not load technicians:', error);
        setTechnicians([]);
      }
    };
    
    loadTechnicians();
  }, []);

  const handleCancel = (id, userId) => {
    // Check if current admin is the one who created the ticket
    const currentUserId = getCurrentUserId();
    console.log('🔍 handleCancel - Permission check:', {
      currentUserId,
      currentUserIdType: typeof currentUserId,
      ticketUserId: userId,
      ticketUserIdType: typeof userId,
      strictMatch: currentUserId === userId,
      looseMatch: currentUserId == userId
    });
    
    // Only block if both IDs exist and don't match (using loose equality to handle string/number differences)
    if (currentUserId && userId && currentUserId != userId) {
      showNotification('You are not authorized to cancel this ticket. Only the admin who created it can make changes.', 'warning');
      return;
    }
    setConfirmDialog({ isOpen: true, type: 'cancel', ticketId: id, userId: userId });
  };

  const confirmCancel = async () => {
    try {
      // Find the ticket to check if it's an In Stock ticket
      const ticket = allTickets.find(t => t.id === confirmDialog.ticketId);
      
      let ticketRef;
      if (ticket && ticket.category === 'In Stock') {
        // For In Stock tickets, use the dedicated inStock collection
        ticketRef = doc(db, 'mainData', 'Billuload', 'inStock', confirmDialog.ticketId);
      } else {
        // For regular tickets, use the user's tickets collection
        const ticketUserId = confirmDialog.userId || getCurrentUserId();
        if (!ticketUserId) {
          throw new Error('User ID not found. Please login again.');
        }
        ticketRef = getAdminTicketDocRef(ticketUserId, confirmDialog.ticketId);
      }

      // Update status to Cancelled instead of deleting
      await updateDoc(ticketRef, {
        status: 'Cancelled',
        cancelledAt: new Date().toISOString()
      });
      
      // Update the ticket in local state
      setAllTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === confirmDialog.ticketId 
            ? { ...ticket, status: 'Cancelled', cancelledAt: new Date().toISOString() }
            : ticket
        )
      );
      
      // Also update displayed tickets
      setDisplayedTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === confirmDialog.ticketId 
            ? { ...ticket, status: 'Cancelled', cancelledAt: new Date().toISOString() }
            : ticket
        )
      );
      
      showNotification('Ticket cancelled successfully!', 'success');
    } catch (error) {
      console.error('Error cancelling ticket:', error);
      showNotification('Error cancelling ticket. Please try again.', 'error');
    }
    setConfirmDialog({ isOpen: false, type: '', ticketId: null, userId: null });
  };

  const handleStatusChange = (id, newStatus, userId) => {
    // Check if current admin is the one who created the ticket
    const currentUserId = getCurrentUserId();
    console.log('🔍 handleStatusChange - Permission check:', {
      currentUserId,
      currentUserIdType: typeof currentUserId,
      ticketUserId: userId,
      ticketUserIdType: typeof userId,
      strictMatch: currentUserId === userId,
      looseMatch: currentUserId == userId
    });
    
    // Only block if both IDs exist and don't match (using loose equality to handle string/number differences)
    if (currentUserId && userId && currentUserId != userId) {
      showNotification('You are not authorized to modify this ticket. Only the admin who created it can make changes.', 'warning');
      return;
    }
    if (newStatus === "Resolved") {
      setConfirmDialog({ isOpen: true, type: 'resolve', ticketId: id, userId: userId });
    } else {
      updateTicketStatus(id, newStatus, userId);
    }
  };

  const updateTicketStatus = async (id, newStatus, userId) => {
    try {
      // Find the ticket to check if it's an In Stock ticket
      const ticket = allTickets.find(t => t.id === id);
      
      let ticketRef;
      if (ticket && ticket.category === 'In Stock') {
        // For In Stock tickets, use the dedicated inStock collection
        ticketRef = doc(db, 'mainData', 'Billuload', 'inStock', id);
      } else {
        // For regular tickets, use the user's tickets collection
        const ticketUserId = userId || getCurrentUserId();
        if (!ticketUserId) {
          throw new Error('User ID not found. Please login again.');
        }
        ticketRef = getAdminTicketDocRef(ticketUserId, id);
      }
      
      await updateDoc(ticketRef, { status: newStatus });
      
      // Update the ticket in local state immediately (no reload needed)
      setAllTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === id 
            ? { ...ticket, status: newStatus }
            : ticket
        )
      );
      
      // Also update displayed tickets
      setDisplayedTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === id 
            ? { ...ticket, status: newStatus }
            : ticket
        )
      );
      
      showNotification('Ticket status updated!', 'success');
    } catch (error) {
      console.error('Error updating ticket:', error);
      showNotification('Error updating ticket. Please try again.', 'error');
    }
  };

  const confirmResolve = async () => {
    try {
      // Find the ticket to check if it's an In Stock ticket
      const ticket = allTickets.find(t => t.id === confirmDialog.ticketId);
      
      const resolvedAt = new Date().toISOString();
      
      let ticketRef;
      if (ticket && ticket.category === 'In Stock') {
        // For In Stock tickets, use the dedicated inStock collection
        ticketRef = doc(db, 'mainData', 'Billuload', 'inStock', confirmDialog.ticketId);
      } else {
        // For regular tickets, use the user's tickets collection
        const ticketUserId = confirmDialog.userId || getCurrentUserId();
        if (!ticketUserId) {
          throw new Error('User ID not found. Please login again.');
        }
        ticketRef = getAdminTicketDocRef(ticketUserId, confirmDialog.ticketId);
      }
      
      await updateDoc(ticketRef, { 
        status: 'Resolved',
        resolvedAt: resolvedAt,
        resolvedDate: resolvedAt // Fallback for old field name
      });
      
      // Update the ticket in local state immediately (no reload needed)
      setAllTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === confirmDialog.ticketId 
            ? { ...ticket, status: 'Resolved', resolvedAt: resolvedAt, resolvedDate: resolvedAt }
            : ticket
        )
      );
      
      // Also update displayed tickets
      setDisplayedTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === confirmDialog.ticketId 
            ? { ...ticket, status: 'Resolved', resolvedAt: resolvedAt, resolvedDate: resolvedAt }
            : ticket
        )
      );
      
      showNotification('Ticket resolved successfully!', 'success');
    } catch (error) {
      console.error('Error resolving ticket:', error);
      showNotification('Error resolving ticket. Please try again.', 'error');
    }
    setConfirmDialog({ isOpen: false, type: '', ticketId: null, userId: null });
  };

  // Handle editing note/description
  const handleEditNote = (ticketId, currentNote) => {
    setEditingNote(prev => ({ ...prev, [ticketId]: true }));
    setNoteValues(prev => ({ ...prev, [ticketId]: currentNote || '' }));
  };

  const handleCancelEditNote = (ticketId) => {
    setEditingNote(prev => ({ ...prev, [ticketId]: false }));
    setNoteValues(prev => ({ ...prev, [ticketId]: '' }));
  };

  const handleSaveNote = async (ticketId, ticket) => {
    try {
      // Check authorization
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        showNotification('Please login to make changes.', 'error');
        return;
      }
      
      // Only allow the creator to edit the ticket
      if (ticket.userId && ticket.userId !== currentUserId) {
        showNotification('You are not authorized to modify this ticket. Only the admin who created it can make changes.', 'error');
        setEditingNote(prev => ({ ...prev, [ticketId]: false }));
        return;
      }
      
      const newNote = noteValues[ticketId];
      
      // Determine if it's an In Stock ticket or regular ticket
      let ticketRef;
      const fieldName = ticket.category === 'In Stock' ? 'description' : 'note';
      
      if (ticket.category === 'In Stock') {
        ticketRef = doc(db, 'mainData', 'Billuload', 'inStock', ticketId);
      } else {
        // For regular tickets, use the user's tickets collection
        const ticketUserId = ticket.userId || getCurrentUserId();
        if (!ticketUserId) {
          throw new Error('User ID not found. Please login again.');
        }
        ticketRef = getAdminTicketDocRef(ticketUserId, ticketId);
      }
      
      await updateDoc(ticketRef, { [fieldName]: newNote });
      
      // Update local state
      setAllTickets(prevTickets => 
        prevTickets.map(t => 
          t.id === ticketId 
            ? { ...t, [fieldName]: newNote }
            : t
        )
      );
      
      setDisplayedTickets(prevTickets => 
        prevTickets.map(t => 
          t.id === ticketId 
            ? { ...t, [fieldName]: newNote }
            : t
        )
      );
      
      setEditingNote(prev => ({ ...prev, [ticketId]: false }));
      showNotification('Note updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating note:', error);
      if (error.code === 'permission-denied') {
        showNotification('You are not authorized to modify this ticket. Only the admin who created it can make changes.', 'error');
      } else {
        showNotification('Error updating note. Please try again.', 'error');
      }
    }
  };

  // Handle full ticket editing
  const handleEditTicket = (ticket) => {
    setEditingTicket(prev => ({ ...prev, [ticket.id]: true }));
    setTicketEditValues(prev => ({ 
      ...prev, 
      [ticket.id]: {
        customerName: ticket.customerName || '',
        productName: ticket.productName || '',
        callId: ticket.callId || '',
        callNo: ticket.callNo || '',
        note: ticket.note || '',
        description: ticket.description || '',
        subOption: ticket.subOption || '',
        companyName: ticket.companyName || '',
        serialNumber: ticket.serialNumber || ''
      }
    }));
  };

  const handleCancelEditTicket = (ticketId) => {
    setEditingTicket(prev => ({ ...prev, [ticketId]: false }));
    setTicketEditValues(prev => ({ ...prev, [ticketId]: {} }));
  };

  const handleSaveTicket = async (ticketId, ticket) => {
    try {
      // Check authorization
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        showNotification('Please login to make changes.', 'error');
        return;
      }
      
      // Only allow the creator to edit the ticket
      if (ticket.userId && ticket.userId !== currentUserId) {
        showNotification('You are not authorized to modify this ticket. Only the admin who created it can make changes.', 'error');
        setEditingTicket(prev => ({ ...prev, [ticketId]: false }));
        return;
      }
      
      const updatedFields = ticketEditValues[ticketId];
      
      let ticketRef;
      if (ticket.category === 'In Stock') {
        ticketRef = doc(db, 'mainData', 'Billuload', 'inStock', ticketId);
      } else {
        // For regular tickets, use the user's tickets collection
        const ticketUserId = ticket.userId || getCurrentUserId();
        if (!ticketUserId) {
          throw new Error('User ID not found. Please login again.');
        }
        ticketRef = getAdminTicketDocRef(ticketUserId, ticketId);
      }
      
      await updateDoc(ticketRef, updatedFields);
      
      // Update local state
      setAllTickets(prevTickets => 
        prevTickets.map(t => 
          t.id === ticketId 
            ? { ...t, ...updatedFields }
            : t
        )
      );
      
      setDisplayedTickets(prevTickets => 
        prevTickets.map(t => 
          t.id === ticketId 
            ? { ...t, ...updatedFields }
            : t
        )
      );
      
      setEditingTicket(prev => ({ ...prev, [ticketId]: false }));
      showNotification('Ticket updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating ticket:', error);
      if (error.code === 'permission-denied') {
        showNotification('You are not authorized to modify this ticket. Only the admin who created it can make changes.', 'error');
      } else {
        showNotification('Error updating ticket. Please try again.', 'error');
      }
    }
  };

  // ✅ Updated Priority Colors: High=Red, Medium=Yellow, Low=Green
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high": return "#dc2626";   // Red for High
      case "medium": return "#facc15"; // Yellow for Medium
      case "low": return "#16a34a";    // Green for Low
      default: return "#6b7280";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "#f59e0b";
      case "In Progress": return "#3b82f6";
      case "Resolved": return "#10b981";
      case "Cancelled": return "rgb(217, 37, 10)";
      default: return "#6b7280";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending": return "⏳";
      case "In Progress": return "🔄";
      case "Resolved": return "✅";
      case "Cancelled": return "❌";
      default: return "📋";
    }
  };

  // Export all pending tickets to PDF
  const exportAllPendingToPDF = () => {
    const pendingTickets = allTickets.filter(ticket => ticket.status === 'Pending');
    
    if (pendingTickets.length === 0) {
      showNotification('No pending tickets to export', 'error');
      setShowExportMenu(false);
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('Pending Tickets Report', 14, 22);
    
    // Add generation date
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 32);
    
    // Prepare table data
    const tableData = pendingTickets.map(ticket => [
      ticket.callNo || ticket.callId || ticket.ticketNumber || 'N/A',
      ticket.customerName || 'N/A',
      ticket.productName || 'N/A',
      ticket.category || 'N/A',
      ticket.status || 'N/A',
      ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'
    ]);
    
    // Add table
    autoTable(doc, {
      startY: 40,
      head: [['Ticket #', 'Customer', 'Product', 'Category', 'Status', 'Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 }
      }
    });
    
    // Save PDF
    doc.save(`pending-tickets-${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification(`${pendingTickets.length} pending tickets exported to PDF!`, 'success');
    setShowExportMenu(false);
  };

  // Export all pending tickets to Excel
  const exportAllPendingToExcel = () => {
    const pendingTickets = allTickets.filter(ticket => ticket.status === 'Pending');
    
    if (pendingTickets.length === 0) {
      showNotification('No pending tickets to export', 'error');
      setShowExportMenu(false);
      return;
    }

    // Prepare data for Excel
    const excelData = pendingTickets.map(ticket => ({
      'Ticket #': ticket.callNo || ticket.callId || ticket.ticketNumber || 'N/A',
      'Customer': ticket.customerName || 'N/A',
      'Product': ticket.productName || 'N/A',
      'Company': ticket.companyName || 'N/A',
      'Serial Number': ticket.serialNumber || 'N/A',
      'Category': ticket.category || 'N/A',
      'Status': ticket.status || 'N/A',
      'Created By': ticket.createdBy || 'N/A',
      'Created Date': ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A',
      'Description': ticket.description || ticket.note || 'N/A'
    }));
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Ticket #
      { wch: 20 }, // Customer
      { wch: 25 }, // Product
      { wch: 20 }, // Company
      { wch: 18 }, // Serial Number
      { wch: 15 }, // Category
      { wch: 12 }, // Status
      { wch: 20 }, // Created By
      { wch: 15 }, // Created Date
      { wch: 40 }  // Description
    ];
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pending Tickets');
    
    // Save Excel file
    XLSX.writeFile(wb, `pending-tickets-${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification(`${pendingTickets.length} pending tickets exported to Excel!`, 'success');
    setShowExportMenu(false);
  };

  const normalizeString = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().trim().replace(/\s+/g, ' ');
  };

  const filterTicketsByDate = (ticket) => {
    if (!selectedDate) return true;
    const ticketDate = new Date(ticket.createdAt);
    const filterDate = new Date(selectedDate);
    return ticketDate.getFullYear() === filterDate.getFullYear() &&
           ticketDate.getMonth() === filterDate.getMonth() &&
           ticketDate.getDate() === filterDate.getDate();
  };

  // Apply filters to displayed tickets (current batch)
  const filteredTickets = displayedTickets
    .filter(ticket => {
      // Search filter
      const searchMatch = searchTerm
        ? (
            normalizeString(ticket.customerName || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.ticketNumber?.toString() || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.companyName || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.productName || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.callId?.toString() || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.callNo?.toString() || '').includes(normalizeString(searchTerm))
          )
        : true;
      
      const categoryMatch = filterCategory 
        ? normalizeString(ticket.category) === normalizeString(filterCategory)
        : true;
      const dateMatch = filterTicketsByDate(ticket);
      
      // Status filter logic (only when showStatusFilter is true)
      let statusMatch = true;
      if (showStatusFilter) {
        if (statusFilter === 'active') {
          statusMatch = ticket.status !== 'Cancelled' && ticket.status !== 'Resolved';
        } else if (statusFilter === 'cancelled') {
          statusMatch = ticket.status === 'Cancelled';
        } else if (statusFilter === 'resolved') {
          statusMatch = ticket.status === 'Resolved';
        }
      }
      
      // In Stock status filter (when viewing In Stock category)
      let inStockMatch = true;
      if (inStockStatusFilter && normalizeString(ticket.category) === 'in stock') {
        if (inStockStatusFilter === 'active') {
          inStockMatch = ticket.status === 'Pending' || ticket.status === 'In Progress';
        } else if (inStockStatusFilter === 'pending') {
          inStockMatch = ticket.status === 'Pending';
        } else if (inStockStatusFilter === 'resolved') {
          inStockMatch = ticket.status === 'Resolved';
        } else if (inStockStatusFilter === 'cancelled') {
          inStockMatch = ticket.status === 'Cancelled';
        }
        // 'all' shows everything, no filter needed
      }
      
      const resolvedMatch = excludeResolved ? ticket.status !== 'Resolved' && ticket.status !== 'Cancelled' : true;
      return searchMatch && categoryMatch && dateMatch && statusMatch && resolvedMatch && inStockMatch;
    })
    .sort((a, b) => {
      // Sort by oldest first (createdAt ascending)
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA - dateB;
    });

  // Get total count from all tickets (for display)
  const totalFilteredCount = allTickets
    .filter(ticket => {
      // Search filter
      const searchMatch = searchTerm
        ? (
            normalizeString(ticket.customerName || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.ticketNumber?.toString() || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.companyName || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.productName || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.callId?.toString() || '').includes(normalizeString(searchTerm)) ||
            normalizeString(ticket.callNo?.toString() || '').includes(normalizeString(searchTerm))
          )
        : true;
      
      const categoryMatch = filterCategory 
        ? normalizeString(ticket.category) === normalizeString(filterCategory)
        : true;
      const dateMatch = filterTicketsByDate(ticket);
      
      // Status filter logic (only when showStatusFilter is true)
      let statusMatch = true;
      if (showStatusFilter) {
        if (statusFilter === 'active') {
          statusMatch = ticket.status !== 'Cancelled' && ticket.status !== 'Resolved';
        } else if (statusFilter === 'cancelled') {
          statusMatch = ticket.status === 'Cancelled';
        } else if (statusFilter === 'resolved') {
          statusMatch = ticket.status === 'Resolved';
        }
      }
      
      // In Stock status filter (when viewing In Stock category)
      let inStockMatch = true;
      if (inStockStatusFilter && normalizeString(ticket.category) === 'in stock') {
        if (inStockStatusFilter === 'active') {
          inStockMatch = ticket.status === 'Pending' || ticket.status === 'In Progress';
        } else if (inStockStatusFilter === 'pending') {
          inStockMatch = ticket.status === 'Pending';
        } else if (inStockStatusFilter === 'resolved') {
          inStockMatch = ticket.status === 'Resolved';
        } else if (inStockStatusFilter === 'cancelled') {
          inStockMatch = ticket.status === 'Cancelled';
        }
        // 'all' shows everything, no filter needed
      }
      
      const resolvedMatch = excludeResolved ? ticket.status !== 'Resolved' && ticket.status !== 'Cancelled' : true;
      return searchMatch && categoryMatch && dateMatch && statusMatch && resolvedMatch && inStockMatch;
    }).length;

  const getCategoryDisplayName = (category) => {
    const categoryMap = {
      "demo": "Demo",
      "service": "Service", 
      "third party": "Third Party",
      "in store": "In Store"
    };
    const normalizedCategory = normalizeString(category);
    return categoryMap[normalizedCategory] || category;
  };

  // Show loader while initial loading
  if (isLoading) {
    return <Loader message="Loading tickets..." size="large" />;
  }

  return (
    <div className="tickets-container">
      <div className="tickets-header">
        <div className="header-main">
          <h1>Ticket Management</h1>
          <div className="header-controls">
            <div className="tickets-count">
              Showing {filteredTickets.length} of {totalFilteredCount} {totalFilteredCount === 1 ? 'ticket' : 'tickets'}
              {filterCategory && ` in "${getCategoryDisplayName(filterCategory)}"`}
              {selectedDate && ` on ${new Date(selectedDate).toLocaleDateString()}`}
            </div>

            <div className="filter-section">
              <div className="view-toggle-section">
                <label className="filter-label">View:</label>
                <div className="view-toggle-buttons">
                  <button
                    className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}
                  >
                    <span className="view-icon">⊞</span>
                    Grid
                  </button>
                  <button
                    className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                    onClick={() => setViewMode("table")}
                  >
                    <span className="view-icon">☰</span>
                    Table
                  </button>
                </div>
              </div>

              {inStockStatusFilter !== null && setInStockStatusFilter && (
                <div className="status-filter">
                  <label className="filter-label">Status:</label>
                  <select
                    value={inStockStatusFilter}
                    onChange={(e) => setInStockStatusFilter(e.target.value)}
                    className="status-select"
                  >
                    <option value="active">Active Tickets</option>
                    <option value="resolved">Resolved</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="all">All Status</option>
                  </select>
                </div>
              )}

              {showStatusFilter && (
                <div className="status-filter">
                  <label htmlFor="statusFilter" className="filter-label">
                    Status:
                  </label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="active">Active Tickets</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="resolved">Resolved</option>
                    <option value="all">All Tickets</option>
                  </select>
                </div>
              )}

              <div className="date-filter-section">
                <label htmlFor="dateFilter" className="date-filter-label">
                  Date:
                </label>
                <input
                  type="date"
                  id="dateFilter"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="date-filter-input"
                />
                {selectedDate && (
                  <button 
                    className="clear-date-filter"
                    onClick={() => setSelectedDate("")}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Export Button */}
              <div style={{ position: 'relative', marginLeft: '15px' }}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.9rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <span style={{ fontSize: '1.1rem' }}>📥</span>
                  Export
                </button>
                
                {showExportMenu && (
                  <>
                    <div 
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 998
                      }}
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 999,
                        minWidth: '180px',
                        overflow: 'hidden',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <button
                        onClick={exportAllPendingToPDF}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s',
                          color: '#374151',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.background = 'white'}
                      >
                        <span style={{ fontSize: '1.2rem' }}>📄</span>
                        Export as Pdf
                      </button>
                      <button
                        onClick={exportAllPendingToExcel}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'white',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s',
                          color: '#374151',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.background = 'white'}
                      >
                        <span style={{ fontSize: '1.2rem' }}>📊</span>
                        Export as Xl
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="search-bar-section">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        {searchTerm && (
          <button 
            className="clear-search-btn"
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {viewMode === "grid" ? (
        <>
        <div className="tickets-grid">
          {filteredTickets.length > 0 ? (
            filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                className="ticket-card"
              >
                <div className="ticket-header">
                  <div className="header-top">
                    <h3 className="ticket-number">#{ticket.callNo || ticket.callId || ticket.ticketNumber}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(ticket.status) }}
                      >
                        <span className="status-icon">{getStatusIcon(ticket.status)}</span>
                        {ticket.status}
                      </div>
                      {/* Edit button for Pending and In Progress tickets in Dashboard */}
                      {showEditableNotes && (ticket.status === 'Pending' || ticket.status === 'In Progress') && !editingTicket[ticket.id] && (
                        <button
                          className="btn-add-note-quick"
                          onClick={() => handleEditTicket(ticket)}
                          title="Edit ticket details"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ticket-body">
                  {editingTicket[ticket.id] ? (
                    /* Edit Mode - All fields editable */
                    <div className="ticket-edit-mode">
                      <div className="edit-section">
                        <div className="edit-row">
                          <span className="edit-label">Customer</span>
                          <input
                            type="text"
                            className="edit-input"
                            value={ticketEditValues[ticket.id]?.customerName || ''}
                            onChange={(e) => setTicketEditValues(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], customerName: e.target.value }
                            }))}
                            placeholder="Customer name"
                          />
                        </div>
                        <div className="edit-row">
                          <span className="edit-label">Product</span>
                          <input
                            type="text"
                            className="edit-input"
                            value={ticketEditValues[ticket.id]?.productName || ''}
                            onChange={(e) => setTicketEditValues(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], productName: e.target.value }
                            }))}
                            placeholder="Product name"
                          />
                        </div>
                        <div className="edit-row">
                          <span className="edit-label">Company</span>
                          <input
                            type="text"
                            className="edit-input"
                            value={ticketEditValues[ticket.id]?.companyName || ''}
                            onChange={(e) => setTicketEditValues(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], companyName: e.target.value }
                            }))}
                            placeholder="Company name"
                          />
                        </div>
                        <div className="edit-row">
                          <span className="edit-label">Serial Number</span>
                          <input
                            type="text"
                            className="edit-input"
                            value={ticketEditValues[ticket.id]?.serialNumber || ''}
                            onChange={(e) => setTicketEditValues(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], serialNumber: e.target.value }
                            }))}
                            placeholder="Serial number"
                          />
                        </div>
                        {(ticket.category === 'Demo' || ticket.category === 'Service') && (
                          <div className="edit-row">
                            <span className="edit-label">Call ID</span>
                            <input
                              type="text"
                              className="edit-input"
                              value={ticketEditValues[ticket.id]?.callId || ''}
                              onChange={(e) => setTicketEditValues(prev => ({
                                ...prev,
                                [ticket.id]: { ...prev[ticket.id], callId: e.target.value }
                              }))}
                              placeholder="Call ID"
                            />
                          </div>
                        )}
                        {ticket.category === 'In Stock' && (
                          <div className="edit-row">
                            <span className="edit-label">Call No</span>
                            <input
                              type="text"
                              className="edit-input"
                              value={ticketEditValues[ticket.id]?.callNo || ''}
                              onChange={(e) => setTicketEditValues(prev => ({
                                ...prev,
                                [ticket.id]: { ...prev[ticket.id], callNo: e.target.value }
                              }))}
                              placeholder="Call number"
                            />
                          </div>
                        )}
                        <div className="edit-row">
                          <span className="edit-label">Assigned To</span>
                          <input
                            type="text"
                            className="edit-input"
                            value={ticketEditValues[ticket.id]?.subOption || ''}
                            onChange={(e) => setTicketEditValues(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], subOption: e.target.value }
                            }))}
                            placeholder="Assigned to"
                          />
                        </div>
                        <div className="edit-row full-width">
                          <span className="edit-label">Note</span>
                          <textarea
                            className="edit-textarea"
                            value={ticketEditValues[ticket.id]?.[ticket.category === 'In Stock' ? 'description' : 'note'] || ''}
                            onChange={(e) => setTicketEditValues(prev => ({
                              ...prev,
                              [ticket.id]: { 
                                ...prev[ticket.id], 
                                [ticket.category === 'In Stock' ? 'description' : 'note']: e.target.value 
                              }
                            }))}
                            placeholder="Add note..."
                            rows="3"
                          />
                        </div>
                      </div>
                      <div className="edit-actions">
                        <button 
                          className="btn-save-ticket"
                          onClick={() => handleSaveTicket(ticket.id, ticket)}
                        >
                          💾 Save All Changes
                        </button>
                        <button 
                          className="btn-cancel-ticket"
                          onClick={() => handleCancelEditTicket(ticket.id)}
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode - Display only */
                    <>
                  <div className="info-section">
                    {ticket.category === 'In Stock' ? (
                      // In Stock specific fields
                      <>
                        <div className="info-row">
                          <span className="info-label">Product</span>
                          <span className="info-value">{ticket.productName}</span>
                        </div>
                        {ticket.productCode && (
                          <div className="info-row">
                            <span className="info-label">Product Code</span>
                            <span className="info-value">{ticket.productCode}</span>
                          </div>
                        )}
                        {ticket.brand && (
                          <div className="info-row">
                            <span className="info-label">Brand</span>
                            <span className="info-value">{ticket.brand}</span>
                          </div>
                        )}
                        {ticket.model && (
                          <div className="info-row">
                            <span className="info-label">Model</span>
                            <span className="info-value">{ticket.model}</span>
                          </div>
                        )}
                        {ticket.defectType && (
                          <div className="info-row">
                            <span className="info-label">Defect Type</span>
                            <span className="info-value">{ticket.defectType}</span>
                          </div>
                        )}
                        {ticket.quantity && (
                          <div className="info-row">
                            <span className="info-label">Quantity</span>
                            <span className="info-value">{ticket.quantity}</span>
                          </div>
                        )}
                        {ticket.reportedBy && (
                          <div className="info-row">
                            <span className="info-label">Reported By</span>
                            <span className="info-value">{ticket.reportedBy}</span>
                          </div>
                        )}
                        {ticket.dateReported && (
                          <div className="info-row">
                            <span className="info-label">Date Reported</span>
                            <span className="info-value">
                              {new Date(ticket.dateReported).toLocaleDateString('en-GB', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      // Regular ticket fields
                      <>
                        <div className="info-row">
                          <span className="info-label">Customer</span>
                          <span className="info-value">{ticket.customerName}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Product</span>
                          <span className="info-value">{ticket.productName}</span>
                        </div>
                        {ticket.createdBy && (
                          <div className="info-row">
                            <span className="info-label">Created By</span>
                            <span className="info-value admin-name">👤 {ticket.createdBy}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="meta-section">
                    <div className="priority-info">
                      <div className="meta-dates">
                        <div className="start-date">
                          <span className="date-label">Start:</span>
                          <span className="date-value">
                            {new Date(ticket.createdAt).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                        {ticket.status === 'Resolved' && (ticket.resolvedAt || ticket.resolvedDate) && (
                          <div className="end-date resolved-date">
                            <span className="date-label">Resolved:</span>
                            <span className="date-value">
                              {new Date(ticket.resolvedAt || ticket.resolvedDate).toLocaleDateString('en-GB', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}
                        {ticket.endDate && ticket.status !== 'Resolved' && (
                          <div className="end-date">
                            <span className="date-label">End:</span>
                            <span className="date-value">
                              {new Date(ticket.endDate).toLocaleDateString('en-GB', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="assigned-info">
                      <span className="meta-label">Assigned To</span>
                      <span className="meta-value">{ticket.subOption || "Unassigned"}</span>
                      <span className="meta-category">{ticket.category}</span>
                      {(ticket.category === "Demo" || ticket.category === "Service") && ticket.callId && (
                        <span className="meta-call-id">Call ID: {ticket.callId}</span>
                      )}
                      {(ticket.category === "Demo" || ticket.category === "Service") && ticket.uniqueId && (
                        <span className="meta-unique-id">🔑 ID: {ticket.uniqueId}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Editable Note Section */}
                  {/* Show for Third Party & In Store: Always if note exists or when editing */}
                  {/* Show for Demo & Service in Dashboard: Only when editing (after + button click) */}
                  {/* Show for In Stock in Dashboard: Always if description exists or when editing */}
                  {(ticket.status === 'Pending' || ticket.status === 'In Progress') && (
                    // Third Party & In Store: Show if note exists OR in Tickets section
                    ((ticket.category === 'Third Party' || ticket.category === 'In Store') && (ticket.note || !showEditableNotes || editingNote[ticket.id])) ||
                    // In Stock in Dashboard: Show if description exists or editing
                    (showEditableNotes && ticket.category === 'In Stock' && (ticket.description || editingNote[ticket.id])) ||
                    // Demo & Service in Dashboard: Only show when editing (after + click)
                    (showEditableNotes && (ticket.category === 'Demo' || ticket.category === 'Service') && editingNote[ticket.id])
                  ) && (
                    <div className="ticket-note-section">
                      <div className="note-header">
                        <span className="note-label">📝 {ticket.category === 'In Stock' ? 'Description' : 'Note'}:</span>
                        {!editingNote[ticket.id] && (
                          <button 
                            className="btn-edit-note"
                            onClick={() => handleEditNote(ticket.id, ticket.category === 'In Stock' ? ticket.description : ticket.note)}
                            title="Edit note"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                      {editingNote[ticket.id] ? (
                        <div className="note-edit-container">
                          <textarea
                            className="note-textarea"
                            value={noteValues[ticket.id] || ''}
                            onChange={(e) => setNoteValues(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                            placeholder={`Add ${ticket.category === 'In Stock' ? 'description' : 'note'} for this ticket...`}
                            rows="3"
                          />
                          <div className="note-actions">
                            <button 
                              className="btn-save-note"
                              onClick={() => handleSaveNote(ticket.id, ticket)}
                            >
                              💾 Save
                            </button>
                            <button 
                              className="btn-cancel-note"
                              onClick={() => handleCancelEditNote(ticket.id)}
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="note-display">
                          <span className="note-text">
                            {(ticket.category === 'In Stock' ? ticket.description : ticket.note) || 'No note added yet. Click Edit to add one.'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Display-only note for resolved/cancelled tickets */}
                  {(ticket.status === 'Resolved' || ticket.status === 'Cancelled') && (ticket.note || ticket.description) && (
                    (ticket.category === 'Third Party' || ticket.category === 'In Store' || ticket.category === 'In Stock')
                  ) && (
                    <div className="ticket-note">
                      <span className="note-label">📝 {ticket.category === 'In Stock' ? 'Description' : 'Note'}:</span>
                      <span className="note-text">{ticket.category === 'In Stock' ? ticket.description : ticket.note}</span>
                    </div>
                  )}
                  </>
                  )}
                </div>

                <div className="ticket-actions">
                  {!editingTicket[ticket.id] && (
                    <>
                  <div className="action-group">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value, ticket.userId)}
                      className="status-select"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancel(ticket.id, ticket.userId)}
                    title="Cancel ticket"
                  >
                    ❌ Cancel
                  </button>
                  </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No tickets found</h3>
              <p>
                {filterCategory 
                  ? `No tickets found for "${getCategoryDisplayName(filterCategory)}".` 
                  : "No tickets available."
                }
                {selectedDate && ` on ${new Date(selectedDate).toLocaleDateString()}`}
              </p>
            </div>
          )}
        </div>
        
        {/* Loading More Indicator - Only show if there are actually more tickets */}
        {loadingMore && hasMoreBatches() && (
          <div className="loading-more-indicator" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 20px',
            fontSize: '18px',
            color: '#6b7280',
            fontWeight: '500',
            gap: '12px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Loading more tickets...</span>
          </div>
        )}
        
        {/* All Tickets Loaded Indicator */}
        {!hasMoreBatches() && displayedTickets.length > 0 && !loadingMore && (
          <div className="no-more-tickets" style={{
            textAlign: 'center',
            padding: '30px 20px',
            fontSize: '16px',
            color: '#9ca3af',
            fontWeight: '500'
          }}>
            <span style={{ fontSize: '24px', marginRight: '8px' }}>🏁</span>
            All tickets loaded ({displayedTickets.length} of {allTickets.length})
          </div>
        )}
        </>
      ) : (
        <div className="tickets-table-container">
          {filteredTickets.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="table-responsive">
                <table className="tickets-table">
                  <thead>
                    <tr>
                      <th>Call No</th>
                      <th>Customer/Product</th>
                      <th>Product/Details</th>
                      <th>Created By</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Category</th>
                      <th>Call ID</th>
                      <th>Unique ID</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map(ticket => (
                      <tr key={ticket.id} className="table-row">
                        <td className="ticket-number-cell">#{ticket.callNo || ticket.callId || ticket.ticketNumber}</td>
                        <td className="customer-cell">
                          {ticket.category === 'In Stock' ? ticket.productName : ticket.customerName}
                        </td>
                        <td className="product-cell">
                          {ticket.category === 'In Stock' ? (
                            <div style={{ fontSize: '0.85rem' }}>
                              {ticket.brand && <div><strong>Brand:</strong> {ticket.brand}</div>}
                              {ticket.model && <div><strong>Model:</strong> {ticket.model}</div>}
                              {ticket.defectType && <div><strong>Defect:</strong> {ticket.defectType}</div>}
                              {ticket.quantity && <div><strong>Qty:</strong> {ticket.quantity}</div>}
                            </div>
                          ) : (
                            ticket.productName
                          )}
                        </td>
                        <td className="admin-cell">
                          {ticket.createdBy ? (
                            <span className="admin-name-table">👤 {ticket.createdBy}</span>
                          ) : (
                            <span className="admin-name-table unknown">Unknown</span>
                          )}
                        </td>
                        <td className="status-cell">
                          <div 
                            className="status-badge-small" 
                            style={{ backgroundColor: getStatusColor(ticket.status) }}
                          >
                            <span className="status-icon">{getStatusIcon(ticket.status)}</span>
                            {ticket.status}
                          </div>
                        </td>
                        <td className="assigned-cell">{ticket.subOption || "Unassigned"}</td>
                        <td className="category-cell">{ticket.category}</td>
                        <td className="call-id-cell">
                          {(ticket.category === "Demo" || ticket.category === "Service") 
                            ? (ticket.callId || 'N/A') 
                            : '-'
                          }
                        </td>
                        <td className="unique-id-cell">
                          {(ticket.category === "Demo" || ticket.category === "Service") 
                            ? (ticket.uniqueId || 'N/A') 
                            : '-'
                          }
                        </td>
                        <td className="date-cell">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>
                              <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>Start: </small>
                              {new Date(ticket.createdAt).toLocaleDateString('en-GB', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}
                            </div>
                            {ticket.status === 'Resolved' && (ticket.resolvedAt || ticket.resolvedDate) && (
                              <div style={{ color: '#10b981', fontWeight: '600' }}>
                                <small style={{ color: '#059669', fontSize: '0.75rem' }}>Resolved: </small>
                                {new Date(ticket.resolvedAt || ticket.resolvedDate).toLocaleDateString('en-GB', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric' 
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="actions-cell">
                          <div className="table-actions">
                            <select
                              value={ticket.status}
                              onChange={(e) => handleStatusChange(ticket.id, e.target.value, ticket.userId)}
                              className="status-select-small"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                            <button
                              className="btn-cancel-small"
                              onClick={() => handleCancel(ticket.id, ticket.userId)}
                              title="Cancel ticket"
                            >
                              ❌
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (hidden on desktop, shown on mobile) */}
              <div className="mobile-cards">
                {filteredTickets.map(ticket => (
                  <div key={`mobile-${ticket.id}`} className="mobile-ticket-card">
                    <div className="mobile-card-header">
                      <span className="mobile-ticket-number">#{ticket.callNo || ticket.callId || ticket.ticketNumber}</span>
                      <div 
                        className="status-badge-small" 
                        style={{ backgroundColor: getStatusColor(ticket.status) }}
                      >
                        <span className="status-icon">{getStatusIcon(ticket.status)}</span>
                        {ticket.status}
                      </div>
                    </div>

                    <div className="mobile-card-body">
                      {ticket.category === 'In Stock' ? (
                        // In Stock specific mobile fields
                        <>
                          <div className="mobile-info-row">
                            <span className="mobile-info-label">Product</span>
                            <span className="mobile-info-value">{ticket.productName}</span>
                          </div>
                          {ticket.brand && (
                            <div className="mobile-info-row">
                              <span className="mobile-info-label">Brand</span>
                              <span className="mobile-info-value">{ticket.brand}</span>
                            </div>
                          )}
                          {ticket.model && (
                            <div className="mobile-info-row">
                              <span className="mobile-info-label">Model</span>
                              <span className="mobile-info-value">{ticket.model}</span>
                            </div>
                          )}
                          {ticket.defectType && (
                            <div className="mobile-info-row">
                              <span className="mobile-info-label">Defect Type</span>
                              <span className="mobile-info-value">{ticket.defectType}</span>
                            </div>
                          )}
                          {ticket.quantity && (
                            <div className="mobile-info-row">
                              <span className="mobile-info-label">Quantity</span>
                              <span className="mobile-info-value">{ticket.quantity}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        // Regular ticket mobile fields
                        <>
                          <div className="mobile-info-row">
                            <span className="mobile-info-label">Customer</span>
                            <span className="mobile-info-value">{ticket.customerName}</span>
                          </div>
                          <div className="mobile-info-row">
                            <span className="mobile-info-label">Product</span>
                            <span className="mobile-info-value">{ticket.productName}</span>
                          </div>
                        </>
                      )}
                      {ticket.createdBy && (
                        <div className="mobile-info-row">
                          <span className="mobile-info-label">Created By</span>
                          <span className="mobile-info-value admin-name">👤 {ticket.createdBy}</span>
                        </div>
                      )}
                      <div className="mobile-info-row">
                        <span className="mobile-info-label">Assigned To</span>
                        <span className="mobile-info-value">{ticket.subOption || "Unassigned"}</span>
                      </div>
                      <div className="mobile-info-row">
                        <span className="mobile-info-label">Category</span>
                        <span className="mobile-info-value">{ticket.category}</span>
                      </div>
                      <div className="mobile-info-row">
                        <span className="mobile-info-label">Created</span>
                        <span className="mobile-info-value">
                          {new Date(ticket.createdAt).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                      {ticket.status === 'Resolved' && (ticket.resolvedAt || ticket.resolvedDate) && (
                        <div className="mobile-info-row">
                          <span className="mobile-info-label">Resolved</span>
                          <span className="mobile-info-value" style={{ color: '#10b981', fontWeight: '600' }}>
                            {new Date(ticket.resolvedAt || ticket.resolvedDate).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      )}
                      {(ticket.category === "Demo" || ticket.category === "Service") && ticket.callId && (
                        <div className="mobile-info-row">
                          <span className="mobile-info-label">Call ID</span>
                          <span className="mobile-info-value">{ticket.callId}</span>
                        </div>
                      )}
                      {(ticket.category === "Demo" || ticket.category === "Service") && ticket.uniqueId && (
                        <div className="mobile-info-row">
                          <span className="mobile-info-label">Unique ID</span>
                          <span className="mobile-info-value">{ticket.uniqueId}</span>
                        </div>
                      )}
                    </div>

                    <div className="mobile-card-actions">
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value, ticket.userId)}
                        className="mobile-status-select"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                      <button
                        className="mobile-cancel-btn"
                        onClick={() => handleCancel(ticket.id, ticket.userId)}
                        title="Cancel ticket"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No tickets found</h3>
              <p>
                {filterCategory 
                  ? `No tickets found for "${getCategoryDisplayName(filterCategory)}".` 
                  : "No tickets available."
                }
                {selectedDate && ` on ${new Date(selectedDate).toLocaleDateString()}`}
              </p>
            </div>
          )}
          
          {/* Loading More Indicator for Table View */}
          {loadingMore && hasMoreBatches() && (
            <div className="loading-more-indicator" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px 20px',
              fontSize: '18px',
              color: '#6b7280',
              fontWeight: '500',
              gap: '12px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>Loading more tickets...</span>
            </div>
          )}
          
          {/* All Tickets Loaded Indicator for Table View */}
          {!hasMoreBatches() && displayedTickets.length > 0 && !loadingMore && (
            <div className="no-more-tickets" style={{
              textAlign: 'center',
              padding: '30px 20px',
              fontSize: '16px',
              color: '#9ca3af',
              fontWeight: '500'
            }}>
              <span style={{ fontSize: '24px', marginRight: '8px' }}>🏁</span>
              All tickets loaded ({displayedTickets.length} of {allTickets.length})
            </div>
          )}
        </div>
      )}
      
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.type === 'cancel' ? 'Cancel Ticket' : 'Resolve Ticket'}
        message={
          confirmDialog.type === 'cancel'
            ? 'Are you sure you want to cancel this ticket? This will mark it as cancelled.'
            : 'Are you sure you want to mark this ticket as resolved?'
        }
        onConfirm={confirmDialog.type === 'cancel' ? confirmCancel : confirmResolve}
        onCancel={() => setConfirmDialog({ isOpen: false, type: '', ticketId: null })}
        confirmText="OK"
        cancelText="Cancel"
        type={confirmDialog.type === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  );
};

export default Tickets;