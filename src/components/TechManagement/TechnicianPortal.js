import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onSnapshot, getDocs, collection } from "firebase/firestore";
import { getCollectionRef, db } from "../../firebase/config";
import CustomerHistory from "./CustomerHistory";
import Loader from "../Loader";
import "./TechnicianPortal.css";

const TechnicianPortal = () => {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState([]);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInTech, setLoggedInTech] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedDate, setSelectedDate] = useState("");
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  useEffect(() => {
    // Fetch technicians
    const techRef = getCollectionRef("technicians");
    const unsubscribeTech = onSnapshot(techRef, (snapshot) => {
      const techArray = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTechnicians(techArray);
    });

    // Fetch tickets from all admin collections
    const loadAllTickets = async () => {
      try {
        setIsLoadingTickets(true);
        console.log('🎯 TechnicianPortal: Loading tickets from all admins...');
        const usersRef = getCollectionRef("users");
        const usersSnapshot = await getDocs(usersRef);
        const allTickets = [];
        
        for (const userDoc of usersSnapshot.docs) {
          const userTicketsRef = collection(db, 'mainData', 'Billuload', 'users', userDoc.id, 'tickets');
          const ticketsSnapshot = await getDocs(userTicketsRef);
          
          ticketsSnapshot.docs.forEach(ticketDoc => {
            allTickets.push({
              id: ticketDoc.id,
              userId: userDoc.id,
              userEmail: userDoc.data().email,
              ...ticketDoc.data()
            });
          });
        }
        
        console.log(`🎯 TechnicianPortal: Loaded ${allTickets.length} tickets from ${usersSnapshot.docs.length} admins`);
        setTickets(allTickets);
        setIsLoadingTickets(false);
      } catch (error) {
        console.error("Error loading tickets:", error);
        setIsLoadingTickets(false);
        // Fallback to main tickets collection
        const ticketsRef = getCollectionRef("tickets");
        const unsubscribeTickets = onSnapshot(ticketsRef, (snapshot) => {
          const ticketsArray = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTickets(ticketsArray);
        });
        return unsubscribeTickets;
      }
    };

    loadAllTickets();
    
    // Set up interval to refresh tickets every 30 seconds
    const ticketInterval = setInterval(loadAllTickets, 30000);
    
    const unsubscribeTickets = () => {
      clearInterval(ticketInterval);
    };

    // Fetch customer transactions
    const transactionsRef = getCollectionRef("customerTransactions");
    const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const transactionsArray = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomerTransactions(transactionsArray);
    });

    return () => {
      unsubscribeTech();
      unsubscribeTickets();
      unsubscribeTransactions();
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    // Find technician with matching credentials
    const authenticatedTech = technicians.find(
      (tech) => tech.userId === userId && tech.password === password
    );

    if (authenticatedTech) {
      setIsAuthenticated(true);
      setLoggedInTech(authenticatedTech);
    } else {
      setError("Invalid User ID or Password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoggedInTech(null);
    setUserId("");
    setPassword("");
    setError("");
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="tech-portal-login">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <h1>🔧 Technician Portal</h1>
              <p>Access your tickets and customer history</p>
            </div>

            <form onSubmit={handleLogin} className="portal-login-form">
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label>User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your user ID"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button type="submit" className="btn-login">
                Login
              </button>
            </form>

            <div className="login-footer">
              <button 
                className="btn-back-admin" 
                onClick={() => navigate('/dashboard')}
              >
                ← Back to Admin Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Technician Dashboard - Filter tickets assigned to this technician
  let techTickets = tickets.filter(ticket => {
    // Check if ticket is assigned to this technician
    const isAssignedToTech = (
      ticket.subOption === loggedInTech.name || 
      ticket.assignedTo === loggedInTech.name ||
      ticket.assignedTo === loggedInTech.id
    );
    
    // Only show tickets for categories where technicians are assigned (In Store & Third Party)
    const isValidCategory = ticket.category === "In Store" || ticket.category === "Third Party";
    
    // Debug logging (commented out to reduce console spam)
    // if (isAssignedToTech) {
    //   console.log(`🎯 Ticket ${ticket.ticketNumber || ticket.id} assigned to ${loggedInTech.name}:`, {
    //     category: ticket.category,
    //     subOption: ticket.subOption,
    //     assignedTo: ticket.assignedTo,
    //     isValidCategory,
    //     willShow: isAssignedToTech && isValidCategory
    //   });
    // }
    
    return isAssignedToTech && isValidCategory;
  });

  // console.log(`📊 ${loggedInTech.name} has ${techTickets.length} assigned tickets:`, 
  //   techTickets.map(t => ({ 
  //     id: t.ticketNumber || t.id, 
  //     category: t.category, 
  //     customer: t.customerName,
  //     assignedTo: t.subOption || t.assignedTo
  //   }))
  // );

  // Calculate wallet balance
  const inStoreTotal = techTickets.reduce((sum, ticket) => {
    if (ticket.category === "In Store") {
      const serviceAmount = parseFloat(ticket.serviceAmount) || 0;
      const commissionAmount = parseFloat(ticket.commissionAmount) || 0;
      return sum + (serviceAmount - commissionAmount);
    }
    return sum;
  }, 0);

  const thirdPartyCommissions = techTickets.reduce((sum, ticket) => {
    if (ticket.category === "Third Party") {
      const commissionAmount = parseFloat(ticket.commissionAmount) || 0;
      return sum + commissionAmount;
    }
    return sum;
  }, 0);

  const totalTicketAmount = inStoreTotal - thirdPartyCommissions;

  let customerBalance = 0;
  if (techTickets.length > 0) {
    const customerTrans = customerTransactions.filter(trans => trans.technicianId === loggedInTech.id);
    const credits = customerTrans.filter(t => t.type === 'credit').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const debits = customerTrans.filter(t => t.type === 'debit').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    customerBalance = totalTicketAmount + credits - debits;
  }

  // Filter tickets by date
  const filterTicketsByDate = (ticket) => {
    if (!selectedDate) return true;
    const ticketDate = new Date(ticket.createdAt);
    const filterDate = new Date(selectedDate);
    return ticketDate.getFullYear() === filterDate.getFullYear() &&
           ticketDate.getMonth() === filterDate.getMonth() &&
           ticketDate.getDate() === filterDate.getDate();
  };

  // Apply all filters
  techTickets = techTickets.filter(ticket => {
    const categoryMatch = categoryFilter === "All" || ticket.category === categoryFilter;
    const statusMatch = statusFilter === "All Status" || ticket.status === statusFilter;
    const dateMatch = filterTicketsByDate(ticket);
    return categoryMatch && statusMatch && dateMatch;
  });

  if (showHistory) {
    return (
      <div className="tech-portal-dashboard">
        <CustomerHistory
          technician={loggedInTech}
          transactions={customerTransactions}
          onClose={() => setShowHistory(false)}
        />
      </div>
    );
  }

  // Show loader while loading tickets
  if (isLoadingTickets && isAuthenticated) {
    return (
      <div className="tech-portal-dashboard">
        <Loader message="Loading tickets..." size="large" />
      </div>
    );
  }

  return (
    <div className="tech-portal-dashboard">
      <div className="portal-header">
        <div className="portal-title">
          <h1>🔧 {loggedInTech.name}'s Dashboard</h1>
          <p>User ID: {loggedInTech.userId}</p>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="tech-info-card">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Phone:</span>
            <span className="info-value">{loggedInTech.phone}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Skills:</span>
            <span className="info-value">
              {Array.isArray(loggedInTech.skills) 
                ? loggedInTech.skills.join(", ") 
                : loggedInTech.skills}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Wallet Balance:</span>
            <span className="wallet-balance">₹{customerBalance.toFixed(2)}</span>
          </div>
          <div className="info-item">
            <button className="btn-transactions" onClick={() => setShowHistory(true)}>
              📜 View Transactions
            </button>
          </div>
        </div>
      </div>

      <div className="tickets-section">
        <div className="tickets-header">
          <div className="header-main">
            <h2>My Assigned Tickets ({techTickets.length})</h2>
          </div>
          
          <div className="filter-buttons-container">
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${categoryFilter === "All" ? "active" : ""}`}
                onClick={() => setCategoryFilter("All")}
              >
                All
              </button>
              <button 
                className={`filter-btn ${categoryFilter === "In Store" ? "active" : ""}`}
                onClick={() => setCategoryFilter("In Store")}
              >
                In Store
              </button>
              <button 
                className={`filter-btn ${categoryFilter === "Third Party" ? "active" : ""}`}
                onClick={() => setCategoryFilter("Third Party")}
              >
                Third Party
              </button>
            </div>
            
            <div className="filter-controls-right">
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
                  <option value="All Status">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
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

        {techTickets.length > 0 ? (
          <div className="tickets-grid">
            {techTickets.map(ticket => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-header">
                  <span className="ticket-id">#{ticket.ticketId || ticket.id.substring(0, 8)}</span>
                  <span className={`ticket-status ${ticket.status}`}>{ticket.status}</span>
                </div>
                <div className="ticket-body">
                  <div className="ticket-row">
                    <span className="label">Customer</span>
                    <span className="value">{ticket.customerName}</span>
                  </div>
                  <div className="ticket-row">
                    <span className="label">Product</span>
                    <span className="value">{ticket.productName}</span>
                  </div>
                  {ticket.issueType && (
                    <div className="ticket-row">
                      <span className="label">Issue Type</span>
                      <span className="value">{ticket.issueType}</span>
                    </div>
                  )}
                  {ticket.serviceAmount && (
                    <div className="ticket-row">
                      <span className="label">Service Amount</span>
                      <span className="value">₹{parseFloat(ticket.serviceAmount).toLocaleString()}</span>
                    </div>
                  )}
                  {ticket.commissionAmount && (
                    <div className="ticket-row">
                      <span className="label">Commission</span>
                      <span className="value">₹{parseFloat(ticket.commissionAmount).toLocaleString()}</span>
                    </div>
                  )}
                  {ticket.category === "In Store" && ticket.serviceAmount && (
                    <div className="ticket-row">
                      <span className="label">Total Amt (In Store)</span>
                      <span className="value total-amount">₹{parseFloat(ticket.serviceAmount).toLocaleString()}</span>
                    </div>
                  )}
                  
                  {ticket.priority && (
                    <div className="ticket-row">
                      <span className="label">Priority</span>
                      <div className="priority-container">
                        <span className={`priority-badge ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="ticket-row date-info">
                    <span className="label">Start</span>
                    <span className="value start-date">
                      {ticket.createdAt 
                        ? new Date(ticket.createdAt).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })
                        : 'Not set'
                      }
                    </span>
                  </div>
                  <div className="ticket-row date-info">
                    <span className="label">End</span>
                    <span className="value end-date">
                      {ticket.endDate 
                        ? new Date(ticket.endDate).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })
                        : 'Not set'
                      }
                    </span>
                  </div>
                  
                  <div className="ticket-row assigned-section">
                    <span className="label">Assigned To</span>
                    <div className="assigned-info">
                      <span className="value">{ticket.assignedTo || loggedInTech?.name}</span>
                      {ticket.category && (
                        <span className="category-badge">{ticket.category}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No tickets assigned yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianPortal;
