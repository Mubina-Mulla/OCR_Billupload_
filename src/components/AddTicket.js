import React, { useState, useEffect } from "react";
import { addDoc, updateDoc, onSnapshot, setDoc, doc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import {
  db,
  getCollectionRef,
  getDocRef,
  getAdminTicketsCollectionRef,
  getAdminTicketDocRef
} from "../firebase/config";
import Notification from "./Notification";
import useNotification from "../hooks/useNotification";
import "./AddTicket.css";

const AddTicket = ({
  onBack,
  onTicketAdded,
  onTicketUpdated,
  productData,
  ticketData,
  customer,
  prefilledData,
}) => {
  const { notification, showNotification, hideNotification } = useNotification();

  const generateTicketNumber = async () => {
    try {
      // Get current user ID
      const currentAdmin = localStorage.getItem('currentAdmin');
      const superAdmin = localStorage.getItem('superAdmin');
      let userId = null;

      if (currentAdmin) {
        userId = JSON.parse(currentAdmin).uid;
      } else if (superAdmin) {
        userId = JSON.parse(superAdmin).uid;
      }

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



  const [formData, setFormData] = useState({
    ticketNumber: "...", // Will be set by useEffect
    customerName: prefilledData?.customerName || customer?.name || "",
    customerPhone: prefilledData?.customerPhone || customer?.phone || "",
    productName: prefilledData?.productName || productData?.name || "",
    serialNumber: prefilledData?.serialNumber || productData?.serialNumber || "",
    companyName:
      prefilledData?.companyName ||
      prefilledData?.brand ||
      productData?.brand ||
      productData?.companyName ||
      "",
    brand: prefilledData?.brand || productData?.brand || "",
    model: prefilledData?.model || productData?.model || "",
    price: prefilledData?.price || productData?.price || "",
    category: "Demo",
    subOption: "",
    status: "Pending",
    serviceAmount: "",
    commissionAmount: "",
    amountReceived: "",
    note: "",
    createdAt: new Date().toISOString(),
    endDate: "",
    callId: "",
  });

  const [serviceCenters, setServiceCenters] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const receivedOptions = ["By Store", "By Technician"];

  // Generate ticket number on component mount
  useEffect(() => {
    const initTicketNumber = async () => {
      if (!ticketData) { // Only generate for new tickets
        const newTicketNumber = await generateTicketNumber();
        setFormData(prev => ({
          ...prev,
          ticketNumber: newTicketNumber
        }));
      }
    };
    initTicketNumber();
  }, []);

  const getCurrentAdminInfo = () => {
    try {
      const currentAdmin = localStorage.getItem("currentAdmin");
      const superAdmin = localStorage.getItem("superAdmin");

      console.log('🔍 AddTicket - Getting admin info');
      console.log('currentAdmin raw:', currentAdmin);
      console.log('superAdmin raw:', superAdmin);

      if (currentAdmin) {
        const adminData = JSON.parse(currentAdmin);
        console.log('✅ AddTicket - Parsed currentAdmin:', adminData);
        console.log('🆔 AddTicket - Admin UID:', adminData.uid);
        console.log('📧 AddTicket - Admin Email:', adminData.email);
        return adminData;
      }

      if (superAdmin) {
        const adminData = JSON.parse(superAdmin);
        console.log('✅ AddTicket - Parsed superAdmin:', adminData);
        console.log('🆔 AddTicket - Admin UID:', adminData.uid);
        console.log('📧 AddTicket - Admin Email:', adminData.email);
        return adminData;
      }

      console.log('❌ AddTicket - No admin data found');
      return null;
    } catch (error) {
      console.error("❌ AddTicket - Error getting admin info:", error);
      return null;
    }
  };

  // Prefill admin display name for "Created By" field
  useEffect(() => {
    const info = getCurrentAdminInfo();
    if (info) {
      const name = info.name || info.adminName || info.email || "";
      setAdminDisplayName(name);
    }
  }, []);

  useEffect(() => {
    const servicesRef = getCollectionRef("services");
    const unsubscribe = onSnapshot(servicesRef, (snapshot) => {
      const centersArray = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().serviceCenterName,
        ...doc.data(),
      }));
      setServiceCenters(centersArray);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const techRef = getCollectionRef("technicians");
    const unsubscribe = onSnapshot(techRef, (snapshot) => {
      const techArray = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        ...doc.data(),
      }));
      setTechnicians(techArray);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (ticketData) {
      setFormData({
        ...formData,
        ...ticketData,
        ticketNumber: ticketData.ticketNumber || generateTicketNumber(),
        createdAt: ticketData.createdAt || new Date().toISOString(),
      });
    } else if (prefilledData) {
      setFormData((prev) => ({
        ...prev,
        customerName: prefilledData.customerName || "",
        customerPhone: prefilledData.customerPhone || "",
        productName: prefilledData.productName || "",
        serialNumber: prefilledData.serialNumber || "",
        companyName: prefilledData.companyName || prefilledData.brand || "",
        brand: prefilledData.brand || "",
        model: prefilledData.model || "",
        price: prefilledData.price || "",
      }));
    } else if (productData?.serialNumber) {
      setFormData((prev) => ({
        ...prev,
        serialNumber: productData.serialNumber,
      }));
    }
  }, [ticketData, productData, customer, prefilledData]);

  // Auto-select matching service center when company name matches
  useEffect(() => {
    // Only auto-select if category is Demo or Service and no service center is selected yet
    if ((formData.category === "Demo" || formData.category === "Service") &&
      !formData.subOption &&
      serviceCenters.length > 0) {

      const productCompany = (formData.companyName || formData.brand || '').toLowerCase().trim();

      if (productCompany) {
        // Find exact matching service center
        const matchingCenter = serviceCenters.find(center => {
          const centerCompany = (center.companyName || '').toLowerCase().trim();
          return centerCompany === productCompany ||
            centerCompany.includes(productCompany) ||
            productCompany.includes(centerCompany);
        });

        if (matchingCenter) {
          console.log('🎯 Auto-selecting service center:', matchingCenter.serviceCenterName);
          setFormData(prev => ({
            ...prev,
            subOption: matchingCenter.serviceCenterName || matchingCenter.name
          }));
        }
      }
    }
  }, [formData.category, formData.companyName, formData.brand, serviceCenters, formData.subOption]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "category") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        subOption: "",
        serviceAmount: "",
        commissionAmount: "",
        amountReceived: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName) {
      showNotification("Please enter customer name", "warning");
      return;
    }
    if (!formData.subOption || formData.subOption === "__new__") {
      showNotification("Please enter a service center or technician name", "warning");
      return;
    }

    try {
      const adminInfo = getCurrentAdminInfo();
      let adminId = null;
      let adminName = null;
      let adminEmail = null;

      console.log('🎯 AddTicket - Admin info retrieved:', adminInfo);

      if (adminInfo) {
        // ✅ FIXED: Correct order to match Login.js structure (uid is the primary field)
        adminId = adminInfo.uid || adminInfo.userId || adminInfo.id || null;
        adminName = adminInfo.name || adminInfo.adminName || adminInfo.email?.split('@')[0] || null;
        adminEmail = adminInfo.email || null;

        console.log('🆔 AddTicket - Extracted admin ID:', adminId);
        console.log('👤 AddTicket - Extracted admin name:', adminName);
        console.log('📧 AddTicket - Extracted admin email:', adminEmail);
      } else {
        console.error('❌ AddTicket - No admin info available!');
        showNotification("Error: Admin session not found. Please login again.", "error");
        return;
      }

      const ticketPayload = {
        ...formData,
        callId: formData.ticketNumber, // Use the main number as callId
        adminId: adminId || formData.adminId || null,
        adminEmail: adminEmail || formData.adminEmail || null,
        createdBy:
          formData.createdBy ||
          adminName ||
          adminEmail ||
          formData.customerName ||
          "",
        // Add required fields for points calculation
        assignedAt: formData.assignedAt || new Date().toISOString(),
        createdAt: formData.createdAt || new Date().toISOString(),
        endDate: formData.endDate || formData.expectedEndDate || null,
      };

      // Auto-create service center if category is "Service" or "Demo" and it's a new service center
      if ((formData.category === "Service" || formData.category === "Demo") && formData.subOption) {
        const existingService = serviceCenters.find(
          sc => sc.serviceCenterName === formData.subOption || sc.name === formData.subOption
        );

        if (!existingService) {
          // Create new service center automatically
          const servicesRef = getCollectionRef('services');
          const newServiceData = {
            companyName: formData.companyName || formData.brand || 'N/A',
            serviceCenterName: formData.subOption,
            address: 'Auto-generated from ticket - Please update',
            mobileNumber: formData.customerPhone || '0000000000',
            createdAt: new Date().toISOString(),
            autoCreated: true,
            category: formData.category
          };
          await addDoc(servicesRef, newServiceData);
          console.log('✅ Auto-created service center:', formData.subOption);
          showNotification(`Service center "${formData.subOption}" added to Service Center page!`, 'info');
        }
      }

      if (ticketData && ticketData.id) {
        // Update existing ticket - only in admin's collection
        console.log('📝 AddTicket - Updating existing ticket:', ticketData.id);

        if (adminId) {
          const userTicketRef = doc(db, 'mainData', 'Billuload', 'users', adminId, 'tickets', ticketData.id);
          await setDoc(userTicketRef, ticketPayload, { merge: true });
          console.log('✅ AddTicket - Updated ticket in admin collection');
        }

        showNotification("Ticket updated successfully!", "success");
        if (onTicketUpdated) onTicketUpdated();
      } else {
        // Create new ticket - save in admin's collection and main collection
        console.log('🎫 AddTicket - Creating new ticket for admin:', adminId);
        console.log('📦 AddTicket - Ticket payload:', ticketPayload);

        if (!adminId) {
          console.error('❌ AddTicket - Cannot create ticket: No admin ID!');
          showNotification("Error: Cannot create ticket. Admin session not found.", "error");
          return;
        }

        try {
          // Save to user's tickets collection (matching actual Firebase structure)
          const userTicketsRef = getAdminTicketsCollectionRef(adminId);
          console.log('📂 AddTicket - Saving to user collection: mainData/Billuload/users/' + adminId + '/tickets');

          const ticketDocRef = await addDoc(userTicketsRef, {
            ...ticketPayload,
            customerId: prefilledData?.customerId || ticketPayload.customerId || null,
            productId: prefilledData?.productId || ticketPayload.productId || null,
            userId: adminId // Ensure userId is set for filtering
          });

          console.log(`✅ AddTicket - Ticket created with ID: ${ticketDocRef.id}`);
          console.log('🎉 AddTicket - Ticket creation complete!');

          showNotification("Ticket added successfully!", "success");
        } catch (saveError) {
          console.error('❌ Error saving ticket to Firestore:', saveError);

          if (saveError.code === 'permission-denied') {
            showNotification("Permission denied. Please contact administrator to fix Firestore access.", "error");
          } else {
            showNotification("Error saving ticket. Please try again or contact support.", "error");
          }

          // Don't navigate away if save failed
          return;
        }

        // Navigate back immediately - the notification will show during navigation
        if (onTicketAdded) onTicketAdded();
        if (onBack) onBack();
      }

      // Don't reset form or navigate immediately - let the notification show first
      // The setTimeout above handles navigation for new tickets
    } catch (error) {
      console.error("Error saving ticket:", error);
      showNotification("Failed to save ticket. Try again.", "error");
    }
  };

  // Conditional rendering variables
  const showServiceCenters = formData.category === "Demo" || formData.category === "Service";
  const showTechnicians = formData.category === "Third Party" || formData.category === "In Store";
  const showExtraAmounts = formData.category === "Third Party" || formData.category === "In Store";

  // Smart filtering: Show matching service centers first, then others
  const productCompany = (formData.companyName || formData.brand || '').toLowerCase().trim();

  const filteredServiceCenters = serviceCenters.sort((a, b) => {
    const aCompany = (a.companyName || '').toLowerCase().trim();
    const bCompany = (b.companyName || '').toLowerCase().trim();

    // Check if company names match the product company
    const aMatches = productCompany && (
      aCompany.includes(productCompany) ||
      productCompany.includes(aCompany)
    );
    const bMatches = productCompany && (
      bCompany.includes(productCompany) ||
      productCompany.includes(bCompany)
    );

    // Sort matching companies first
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;

    // Then sort alphabetically
    return (a.companyName || '').localeCompare(b.companyName || '');
  });

  // Separate matching and non-matching service centers for display
  const matchingCenters = filteredServiceCenters.filter(center => {
    const centerCompany = (center.companyName || '').toLowerCase().trim();
    return productCompany && (
      centerCompany.includes(productCompany) ||
      productCompany.includes(centerCompany)
    );
  });

  // Debug log for service centers (commented out to reduce console spam)
  // console.log('🔍 Service Centers Available:', {
  //   total: serviceCenters.length,
  //   productCompany: formData.companyName || formData.brand,
  //   matching: matchingCenters.length,
  //   matchingCenters: matchingCenters.map(c => ({ company: c.companyName, name: c.serviceCenterName })),
  //   allCenters: filteredServiceCenters.map(c => ({ company: c.companyName, name: c.serviceCenterName }))
  // });

  return (
    <div className="add-ticket">
      <div className="add-ticket-header">
        <h1>{ticketData ? "Edit Ticket" : "Create Ticket"}</h1>
      </div>

      <div className="add-ticket-container">
        <div className="add-ticket-card">
          <form onSubmit={handleSubmit} className="ticket-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Call ID</label>
                <input
                  type="text"
                  name="ticketNumber"
                  value={formData.ticketNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  readOnly
                />
              </div>

              {/* Created By Field */}
              <div className="form-group full-width">
                <label>Created By (Admin)</label>
                <div className="created-by-field">
                  <span className="admin-icon">👤</span>
                  <input
                    type="text"
                    className="admin-name-input"
                    value={adminDisplayName || "Unknown Admin"}
                    readOnly
                  />
                </div>
              </div>

              {/* PRODUCT INFO */}
              <div className="product-details-section">
                <h3>Product Information</h3>

                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={
                      formData.companyName ||
                      formData.brand ||
                      productData?.companyName ||
                      ""
                    }
                    readOnly
                    className="readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label>Serial Number *</label>
                  <input
                    type="text"
                    value={
                      formData.serialNumber ||
                      productData?.serialNo ||
                      productData?.serialNumber ||
                      ""
                    }
                    readOnly
                    className="readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={formData.productName || productData?.name || ""}
                    readOnly
                    className="readonly-field"
                  />
                </div>
              </div>

              {/* CATEGORY SELECTION */}
              <div className="form-group">
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleChange}>
                  <option value="Demo">Demo</option>
                  <option value="Service">Service</option>
                  <option value="Third Party">Third Party</option>
                  <option value="In Store">In Store</option>
                </select>
              </div>



              {/* Service Center for Demo and Service */}
              {showServiceCenters && (
                <>
                  <div className="form-group full-width">
                    <label>Service Center</label>
                    <select
                      name="subOption"
                      value={formData.subOption}
                      onChange={handleChange}
                      required
                    >
                      <option value="">✓ Select Service Center</option>
                      {filteredServiceCenters.length > 0 ? (
                        <>
                          {matchingCenters.length > 0 && (
                            <optgroup label={`✨ Recommended for ${formData.companyName || formData.brand}`}>
                              {matchingCenters.map((center, idx) => (
                                <option key={center.id || idx} value={center.serviceCenterName || center.name}>
                                  {center.companyName ? `${center.companyName} - ${center.serviceCenterName || center.name}` : (center.serviceCenterName || center.name)}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {filteredServiceCenters.filter(center => {
                            const centerCompany = (center.companyName || '').toLowerCase().trim();
                            const matches = productCompany && (
                              centerCompany.includes(productCompany) ||
                              productCompany.includes(centerCompany)
                            );
                            return !matches;
                          }).length > 0 && (
                              <optgroup label="📋 Other Service Centers">
                                {filteredServiceCenters.filter(center => {
                                  const centerCompany = (center.companyName || '').toLowerCase().trim();
                                  const matches = productCompany && (
                                    centerCompany.includes(productCompany) ||
                                    productCompany.includes(centerCompany)
                                  );
                                  return !matches;
                                }).map((center, idx) => (
                                  <option key={center.id || idx} value={center.serviceCenterName || center.name}>
                                    {center.companyName ? `${center.companyName} - ${center.serviceCenterName || center.name}` : (center.serviceCenterName || center.name)}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                        </>
                      ) : (
                        <option disabled>No service centers available. Please add one from Services page.</option>
                      )}
                      <option value="__new__">+ Add New Service Center</option>
                    </select>
                    <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                      {matchingCenters.length > 0
                        ? `✨ ${matchingCenters.length} matching service center(s) for ${formData.companyName || formData.brand} | ${filteredServiceCenters.length} total`
                        : filteredServiceCenters.length > 0
                          ? `📋 ${filteredServiceCenters.length} service center(s) available (no exact match for ${formData.companyName || formData.brand})`
                          : '⚠️ No service centers found. Add them from Services page.'}
                    </small>
                  </div>
                  {formData.subOption === "__new__" && (
                    <div className="form-group full-width">
                      <label>New Service Center Name *</label>
                      <input
                        type="text"
                        placeholder="Enter new service center name"
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, subOption: e.target.value }));
                        }}
                        required
                      />
                      <small style={{ color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                        ✨ This service center will be automatically added to the Service Center page
                      </small>
                    </div>
                  )}
                </>
              )}

              {/* Technician for Third Party and In Store */}
              {showTechnicians && (
                <div className="form-group full-width">
                  <label>Technician</label>
                  <select
                    name="subOption"
                    value={formData.subOption}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Technician</option>
                    {technicians.map((tech, idx) => (
                      <option key={idx} value={tech.name}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* EXTRA AMOUNTS for Third Party & In Store */}
              {showExtraAmounts && (
                <>
                  <div className="form-group">
                    <label>Service Amount</label>
                    <input
                      type="number"
                      name="serviceAmount"
                      placeholder="Enter Service Amount"
                      value={formData.serviceAmount}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Commission Amount</label>
                    <input
                      type="number"
                      name="commissionAmount"
                      placeholder="Enter Commission Amount"
                      value={formData.commissionAmount}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount Received</label>
                    <select
                      name="amountReceived"
                      value={formData.amountReceived}
                      onChange={handleChange}
                    >
                      <option value="">Select Option</option>
                      {receivedOptions.map((opt, idx) => (
                        <option key={idx} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>📝 Note / Description</label>
                    <textarea
                      name="note"
                      placeholder="Add a note or description for this ticket..."
                      value={formData.note}
                      onChange={handleChange}
                      rows="4"
                    />
                    <small style={{ color: '#6c757d', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Add any additional notes or special instructions for this ticket
                    </small>
                  </div>
                </>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {ticketData ? "Update Ticket" : "Add Ticket"}
              </button>
              <button type="button" className="btn-secondary" onClick={onBack}>
                Back
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

export default AddTicket;
