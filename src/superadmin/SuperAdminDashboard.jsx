import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "../firebase/config";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import initializeUserTickets from "../firebase/initializeUserTickets";
import resetUserPassword from "../firebase/resetUserPassword";
import AdminManagement from "./AdminManagement";
import DeleteTicketsByEmail from "../components/DeleteTicketsByEmail";
import "./SuperAdminDashboard.css";

export default function SuperAdminDashboard() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const navigate = useNavigate();
  const auth = getAuth();

  // Check super admin authentication (hardcoded system)
  useEffect(() => {
    const checkAuth = () => {
      const superAdmin = localStorage.getItem('superAdmin');
      if (superAdmin) {
        try {
          const adminData = JSON.parse(superAdmin);
          if (adminData.role === 'superadmin') {
            setIsAuthenticated(true);
            return;
          }
        } catch (error) {
          console.error('Invalid superAdmin data:', error);
        }
      }
      // Redirect to login if not authenticated as superadmin
      navigate('/login');
    };

    checkAuth();
  }, [navigate]);

  // Firestore paths
  const usersRef = collection(db, "mainData", "Billuload", "users");
  const adminRef = collection(db, "mainData", "Billuload", "Admin");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(usersRef);
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error loading users:", error);
      alert("Error loading users");
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
      console.log('🎯 SuperAdmin: Loading tickets from all users...');
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
      console.log(`🎯 SuperAdmin: Loaded ${allTickets.length} tickets from ${usersSnapshot.docs.length} users`);
    } catch (error) {
      console.error("Error loading tickets:", error);
    }
  };

  // Calculate points for each user based on their tickets
  const calculateUserPoints = (userName) => {
    const userTickets = tickets.filter(ticket => 
      ticket.userName === userName || 
      ticket.userEmail === userName ||
      ticket.assignedTo === userName ||
      ticket.subOption === userName
    );

    let totalPoints = 0;
    let completedTickets = 0;
    let totalTickets = userTickets.length;

    userTickets.forEach(ticket => {
      if (ticket.status === 'Completed' || ticket.status === 'Resolved') {
        completedTickets++;
        // Points based on category
        if (ticket.category === 'In Store') {
          totalPoints += 100;
        } else if (ticket.category === 'Third Party') {
          totalPoints += 150;
        } else if (ticket.category === 'Pickup') {
          totalPoints += 75;
        } else {
          totalPoints += 50;
        }
      }
    });

    return {
      totalPoints,
      completedTickets,
      totalTickets,
      pendingTickets: totalTickets - completedTickets
    };
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
      loadTickets();
    }
  }, [isAuthenticated]);

  const addUser = async () => {
    if (!name || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create user in Firebase Auth
      console.log("🔐 Creating user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log("✅ Firebase Auth user created:", firebaseUser.uid);

      // Step 2: Create user document in Firestore
      console.log("📝 Creating user document in Firestore...");
      const userDocRef = doc(db, "mainData", "Billuload", "users", firebaseUser.uid);
      
      const userData = {
        name: name,
        email: email,
        role: role,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: "superadmin"
      };

      await setDoc(userDocRef, userData);
      console.log("✅ User document created in Firestore");

      // Step 3: Initialize tickets subcollection
      console.log("🎫 Initializing tickets subcollection...");
      const ticketsCollectionRef = collection(db, "mainData", "Billuload", "users", firebaseUser.uid, "tickets");
      
      // Create placeholder ticket to initialize the subcollection
      await addDoc(ticketsCollectionRef, {
        isPlaceholder: true,
        createdAt: new Date().toISOString(),
        note: "Placeholder ticket to initialize subcollection - can be deleted when real tickets are added"
      });
      
      console.log("✅ Tickets subcollection initialized");

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setRole("admin");
      
      // Reload users
      loadUsers();
      
      alert(`✅ User created successfully!\n\n` +
            `👤 Name: ${name}\n` +
            `📧 Email: ${email}\n` +
            `🔑 Role: ${role}\n` +
            `🎫 Tickets subcollection: Initialized\n` +
            `🔐 Firebase Auth: Created`);
      
    } catch (error) {
      console.error("Error adding user:", error);
      
      let errorMessage = "Error creating user: ";
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

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const userDoc = doc(db, "mainData", "Billuload", "users", userId);
      await updateDoc(userDoc, { active: !currentStatus });
      loadUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Error updating user status");
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const userDoc = doc(db, "mainData", "Billuload", "users", userId);
        await deleteDoc(userDoc);
        loadUsers();
        alert("User deleted successfully");
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Error deleting user");
      }
    }
  };

  const handleResetPassword = async (userEmail) => {
    if (window.confirm(`🔐 Send password reset email to ${userEmail}?`)) {
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

  const handleLogout = async () => {
    try {
      // Clear super admin data and redirect to login
      localStorage.removeItem("superAdmin");
      console.log("✅ Super Admin logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("❌ Error logging out");
    }
  };

  const handleInitializeUserTickets = async () => {
    if (window.confirm("🚀 This will initialize tickets subcollection for all users and fix login issues. Continue?")) {
      try {
        setLoading(true);
        const results = await initializeUserTickets();
        
        const message = `✅ Initialization completed!\n\n` +
          `📊 Results:\n` +
          `• Total users: ${results.totalUsers}\n` +
          `• Users with existing tickets: ${results.usersWithTickets}\n` +
          `• Users initialized: ${results.usersInitialized}\n` +
          `• Users fixed: ${results.usersFixed}\n` +
          `• Errors: ${results.errors.length}`;
        
        alert(message);
        
        // Reload users to see updates
        loadUsers();
      } catch (error) {
        console.error("Initialize error:", error);
        alert("❌ Error during initialization: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };



  const filteredUsers = users.filter(user =>
    (user.name ?? "").toLowerCase().includes((searchTerm ?? "").toLowerCase()) ||
    (user.email ?? "").toLowerCase().includes((searchTerm ?? "").toLowerCase())
  );

  // Show loading screen while checking authentication
  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Checking authentication...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        <div style={{
          padding: '2rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '1.5rem' }}>👑</span>
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            margin: '0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>Super Admin Dashboard</h2>
        </div>
        
        <nav style={{ padding: '1rem 0' }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              color: 'white',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              borderLeft: '3px solid white',
              background: 'rgba(255,255,255,0.15)'
            }}
          >
            <span style={{ marginRight: '0.75rem', fontSize: '1.1rem' }}>👨‍💼</span>
            <span style={{ fontWeight: '500' }}>Admin Management</span>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div style={{ marginLeft: '280px', flex: '1', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <header style={{
          background: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: '0',
          zIndex: '100'
        }}>
          <h1 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#1e293b' }}>
            Admin Management
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={handleLogout}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div style={{ padding: '2rem', flex: '1' }}>

      {/* Admin Management Tab */}
      <AdminManagement />
        </div>
      </div>

      {/* Delete Tickets Modal */}
      {showDeleteModal && (
        <DeleteTicketsByEmail onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}
