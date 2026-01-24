import React, { useState, useEffect } from 'react';
import { addDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { getCollectionRef, getDocRef } from '../firebase/config';
import AddProduct from './AddProduct';
import AddTicket from './AddTicket';
import BillGenerator from './BillGenerator';
import Notification from './Notification';
import ConnectionStatus from './ConnectionStatus';
import useNotification from '../hooks/useNotification';
import { parsePdfToData } from '../utils/pdfParser';
import './AddCustomer.css';

const AddCustomer = ({ onBack, backText = 'Back to Customers', autoClose = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    contactPerson: '',
    address: '',
    joinDate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showBillGenerator, setShowBillGenerator] = useState(false);
  const [addedCustomer, setAddedCustomer] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [tempProducts, setTempProducts] = useState([]);
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const { notification, showNotification, hideNotification } = useNotification();

  // Clear form data on component mount to ensure fresh start
  useEffect(() => {
    // Clear localStorage and reset form when component mounts
    localStorage.removeItem('customerFormData');
    localStorage.removeItem('tempProducts');

    // Reset form data
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      contactPerson: '',
      address: '',
      joinDate: ''
    });

    // Reset temp products and bill image
    setTempProducts([]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount


  // Fetch products (for existing customers)
  useEffect(() => {
    const productsRef = getCollectionRef('products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const productsArray = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllProducts(productsArray);
    });

    return () => unsubscribe();
  }, []);

  const handleBillUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('🟡 Processing uploaded bill:', file.name, 'Type:', file.type);
    setIsUploadingBill(true);

    try {
      // Image storage upload REMOVED - images are NOT saved to Firebase Storage
      // We only perform OCR extraction without storing the image
      
      console.log('📄 Scanning and extracting data from bill...');
      showNotification('🔍 Extracting data from bill...', 'info');
      
      const extractedData = await parsePdfToData(file);
      console.log('🔵 OCR extraction result:', extractedData);

      // LOG EXTRACTION SUMMARY
      console.log('═══════════════════════════════════════');
      console.log('📊 EXTRACTION SUMMARY:');
      console.log('  Customer Name:', extractedData.customer?.name || '❌ NOT FOUND');
      console.log('  Phone:', extractedData.customer?.phone || '❌ NOT FOUND');
      console.log('  Address:', extractedData.customer?.address || '❌ NOT FOUND');
      console.log('  Products Found:', extractedData.products?.length || 0);
      if (extractedData.products?.length > 0) {
        extractedData.products.forEach((p, i) => {
          console.log(`    ${i + 1}. ${p.companyName} ${p.name} - Qty:${p.qty} ₹${p.price}`);
        });
      }
      console.log('═══════════════════════════════════════');

      if (extractedData && extractedData.customer) {
        console.log('🟢 Customer data extracted:', extractedData.customer);

        // Check if we have meaningful data
        // const hasData = extractedData.customer.name || extractedData.customer.phone || extractedData.customer.address;

        // STEP 3: Fill form fields with extracted dataextracted data...');
        
        // Update customer form with extracted data
        setFormData(prev => ({
          ...prev,
          name: extractedData.customer.name || prev.name,
          phone: extractedData.customer.phone || prev.phone,
          whatsapp: extractedData.customer.whatsapp || extractedData.customer.phone || prev.whatsapp,
          contactPerson: extractedData.customer.contactPerson || prev.contactPerson,
          address: extractedData.customer.address || prev.address
        }));

        // Show notification about extracted customer data
        const extractedFields = [];
        if (extractedData.customer.name) extractedFields.push('Name');
        if (extractedData.customer.phone) extractedFields.push('Phone');
        if (extractedData.customer.address) extractedFields.push('Address');
        if (extractedData.customer.contactPerson) extractedFields.push('Contact Person');

        if (extractedFields.length > 0) {
          showNotification(`✅ Form auto-filled: ${extractedFields.join(', ')}`, 'success');
        }

        if (extractedData.products && extractedData.products.length > 0) {
          console.log('🔍 Raw extracted products:', extractedData.products);

          const realProducts = extractedData.products.map((product, index) => {
            console.log(`🔍 Processing product ${index + 1}:`, product);

            return {
              name: product.name || product.productName || `Product ${index + 1}`,
              companyName: product.companyName || extractedData.company?.name || 'Unknown Company',
              productId: product.productId || `PID${String(index + 1).padStart(3, '0')}`,
              serialNo: product.serialNo || product.serialNumber || `SN${String(index + 1).padStart(3, '0')}`,
              serialNumber: product.serialNumber || product.serialNo || `SN${String(index + 1).padStart(3, '0')}`,
              hsn: product.hsn || product.hsnCode || '',
              qty: product.qty || product.quantity || product.stock || 1,
              quantity: product.quantity || product.qty || product.stock || 1,
              stock: product.stock || product.qty || product.quantity || 1,
              price: product.price || product.rate || 0,
              rate: product.rate || product.price || 0,
              amount: product.amount || product.total || 0,
              total: product.total || product.amount || 0,
              gst: product.gst || product.gstRate || 18,
              unit: product.unit || 'Nos',
              tempId: 'pdf-' + Date.now().toString() + index,
              needsManualEntry: product.needsManualEntry || false
            };
          });

          console.log('🟢 Processed products for display:', realProducts);
          setTempProducts(realProducts);

          // Check if products need manual entry
          const needsManualEntry = realProducts.some(p => p.needsManualEntry || p.price === 0);

          if (needsManualEntry) {
            showNotification(`${realProducts.length} product template(s) created. Please edit to add correct details.`, 'warning');
          } else {
            showNotification(`${realProducts.length} product(s) extracted from bill!`, 'success');
          }
        } else {
          console.log('⚠️ No products found in extracted data');
          showNotification('Customer data extracted but no products found. Please add products manually.', 'info');
        }

        // Show summary of what was extracted
        const summary = [];
        // REMOVED: Image storage reference
        if (extractedFields.length > 0) summary.push(`${extractedFields.length} field(s) filled`);
        if (extractedData.products?.length > 0) summary.push(`${extractedData.products.length} product(s)`);

        if (summary.length > 0) {
          console.log('✅ Process complete: OCR → Form auto-fill');
          showNotification(`✅ Complete! ${summary.join(' • ')}`, 'success');
        }
      } else {
        console.log('🔴 No data extracted from bill');
        showNotification('Could not extract data. Please fill manually.', 'warning');
      }

    } catch (error) {
      console.error('🔴 PDF parsing error:', error);
      showNotification('Error scanning bill. Please try again or fill manually.', 'error');
    } finally {
      setIsUploadingBill(false);
      event.target.value = '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validate and format phone numbers (only digits, max 10)
    if (name === 'phone' || name === 'whatsapp') {
      const digitsOnly = value.replace(/\D/g, '');
      const limitedDigits = digitsOnly.slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: limitedDigits }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      showNotification('Please fill in all required fields (Name and Phone)', 'error');
      return;
    }

    // Validate phone number (exactly 10 digits)
    if (formData.phone.length !== 10) {
      showNotification('Mobile number must be exactly 10 digits', 'error');
      return;
    }

    // Validate WhatsApp number if provided
    if (formData.whatsapp && formData.whatsapp.length !== 10) {
      showNotification('WhatsApp number must be exactly 10 digits', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // REMOVED: Bill image storage - images are not saved to Firebase Storage
      
      const customerData = {
        ...formData,
        joinDate: new Date().toISOString(),
        productCount: tempProducts.length
        // REMOVED: billImageUrl field
      };

      const customersRef = getCollectionRef('customers');
      const newCustomerRef = await addDoc(customersRef, customerData);
      const savedCustomer = { id: newCustomerRef.id, ...customerData };

      if (tempProducts.length > 0) {
        const productsRef = getCollectionRef('products');
        const productPromises = tempProducts
          .filter(product => {
            // Only save products that don't have a Firebase ID yet
            // Products with Firebase ID were already saved by AddProduct
            const hasFirebaseId = product.id && product.id !== 'temp' && product.id.length > 5 && !product.id.startsWith('pdf-');
            if (hasFirebaseId) {
              console.log('⏭️ Skipping product - already saved to Firebase:', product.name);
              // Update the existing product with customer info
              const productRef = getDocRef('products', product.id);
              updateDoc(productRef, {
                customerId: savedCustomer.id,
                customerName: savedCustomer.name
              });
            }
            return !hasFirebaseId;
          })
          .map(product => {
            // Clean product data - remove temporary fields and undefined values
            const productData = {
              // Core product fields
              name: product.name || '',
              companyName: product.companyName || '',
              productId: product.productId || '',
              serialNumber: product.serialNumber || product.serialNo || '',
              serialNo: product.serialNo || product.serialNumber || '',
              hsn: product.hsn || '',
              qty: Number(product.qty) || Number(product.quantity) || Number(product.stock) || 1,
              quantity: Number(product.quantity) || Number(product.qty) || Number(product.stock) || 1,
              stock: Number(product.stock) || Number(product.qty) || Number(product.quantity) || 1,
              price: Number(product.price) || Number(product.rate) || 0,
              rate: Number(product.rate) || Number(product.price) || 0,
              amount: Number(product.amount) || Number(product.total) || 0,
              total: Number(product.total) || Number(product.amount) || 0,
              gst: Number(product.gst) || 18,
              unit: product.unit || 'nos',

              // Customer relationship
              customerId: savedCustomer.id,
              customerName: savedCustomer.name,
              createdAt: new Date().toISOString()
            };

            // Remove any undefined values
            Object.keys(productData).forEach(key => {
              if (productData[key] === undefined || productData[key] === null) {
                delete productData[key];
              }
            });

            console.log('💾 Saving clean product data:', productData);
            return addDoc(productsRef, productData);
          });

        await Promise.all(productPromises);
      }

      setAddedCustomer(savedCustomer);
      // Clear localStorage after successful save
      localStorage.removeItem('tempProducts');
      localStorage.removeItem('customerFormData');
      showNotification(`Customer "${savedCustomer.name}" added successfully with ${tempProducts.length} products!`, 'success');
      
      // Auto-close modal and return to Dashboard if autoClose is enabled
      if (autoClose && onBack) {
        setTimeout(() => {
          onBack();
        }, 1000); // Small delay to show success message
      }

    } catch (error) {
      console.error('Error adding customer:', error);

      if (error.code === 'unavailable' || error.message.includes('ERR_INTERNET_DISCONNECTED')) {
        showNotification('No internet connection. Data will be saved when you reconnect.', 'warning');
      } else if (error.code === 'permission-denied') {
        showNotification('Permission denied. Please check your Firebase rules.', 'error');
      } else {
        showNotification('Error adding customer. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewCustomer = () => {
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      contactPerson: '',
      address: '',
      joinDate: ''
    });
    setTempProducts([]);
    // Removed bill image
    // Clear all localStorage data
    localStorage.removeItem('tempProducts');
    localStorage.removeItem('customerFormData');
    setTempProducts([]);
    // Clear all localStorage data
    localStorage.removeItem('tempProducts');
    localStorage.removeItem('customerFormData');
    setAddedCustomer(null);
    showNotification('Ready to add new customer', 'info');
  };

  const handleCloseAddProduct = () => setShowAddProduct(false);
  const handleShowAddProduct = () => setShowAddProduct(true);

  const handleProductAdded = (productData) => {
    const newProduct = {
      ...productData,
      tempId: productData.tempId || Date.now().toString()
    };
    setTempProducts(prev => [...prev, newProduct]);
    setShowAddProduct(false);
    showNotification('Product added successfully!', 'success');

    // Scroll to top to show customer form with products
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRaiseTicket = (product) => {
    console.log('🎫 Opening ticket modal for product:', product);
    setSelectedProduct(product);
    setShowAddTicket(true);
  };

  const handleCloseTicket = () => {
    setSelectedProduct(null);
    setShowAddTicket(false);
  };

  const handleTicketAdded = () => {
    setShowAddTicket(false);
    showNotification('Ticket raised successfully!', 'success');
    
    // Auto-close the entire modal and return to Dashboard if autoClose is enabled
    if (autoClose && onBack) {
      setTimeout(() => {
        onBack();
      }, 1000); // Small delay to show success message
    }
  };

  const handleCloseBillGenerator = () => {
    setShowBillGenerator(false);
    setEditingProduct(null);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowEditProduct(true);
  };

  const handleCloseEditProduct = () => {
    setEditingProduct(null);
    setShowEditProduct(false);
  };

  const handleUpdateProduct = async (updatedProductData) => {
    if (editingProduct.tempId) {
      setTempProducts(prev =>
        prev.map(product =>
          product.tempId === editingProduct.tempId
            ? { ...updatedProductData, tempId: editingProduct.tempId }
            : product
        )
      );
      showNotification('Product updated successfully!', 'success');
      setShowEditProduct(false);
      setEditingProduct(null);
    } else {
      try {
        const productRef = getDocRef('products', editingProduct.id);
        await updateDoc(productRef, {
          ...updatedProductData,
          updatedAt: new Date().toISOString()
        });
        showNotification('Product updated successfully!', 'success');
        setShowEditProduct(false);
        setEditingProduct(null);
      } catch (error) {
        console.error('Error updating product:', error);
        showNotification('Error updating product. Please try again.', 'error');
      }
    }
  };

  const handleDeleteProduct = (productId, productName, isTemp = false) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      if (isTemp) {
        setTempProducts(prev => prev.filter(product => product.tempId !== productId));
        showNotification('Product removed successfully!', 'success');
      } else {
        const productRef = getDocRef('products', productId);
        deleteDoc(productRef)
          .then(() => {
            showNotification('Product deleted successfully!', 'success');
          })
          .catch(error => {
            console.error('Error deleting product:', error);
            showNotification('Error deleting product. Please try again.', 'error');
          });
      }
    }
  };

  const handleClearAllProducts = () => {
    if (tempProducts.length > 0 && window.confirm('Are you sure you want to clear all products?')) {
      setTempProducts([]);
      localStorage.removeItem('tempProducts'); // Clear localStorage
      showNotification('All products cleared!', 'success');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const customerProducts = addedCustomer
    ? allProducts.filter(product => product.customerId === addedCustomer?.id)
    : [];

  const canAddCustomer = formData.name && formData.phone && !addedCustomer;

  return (
    <div className="add-customer">
      <ConnectionStatus />

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Product{formData.name ? ` for ${formData.name}` : ''}</h2>
              <button className="close-btn" onClick={handleCloseAddProduct}>×</button>
            </div>
            <AddProduct
              onBack={handleCloseAddProduct}
              onProductAdded={handleProductAdded}
              customer={addedCustomer || { id: 'temp', name: formData.name }}
              editMode={false}
            />
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditProduct && editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Product - {editingProduct.name}</h2>
              <button className="close-btn" onClick={handleCloseEditProduct}>×</button>
            </div>
            <AddProduct
              onBack={handleCloseEditProduct}
              onProductAdded={handleUpdateProduct}
              customer={addedCustomer || { id: 'temp', name: formData.name }}
              editMode={true}
              productData={editingProduct}
            />
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {showAddTicket && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Raise Ticket for {selectedProduct.name}</h2>
              <button className="close-btn" onClick={handleCloseTicket}>×</button>
            </div>
            <AddTicket
              onBack={handleCloseTicket}
              onTicketAdded={handleTicketAdded}
              productData={selectedProduct}
              customer={addedCustomer || {
                id: 'temp',
                name: formData.name || 'Customer',
                phone: formData.phone || '',
                address: formData.address || ''
              }}
            />
          </div>
        </div>
      )}

      {/* Bill Generator Modal */}
      {showBillGenerator && (
        <div className="modal-overlay">
          <div className="modal-content bill-modal">
            <div className="modal-header">
              <h2>Generate Bill - {addedCustomer?.name || formData.name}</h2>
              <button className="close-btn" onClick={handleCloseBillGenerator}>×</button>
            </div>
            <BillGenerator
              customer={addedCustomer || {
                id: 'temp',
                name: formData.name || 'Customer',
                phone: formData.phone || '',
                address: formData.address || '',
                contactPerson: formData.contactPerson || ''
              }}
              products={tempProducts}
              onBack={handleCloseBillGenerator}
            />
          </div>
        </div>
      )}

      {/* Customer Form */}
      <div className="customer-header">
        <h1>Add New Customer</h1>
        <div className="header-actions">
          {addedCustomer && (
            <button className="btn-new-customer" onClick={handleStartNewCustomer}>
              🆕 New Customer
            </button>
          )}
          <button className="btn-primary" onClick={onBack}>
            <span className="btn-icon">←</span> {backText}
          </button>
        </div>
      </div>

      <div className="add-customer-container">
        <div className="add-customer-card">
          <form onSubmit={handleSubmit}>

            {/* CUSTOMER FORM FIELDS */}
            <div className="form-section">
              <div className="section-header">
                <h3>Customer Information</h3>
                <div className="upload-bill-section">
                  <label className={`btn-upload-bill ${isUploadingBill ? 'uploading' : ''}`} htmlFor="bill-upload">
                    {isUploadingBill ? '📄 Scanning Bill...' : '📄 Upload Bill (PDF/Image)'}
                    <input
                      id="bill-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleBillUpload}
                      disabled={isUploadingBill || addedCustomer}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {isUploadingBill && <div className="upload-spinner">⏳</div>}
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter customer name"
                    disabled={addedCustomer}
                  />
                </div>
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter 10 digit mobile number"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Please enter exactly 10 digits"
                    disabled={addedCustomer}
                  />
                  {formData.phone && formData.phone.length !== 10 && (
                    <small style={{ color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                      Must be 10 digits
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>WhatsApp Number</label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    placeholder="Enter 10 digit WhatsApp number"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Please enter exactly 10 digits"
                    disabled={addedCustomer}
                  />
                  {formData.whatsapp && formData.whatsapp.length !== 10 && (
                    <small style={{ color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>
                      Must be 10 digits
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    placeholder="Enter contact person"
                    disabled={addedCustomer}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Enter customer address"
                    disabled={addedCustomer}
                  />
                </div>
              </div>
            </div>

            {/* PRODUCT MANAGEMENT */}
            <div className="add-product-section">
              <h3>Product Management</h3>
              <div className="add-product-top-section">
                {!addedCustomer && (
                  <button
                    type="button"
                    className="btn-add-product-top"
                    onClick={handleShowAddProduct}
                  >
                    <span className="btn-icon">+</span> Add Product
                  </button>
                )}
                {!addedCustomer && tempProducts.length > 0 && (
                  <button
                    type="button"
                    className="btn-clear-products"
                    onClick={handleClearAllProducts}
                  >

                  </button>
                )}
                <p className="add-product-hint">
                  {/* {addedCustomer 
                    ? `✅ ${tempProducts.length} product(s) saved with customer`
                    : tempProducts.length > 0 
                      ? `${tempProducts.length} product(s) added for ${formData.name || 'this customer'}`
                      : ''
                  } */}
                </p>
              </div>
            </div>

            {/* PRODUCTS LIST */}
            {tempProducts.length > 0 && (
              <div className="customer-products-section">
                <div className="section-header">
                  <h3>
                    {addedCustomer
                      ? `${addedCustomer.name}'s Products (${tempProducts.length})`
                      : `Products for ${formData.name || 'New Customer'} (${tempProducts.length})`
                    }
                  </h3>
                  <div className="section-actions">
                    {/* {tempProducts.length > 0 && (
                      <button 
                        type="button" 
                        className="btn-generate-bill"
                        onClick={handleShowBillGenerator}
                      >
                        📄 Generate Bill
                      </button>
                    )} */}
                    {addedCustomer && (
                      <span className="customer-saved-badge">✅ Customer Saved</span>
                    )}
                  </div>
                </div>

                <div className="products-list">
                  {tempProducts.map(product => (
                    <div key={product.tempId} className="product-card">
                      <div className="product-header">
                        <div className="product-title">
                          <h4>{product.name}</h4>
                          {/* <span className={`product-status ${addedCustomer ? 'saved' : product.needsManualEntry || product.price === 0 ? 'needs-edit' : 'ready'}`}>
                            {addedCustomer ? '✅ Saved with customer' : product.needsManualEntry || product.price === 0 ? '⚠️ Please edit details' : '⏳ Ready to save'}
                          </span> */}
                        </div>
                        {!addedCustomer && (
                          <div className="product-actions-header">
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => handleEditProduct(product)}
                              title="Edit product"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={() => handleDeleteProduct(product.tempId, product.name, true)}
                              title="Delete product"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="product-details">
                        <p><strong>Company Name:</strong> {product.companyName || 'N/A'}</p>
                        <p><strong>Product Name:</strong> {product.name || 'N/A'}</p>
                        <p><strong>Serial Number:</strong> {product.serialNumber || product.serialNo || 'N/A'}</p>
                        {product.gst && <p><strong>GST:</strong> {product.gst}%</p>}
                      </div>
                      <div className="product-actions-footer">
                        <button
                          type="button"
                          className="btn-ticket"
                          onClick={() => handleRaiseTicket(product)}
                        >
                          🎫 Raise Ticket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="form-actions">
              {!addedCustomer && (
                <button
                  type="submit"
                  className={`btn-primary ${canAddCustomer ? 'btn-purple' : ''}`}
                  disabled={isSubmitting || !canAddCustomer}
                >
                  {isSubmitting
                    ? 'Adding Customer...'
                    : tempProducts.length > 0
                      ? `Add Customer with ${tempProducts.length} Product(s)`
                      : 'Add Customer'
                  }
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={onBack}>
                {backText}
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

export default AddCustomer;