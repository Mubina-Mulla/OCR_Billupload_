import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminManagement from "./AdminManagement";
import "./SuperAdminDashboard.css";

export default function SuperAdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const navigate = useNavigate();

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
    </div>
  );
}
