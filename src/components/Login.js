// src/components/Login.js
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // --------------------------------------------
      // SUPERADMIN LOGIN HANDLING
      // --------------------------------------------
      if (email.toLowerCase() === 'akshay@gmail.com') {
        const superAdminData = {
          email: user.email,
          uid: user.uid,
          role: 'superadmin'
        };
        
        localStorage.setItem('superAdmin', JSON.stringify(superAdminData));
        
        // Create/update superadmin user document
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase/config');
          const userDocRef = doc(db, 'mainData', 'Billuload', 'users', user.uid);
          
          await setDoc(userDocRef, {
            email: user.email,
            uid: user.uid,
            role: 'superadmin',
            name: 'Super Admin',
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          console.log('✅ Superadmin document created/updated');
        } catch (error) {
          console.error('⚠️ Error creating superadmin document:', error);
        }

        setTimeout(() => {
          navigate('/superadmin');
        }, 100);

        return; // prevent normal admin flow
      }

      // --------------------------------------------
      // NORMAL ADMIN LOGIN HANDLING (IMPORTANT!)
      // --------------------------------------------
      const adminData = {
        email: user.email,
        uid: user.uid,
        role: 'admin'
      };
      
      localStorage.setItem('currentAdmin', JSON.stringify(adminData));
      
      // Create/update user document in Firestore to ensure it exists
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        const userDocRef = doc(db, 'mainData', 'Billuload', 'users', user.uid);
        
        await setDoc(userDocRef, {
          email: user.email,
          uid: user.uid,
          role: 'admin',
          name: user.displayName || user.email.split('@')[0],
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true }); // merge: true ensures we don't overwrite existing data
        
        console.log('✅ User document created/updated for:', user.email);
      } catch (error) {
        console.error('⚠️ Error creating user document:', error);
        // Don't block login if this fails
      }

      // Auth state listener in App.js handles redirect

    } catch (error) {
      if (isMounted) {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-bg">
      <div className="login-box">
        <div className="login-logo">Navratna Distributors</div>
        <h2>Log in to your account</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            disabled={loading}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        
      </div>
    </div>
  );
};

export default Login;
