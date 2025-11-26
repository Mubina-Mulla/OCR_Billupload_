import React, { useState, useEffect } from "react";
import { onSnapshot, deleteDoc, updateDoc, getDocs, collection, doc } from "firebase/firestore";
import { db, getCollectionRef, getDocRef, getAdminTicketDocRef, getAdminTicketsCollectionRef } from "../firebase/config";
import { subscribeTickets, fetchTicketsPaginated } from "../firebase/ticketsHelper";
import ConfirmDialog from './ConfirmDialog';
import Notification from './Notification';
import useNotification from '../hooks/useNotification';
import Loader from './Loader';
import "./Tickets.css";

// Cache tickets globally to avoid reloading
let cachedTickets = [];
let lastLoadTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

const Tickets = ({ filterCategory, excludeResolved = false }) => {
  const [allTickets, setAllTickets] = useState(cachedTickets); // Start with cached tickets
  const [displayedTickets, setDisplayedTickets] = useState([]); // Only tickets to show (9 at a time)
  const [currentBatch, setCurrentBatch] = useState(0); // Current batch number (0, 1, 2...)
  const [searchTerm, setSearchTerm] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', ticketId: null });
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [isLoading, setIsLoading] = useState(cachedTickets.length === 0); // Only show loading if no cache
  const [loadingMore, setLoadingMore] = useState(false); // Loading next batch
  const BATCH_SIZE = 9; // Show 9 tickets per batch
  const { notification, showNotification, hideNotification } = useNotification();


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


  // Load tickets from all admin collections for ticket management view
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
      
      const usersRef = getCollectionRef("users");
      const usersSnapshot = await getDocs(usersRef);
      
      const allTickets = [];
      const seenTicketIds = new Set();
      
      // Fetch tickets from users
      const ticketPromises = usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userTicketsRef = collection(db, 'mainData', 'Billuload', 'users', userDoc.id, 'tickets');
        const ticketsSnapshot = await getDocs(userTicketsRef);
        
        const userTickets = [];
        ticketsSnapshot.docs.forEach(ticketDoc => {
          const ticketData = ticketDoc.data();
          const ticketIdentifier = ticketData.ticketNumber || ticketDoc.id;
          
          if (!seenTicketIds.has(ticketIdentifier)) {
            seenTicketIds.add(ticketIdentifier);
            userTickets.push({
              id: ticketDoc.id,
              userId: userDoc.id,
              userEmail: userData.email,
              userName: userData.name,
              ...ticketData
            });
          }
        });
        
        return userTickets;
      });
      
      const ticketArrays = await Promise.all(ticketPromises);
      
      ticketArrays.forEach(tickets => {
        allTickets.push(...tickets);
      });
      
      // Also fetch In Stock tickets from dedicated collection
      const inStockRef = collection(db, 'mainData', 'Billuload', 'inStock');
      const inStockSnapshot = await getDocs(inStockRef);
      
      inStockSnapshot.docs.forEach(ticketDoc => {
        const ticketData = ticketDoc.data();
        const ticketIdentifier = ticketData.ticketNumber || ticketDoc.id;
        
        if (!seenTicketIds.has(ticketIdentifier)) {
          seenTicketIds.add(ticketIdentifier);
          allTickets.push({
            id: ticketDoc.id,
            ...ticketData
          });
        }
      });
      
      // Sort by creation date (newest first)
      allTickets.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
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
      showNotification('Error loading tickets. Please try again.', 'error');
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

  // Fetch technicians
  useEffect(() => {
    const techRef = getCollectionRef("technicians");
    const unsubscribe = onSnapshot(techRef, (snapshot) => {
      const techArray = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTechnicians(techArray);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = (id, userId) => {
    // Check if current admin is the one who created the ticket
    const currentUserId = getCurrentUserId();
    console.log('🔍 handleDelete - Permission check:', {
      currentUserId,
      currentUserIdType: typeof currentUserId,
      ticketUserId: userId,
      ticketUserIdType: typeof userId,
      strictMatch: currentUserId === userId,
      looseMatch: currentUserId == userId
    });
    
    // Only block if both IDs exist and don't match (using loose equality to handle string/number differences)
    if (currentUserId && userId && currentUserId != userId) {
      showNotification('You are not authorized to delete this ticket. Only the admin who created it can make changes.', 'warning');
      return;
    }
    setConfirmDialog({ isOpen: true, type: 'delete', ticketId: id, userId: userId });
  };

  const confirmDelete = async () => {
    try {
      // Use the ticket's userId (admin who created it) instead of current user
      const ticketUserId = confirmDialog.userId || getCurrentUserId();
      if (!ticketUserId) {
        throw new Error('User ID not found. Please login again.');
      }
      
      const userTicketRef = getAdminTicketDocRef(ticketUserId, confirmDialog.ticketId);

      await deleteDoc(userTicketRef);
      
      // Remove the ticket from local state immediately (no reload needed)
      setAllTickets(prevTickets => 
        prevTickets.filter(ticket => ticket.id !== confirmDialog.ticketId)
      );
      
      // Also remove from displayed tickets
      setDisplayedTickets(prevTickets => 
        prevTickets.filter(ticket => ticket.id !== confirmDialog.ticketId)
      );
      
      showNotification('Ticket deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      showNotification('Error deleting ticket. Please try again.', 'error');
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
      // Use the ticket's userId (admin who created it) instead of current user
      const ticketUserId = userId || getCurrentUserId();
      if (!ticketUserId) {
        throw new Error('User ID not found. Please login again.');
      }
      
      const userTicketRef = getAdminTicketDocRef(ticketUserId, id);
      await updateDoc(userTicketRef, { status: newStatus });
      
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
      // Use the ticket's userId (admin who created it) instead of current user
      const ticketUserId = confirmDialog.userId || getCurrentUserId();
      if (!ticketUserId) {
        throw new Error('User ID not found. Please login again.');
      }
      
      const resolvedAt = new Date().toISOString();
      const userTicketRef = getAdminTicketDocRef(ticketUserId, confirmDialog.ticketId);
      await updateDoc(userTicketRef, { 
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
      default: return "#6b7280";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending": return "⏳";
      case "In Progress": return "🔄";
      case "Resolved": return "✅";
      default: return "📋";
    }
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
      const categoryMatch = filterCategory 
        ? normalizeString(ticket.category) === normalizeString(filterCategory)
        : true;
      const dateMatch = filterTicketsByDate(ticket);
      const priorityMatch = selectedPriority ? ticket.priority === selectedPriority : true;
      const resolvedMatch = excludeResolved ? ticket.status !== 'Resolved' : true;
      return categoryMatch && dateMatch && priorityMatch && resolvedMatch;
    })
    .sort((a, b) => {
      // Sort by newest first (createdAt descending)
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

  // Get total count from all tickets (for display)
  const totalFilteredCount = allTickets
    .filter(ticket => {
      const categoryMatch = filterCategory 
        ? normalizeString(ticket.category) === normalizeString(filterCategory)
        : true;
      const dateMatch = filterTicketsByDate(ticket);
      const priorityMatch = selectedPriority ? ticket.priority === selectedPriority : true;
      const resolvedMatch = excludeResolved ? ticket.status !== 'Resolved' : true;
      return categoryMatch && dateMatch && priorityMatch && resolvedMatch;
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

              <div className="status-filter">
                <label htmlFor="priorityFilter" className="filter-label">
                  Priority:
                </label>
                <select
                  id="priorityFilter"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                </select>
              </div>
              

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
            </div>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <>
        <div className="tickets-grid">
          {filteredTickets.length > 0 ? (
            filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                className={`ticket-card priority-${ticket.priority?.toLowerCase() || "medium"}`}
              >
                <div className="ticket-header">
                  <div className="header-top">
                    <h3 className="ticket-number">#{ticket.ticketNumber}</h3>
                    <div 
                      className="status-badge" 
                      style={{ backgroundColor: getStatusColor(ticket.status) }}
                    >
                      <span className="status-icon">{getStatusIcon(ticket.status)}</span>
                      {ticket.status}
                    </div>
                  </div>
                </div>

                <div className="ticket-body">
                  <div className="info-section">
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
                  </div>

                  <div className="meta-section">
                    <div className="priority-info">
                      <span className="meta-label">Priority</span>
                      <div 
                        className="priority-tag"
                        style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                      >
                        {ticket.priority}
                      </div>
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
                  {(ticket.category === "Third Party" || ticket.category === "In Store") && ticket.note && (
                    <div className="ticket-note">
                      <span className="note-label">📝 Note:</span>
                      <span className="note-text">{ticket.note}</span>
                    </div>
                  )}
                </div>

                <div className="ticket-actions">
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
                    className="btn-delete"
                    onClick={() => handleDelete(ticket.id, ticket.userId)}
                    title="Delete ticket"
                  >
                    <span className="btn-icon">🗑</span>
                  </button>
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
                      <th>Ticket #</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Created By</th>
                      <th>Priority</th>
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
                      <tr key={ticket.id} className={`table-row priority-${ticket.priority?.toLowerCase() || "medium"}`}>
                        <td className="ticket-number-cell">#{ticket.ticketNumber}</td>
                        <td className="customer-cell">{ticket.customerName}</td>
                        <td className="product-cell">{ticket.productName}</td>
                        <td className="admin-cell">
                          {ticket.createdBy ? (
                            <span className="admin-name-table">👤 {ticket.createdBy}</span>
                          ) : (
                            <span className="admin-name-table unknown">Unknown</span>
                          )}
                        </td>
                        <td className="priority-cell">
                          <div 
                            className="priority-tag-small"
                            style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                          >
                            {ticket.priority}
                          </div>
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
                              className="btn-delete-small"
                              onClick={() => handleDelete(ticket.id, ticket.userId)}
                              title="Delete ticket"
                            >
                              🗑
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
                      <span className="mobile-ticket-number">#{ticket.ticketNumber}</span>
                      <div 
                        className="status-badge-small" 
                        style={{ backgroundColor: getStatusColor(ticket.status) }}
                      >
                        <span className="status-icon">{getStatusIcon(ticket.status)}</span>
                        {ticket.status}
                      </div>
                    </div>

                    <div className="mobile-card-body">
                      <div className="mobile-info-row">
                        <span className="mobile-info-label">Customer</span>
                        <span className="mobile-info-value">{ticket.customerName}</span>
                      </div>
                      <div className="mobile-info-row">
                        <span className="mobile-info-label">Product</span>
                        <span className="mobile-info-value">{ticket.productName}</span>
                      </div>
                      {ticket.createdBy && (
                        <div className="mobile-info-row">
                          <span className="mobile-info-label">Created By</span>
                          <span className="mobile-info-value admin-name">👤 {ticket.createdBy}</span>
                        </div>
                      )}
                      <div className="mobile-info-row">
                        <span className="mobile-info-label">Priority</span>
                        <div 
                          className="priority-tag-small"
                          style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                        >
                          {ticket.priority}
                        </div>
                      </div>
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
                        className="mobile-delete-btn"
                        onClick={() => handleDelete(ticket.id, ticket.userId)}
                        title="Delete ticket"
                      >
                        🗑
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
          {loadingMore && (
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
              <span>Loading next 9 tickets...</span>
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
        title={confirmDialog.type === 'delete' ? 'Delete Ticket' : 'Resolve Ticket'}
        message={
          confirmDialog.type === 'delete'
            ? 'Are you sure you want to delete this ticket?'
            : 'Are you sure you want to mark this ticket as resolved?'
        }
        onConfirm={confirmDialog.type === 'delete' ? confirmDelete : confirmResolve}
        onCancel={() => setConfirmDialog({ isOpen: false, type: '', ticketId: null })}
        confirmText="OK"
        cancelText="Cancel"
        type={confirmDialog.type === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  );
};

export default Tickets;