// src/superadmin/AdminManagement.jsx
import React, { useState, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { addAdminUnderSuperAdmin } from "../firebase/addAdminUnderSuperAdmin";
import { getAdminsUnderSuperAdmin } from "../firebase/getSuperAdminAdmins";
import { updateAdminUnderSuperAdmin } from "../firebase/updateAdminUnderSuperAdmin";
import { deleteAdminUnderSuperAdmin } from "../firebase/deleteAdminUnderSuperAdmin";
import resetUserPassword from "../firebase/resetUserPassword";

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const activeView = 'admins'; // Always show admins only
  
  // Note: Only admins state is used in this simplified component, but function references remain
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [showAddForm, setShowAddForm] = useState(false);

  const auth = getAuth();

  // Load data on component mount
  useEffect(() => {
    loadAdmins();
    loadTickets();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await getAdminsUnderSuperAdmin();
      setAdmins(data);
    } catch (error) {
      console.error("Error loading admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      console.log('🎯 Loading tickets from all users...');
      const usersRef = collection(db, "mainData", "Billuload", "users");
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
            userName: userDoc.data().name,
            ...ticketDoc.data()
          });
        });
      }
      
      setTickets(allTickets);
      console.log(`✅ Loaded ${allTickets.length} tickets from ${usersSnapshot.docs.length} users`);
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };

  // Calculate points for a single ticket based on resolution time
  // RULE: 100 points if resolved within 24 hours, subtract 10 points per day after
  const calculateTicketPoints = (createdAt, endDate) => {
    console.log('🔢 calculateTicketPoints called with:', { createdAt, endDate });
    
    if (!createdAt || !endDate) {
      console.log('   ⚠️ Missing required fields:', { createdAt: !!createdAt, endDate: !!endDate });
      return 0;
    }

    try {
      const startDate = new Date(createdAt);
      const resolvedDate = new Date(endDate);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(resolvedDate.getTime())) {
        console.log('   ❌ Invalid date format');
        return 0;
      }

      // Calculate time difference
      const diffMs = resolvedDate - startDate;
      const diffHours = diffMs / (1000 * 60 * 60);

      console.log(`   ⏱️ Time taken: ${diffHours.toFixed(2)} hours (${(diffHours / 24).toFixed(2)} days)`);

      // RULE 1: Resolved within 24 hours → 100 points
      if (diffHours <= 24) {
        console.log('   ✅ RULE 1: Resolved within 24 hours → 100 points');
        return 100;
      }

      // RULE 2: After 24 hours → subtract 10 points per extra day
      const extraHours = diffHours - 24;
      const extraDays = Math.ceil(extraHours / 24); // round up full days

      let points = 100 - (extraDays * 10);

      // Do not allow negative points
      if (points < 0) points = 0;

      console.log(`   ⚠️ RULE 2: ${extraDays} days late → ${points} points (100 - ${extraDays * 10})`);

      return points;
    } catch (error) {
      console.error("Error calculating ticket points:", error);
      return 0;
    }
  };

  // Calculate points for admins based on ALL tickets (resolved AND pending)
  const calculateAdminPoints = (adminEmail) => {
    // Find tickets assigned to this admin
    const adminTickets = tickets.filter(ticket => 
      ticket.userEmail === adminEmail || 
      ticket.userName === adminEmail ||
      ticket.createdBy === adminEmail
    );

    let totalPoints = 0;
    let resolvedTickets = 0;
    let totalTickets = adminTickets.length;
    let ticketBreakdown = []; // For debugging

    console.log(`🔍 Calculating points for admin: ${adminEmail}`);
    console.log(`📋 Found ${adminTickets.length} tickets for this admin`);

    adminTickets.forEach(ticket => {
      console.log(`🎫 Processing ticket:`, {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        createdAt: ticket.createdAt,
        endDate: ticket.endDate,
        resolvedAt: ticket.resolvedAt,
        resolvedDate: ticket.resolvedDate,
        createdBy: ticket.createdBy
      });
      
      // Only count RESOLVED tickets for points
      if (ticket.status === 'Resolved') {
        resolvedTickets++;
        
        const createdAt = ticket.createdAt;
        // Use endDate if available, otherwise fall back to resolvedAt or resolvedDate
        const endDate = ticket.endDate || ticket.resolvedAt || ticket.resolvedDate;
        
        console.log(`✅ Resolved Ticket #${ticket.ticketNumber || ticket.id}:`, {
          createdAt,
          endDate,
          usingFallback: !ticket.endDate,
          status: ticket.status
        });
        
        const ticketPoints = calculateTicketPoints(createdAt, endDate);
        console.log(`   → Points: ${ticketPoints}`);
        
        totalPoints += ticketPoints;
        
        if (createdAt && endDate) {
          const created = new Date(createdAt);
          const resolved = new Date(endDate);
          const diffMs = resolved - created;
          const diffHours = diffMs / (1000 * 60 * 60);
          
          ticketBreakdown.push({
            ticketId: ticket.ticketNumber || ticket.id.substring(0, 8),
            status: 'Resolved',
            hours: diffHours.toFixed(1),
            points: ticketPoints
          });
        }
      }
    });

    console.log(`📊 Admin ${adminEmail} ticket breakdown:`, ticketBreakdown);
    console.log(`💯 Total Points for ${adminEmail}: ${totalPoints} (from ${resolvedTickets} resolved tickets)`);

    return {
      totalPoints,
      resolvedTickets,
      totalTickets,
      pendingTickets: totalTickets - resolvedTickets
    };
  };

  const addPerson = async () => {
    if (!name || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      console.log("🔐 Creating user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log("✅ Firebase Auth user created:", firebaseUser.uid);

      // Add to Admin collection
      const result = await addAdminUnderSuperAdmin({
          adminId: firebaseUser.uid,
          name: name,
          email: email,
          role: role,
          active: true,
          createdAt: new Date().toISOString()
        });
        
      if (result.success) {
        loadAdmins();
        alert(`✅ Admin created successfully!\n\nSaved to: /Admin/9XNRK9GmaMQviOrWhGeqawkoYg43/admins/`);
      }
      
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setRole("admin");
      setShowAddForm(false);
      
    } catch (error) {
      console.error("Error adding person:", error);
      
      let errorMessage = "Error: ";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage += "Email is already in use";
      } else if (error.code === 'auth/weak-password') {
        errorMessage += "Password is too weak (minimum 6 characters)";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += "Invalid email address";
      } else {
        errorMessage += error.message;
      }
      
      alert("❌ " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

    // eslint-disable-next-line no-unused-vars
  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const result = await updateAdminUnderSuperAdmin(userId, { active: !currentStatus });
      if (result.success) loadAdmins();
    } catch (error) {
      console.error("Error toggling status:", error);
      alert("Error updating status");
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete admin "${name}"?`)) {
      try {
        const result = await deleteAdminUnderSuperAdmin(id);
        if (result.success) {
          loadAdmins();
          alert("Admin deleted successfully");
        }
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Error deleting admin");
      }
    }
  };

  const handleResetPassword = async (userEmail) => {
    if (window.confirm(`Send password reset email to ${userEmail}?`)) {
      try {
        const result = await resetUserPassword(userEmail);
        if (result.success) {
          alert(`✅ ${result.message}`);
        } else {
          alert(`❌ ${result.error}`);
        }
      } catch (error) {
        console.error("Password reset error:", error);
        alert("❌ Error sending password reset email");
      }
    }
  };

  const currentData = admins;
  const filteredData = currentData.filter(item =>
    (item.name ?? "").toLowerCase().includes((searchTerm ?? "").toLowerCase()) ||
    (item.email ?? "").toLowerCase().includes((searchTerm ?? "").toLowerCase())
  );

  return (
    <div>
      {/* Admin Management Header - No Tabs */}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {showAddForm ? '❌ Cancel' : `➕ Add New ${activeView === 'admins' ? 'Admin' : 'User'}`}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0 }}>Add New Admin</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Enter full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Email *
              </label>
              <input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Password *
              </label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
              >
                <option value="admin">👑 Admin</option>
              </select>
            </div>
          </div>

          <button
            onClick={addPerson}
            disabled={loading || !name || !email || !password}
            style={{
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Creating..." : `Create ${activeView === 'admins' ? 'Admin' : 'User'}`}
          </button>
        </div>
      )}

      {/* List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>
            All Admins ({currentData.length})
          </h3>
          <input
            type="text"
            placeholder="Search admins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              width: '250px'
            }}
          />
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            Loading...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600' }}>Points</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600'
                        }}>
                          {(item.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        {item.name ?? "No Name"}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>{item.email ?? "No Email"}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {(() => {
                        // Calculate admin points - ONLY from resolved tickets
                        const pointsData = calculateAdminPoints(item.email);
                        
                        // Only show points if there are resolved tickets
                        const hasResolvedTickets = pointsData.resolvedTickets > 0;
                        
                        // Calculate average ONLY from resolved tickets
                        const avgPoints = hasResolvedTickets
                          ? pointsData.totalPoints / pointsData.resolvedTickets 
                          : 0;
                        
                        let performanceClass = 'high-performance';
                        
                        // Performance thresholds based on resolved tickets
                        // High: avg >= 80 (mostly within 24h)
                        // Medium: avg 40-79 (some delays)
                        // Low: avg < 40 (frequent delays)
                        if (avgPoints < 40) {
                          performanceClass = 'low-performance';
                        } else if (avgPoints < 80) {
                          performanceClass = 'medium-performance';
                        }
                        
                        return (
                          <div style={{ fontSize: '0.875rem' }}>
                            {hasResolvedTickets ? (
                              <>
                                <div style={{
                                  fontWeight: '600',
                                  color: performanceClass === 'high-performance' ? '#059669' : 
                                         performanceClass === 'medium-performance' ? '#d97706' : '#dc2626'
                                }}>
                                  {pointsData.totalPoints} pts
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                  {pointsData.resolvedTickets}/{pointsData.totalTickets} resolved
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                  Avg: {Math.round(avgPoints)} pts/ticket
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontWeight: '600', color: '#9ca3af' }}>
                                  0 pts
                                </div>
                                <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                                  0/{pointsData.totalTickets} resolved
                                </div>
                                <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                                  No resolved tickets
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleResetPassword(item.email)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            background: '#3b82f6',
                            color: 'white'
                          }}
                        >
                          🔐 Reset Password
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            background: '#dc2626',
                            color: 'white'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <p>No admins found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
