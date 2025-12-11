import React, { useState } from 'react';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Notification from './Notification';
import useNotification from '../hooks/useNotification';
import './TechManagement/TechForm.css';

const AddInStockProduct = ({ onBack, onProductAdded }) => {
  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    brand: '',
    model: '',
    callNo: '',
    defectType: '',
    quantity: '1',
    reportedBy: '',
    description: '',
    dateReported: new Date().toISOString().split('T')[0]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notification, showNotification, hideNotification } = useNotification();

  const defectTypes = [
    'Hardware Failure',
    'Software Issue',
    'Physical Damage',
    'Manufacturing Defect',
    'Water Damage',
    'Battery Issue',
    'Display Problem',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getCurrentUserId = () => {
    try {
      const currentAdmin = localStorage.getItem('currentAdmin');
      const superAdmin = localStorage.getItem('superAdmin');

      if (currentAdmin) {
        const adminData = JSON.parse(currentAdmin);
        return adminData?.uid;
      }

      if (superAdmin) {
        const adminData = JSON.parse(superAdmin);
        return adminData?.uid;
      }

      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
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

  const generateTicketNumber = async () => {
    try {
      // Get current user ID
      const userId = getCurrentUserId();
      
      if (!userId) {
        console.error('No user ID found');
        return "1";
      }

      // Query all tickets from the user's collection to find the highest ticket number
      const ticketsRef = collection(db, 'mainData', 'Billuload', 'users', userId, 'tickets');
      const ticketsSnapshot = await getDocs(ticketsRef);
      
      let maxTicketNumber = 0;
      ticketsSnapshot.forEach((doc) => {
        const ticketNum = parseInt(doc.data().ticketNumber);
        if (!isNaN(ticketNum) && ticketNum > maxTicketNumber) {
          maxTicketNumber = ticketNum;
        }
      });
      
      // Also check In Stock collection
      const inStockRef = collection(db, 'mainData', 'Billuload', 'inStock');
      const inStockSnapshot = await getDocs(inStockRef);
      
      inStockSnapshot.forEach((doc) => {
        const ticketNum = parseInt(doc.data().ticketNumber);
        if (!isNaN(ticketNum) && ticketNum > maxTicketNumber) {
          maxTicketNumber = ticketNum;
        }
      });
      
      // Return next sequential number
      return (maxTicketNumber + 1).toString();
    } catch (error) {
      console.error('Error generating ticket number:', error);
      return Date.now().toString(); // Fallback to timestamp if error
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.productName || !formData.defectType) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated. Please login again.');
      }

      const generatedTicketNumber = await generateTicketNumber();
      
      const ticketData = {
        ticketNumber: generatedTicketNumber,
        category: 'In Stock',
        status: 'Pending',
        productName: formData.productName,
        productCode: formData.productCode || 'N/A',
        brand: formData.brand || 'N/A',
        model: formData.model || 'N/A',
        callNo: formData.callNo || generatedTicketNumber,
        defectType: formData.defectType,
        quantity: parseInt(formData.quantity) || 1,
        reportedBy: formData.reportedBy || getCurrentUserName(),
        description: formData.description || 'No description provided',
        dateReported: formData.dateReported,
        createdAt: new Date().toISOString(),
        createdBy: getCurrentUserName(),
        userId: userId,
        customerName: 'In Stock'
      };

      try {
        // Save to inStock collection (matching actual Firebase structure)
        const inStockRef = collection(db, 'mainData', 'Billuload', 'inStock');
        await addDoc(inStockRef, ticketData);
        
        // Also save to user's tickets collection for unified access
        const userTicketsRef = collection(db, 'mainData', 'Billuload', 'users', userId, 'tickets');
        await addDoc(userTicketsRef, ticketData);

        showNotification('Defective product added to In Stock successfully!', 'success');
      } catch (saveError) {
        console.error('❌ Error saving In Stock product to Firestore:', saveError);
        
        if (saveError.code === 'permission-denied') {
          showNotification('Permission denied. Please contact administrator to fix Firestore access.', 'error');
        } else {
          showNotification('Error saving product. Please try again or contact support.', 'error');
        }
        
        setIsSubmitting(false);
        return;
      }
      
      setTimeout(() => {
        if (onProductAdded) {
          onProductAdded();
        }
        if (onBack) {
          onBack();
        }
      }, 1500);

    } catch (error) {
      console.error('Error adding in-stock product:', error);
      showNotification('Error adding product. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tech-form-page">
      <div className="technicians-header">
        <button className="btn-primary" onClick={onBack}>
          ← Back
        </button>
        <h1>Add Defective Product to In Stock</h1>
      </div>

      <div className="tech-form-container">
        <div className="tech-form-card">
          <form onSubmit={handleSubmit} className="tech-form">
            <h2 style={{ marginBottom: '20px', color: '#2c3e50', fontSize: '1.3rem' }}>Product Information</h2>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ opacity: 0.7 }}>Product Code / Serial Number</label>
                <input
                  type="text"
                  name="productCode"
                  value={formData.productCode}
                  onChange={handleInputChange}
                  placeholder="Enter product code"
                />
              </div>

              <div className="form-group">
                <label style={{ opacity: 0.7 }}>Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="Enter brand name"
                />
              </div>

              <div className="form-group">
                <label style={{ opacity: 0.7 }}>Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="Enter model"
                />
              </div>

              <div className="form-group">
                <label style={{ opacity: 0.7 }}>Call No</label>
                <input
                  type="text"
                  name="callNo"
                  value={formData.callNo}
                  onChange={handleInputChange}
                  placeholder="Enter call number"
                />
              </div>
            </div>

            <h2 style={{ marginTop: '30px', marginBottom: '20px', color: '#2c3e50', fontSize: '1.3rem' }}>Defect Details</h2>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Defect Type</label>
                <select
                  name="defectType"
                  value={formData.defectType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select defect type</option>
                  {defectTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ opacity: 0.7 }}>Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="1"
                />
              </div>

              <div className="form-group">
                <label style={{ opacity: 0.7 }}>Reported By</label>
                <input
                  type="text"
                  name="reportedBy"
                  value={formData.reportedBy}
                  onChange={handleInputChange}
                  placeholder="Enter reporter name (optional)"
                />
              </div>

              <div className="form-group">
                <label style={{ opacity: 0.7 }}>Date Reported</label>
                <input
                  type="date"
                  name="dateReported"
                  value={formData.dateReported}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group full-width">
                <label style={{ opacity: 0.7 }}>Description / Notes</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Describe the defect in detail..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add to In Stock'}
              </button>
              <button 
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
};

export default AddInStockProduct;
