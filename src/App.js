import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import ServiceCenter from './components/ServiceCenter';
import TechManagement from './components/TechManagement/TechManagement';
import TechnicianPortal from './components/TechManagement/TechnicianPortal';
import Tickets from './components/Tickets';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ConnectionStatus from './components/ConnectionStatus';
import SuperAdminDashboard from './superadmin/SuperAdminDashboard';
import SetupTestData from './pages/SetupTestData';
import './App.css';

// --------------------------------------------------------
// Main Layout Component
// --------------------------------------------------------
const MainLayout = ({ user, handleLogout, stats }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div className="app">
      <ConnectionStatus />
      <Sidebar 
        currentPath={location.pathname}
        onNavigate={handleNavigation}
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        onClose={closeMobileSidebar}
      />
      <div className={`main-content ${isMobile ? 'mobile' : (sidebarCollapsed ? 'collapsed' : '')}`}>
        <Header 
          user={user} 
          handleLogout={handleLogout} 
          toggleSidebar={toggleSidebar} 
          isMobile={isMobile}
          currentPath={location.pathname}
          onNavigate={handleNavigation}
        />

        <div className="content">
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard stats={stats} />} />
            <Route path="/dashboard" element={<Dashboard stats={stats} />} />
            
            {/* Customer Management */}
            <Route path="/customers" element={<CustomerManagement />} />
            <Route path="/customers/:customerId" element={<CustomerManagement />} />
            <Route path="/customers/:customerId/products/:productId" element={<CustomerManagement />} />
            
            {/* Service Centers */}
            <Route path="/services" element={<ServiceCenter />} />
            <Route path="/services/:serviceId" element={<ServiceCenter />} />
            
            {/* Technicians */}
            <Route path="/tech" element={<TechManagement />} />
            <Route path="/tech/:techId" element={<TechManagement />} />
            
            {/* Tickets */}
            <Route path="/tickets" element={<Tickets />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats] = useState({
    customers: 0,
    products: 0,
    services: 0,
    tech: 0,
    tickets: 0,
    pendingTickets: 0,
    completedTickets: 0
  });

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false); // Auth state has been checked
    });

    // Disable stats listeners to prevent Firestore internal errors
    // These listeners can cause conflicts and internal assertion failures
    // Stats will be loaded on-demand instead
    
    return () => {
      unsubscribe();
    };
  }, [auth]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
    }).catch((error) => {
      console.error('Logout error:', error);
    });
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/technician-portal" element={<TechnicianPortal />} />
        <Route path="/setup-test-data" element={<SetupTestData />} />
        <Route path="/superadmin" element={<SuperAdminDashboard />} />
        <Route
          path="/*"
          element={
            user ? (
              <MainLayout user={user} handleLogout={handleLogout} stats={stats} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
