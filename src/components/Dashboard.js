import React, { useState } from 'react';
import Tickets from './Tickets';
import AddInStockProduct from './AddInStockProduct';
import './Dashboard.css';

const Dashboard = () => {
  const [filterCategory, setFilterCategory] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [showTickets, setShowTickets] = useState(true); // Show tickets by default
  const [showInStockForm, setShowInStockForm] = useState(false);
  const [inStockStatusFilter, setInStockStatusFilter] = useState('active'); // Status filter for In Stock
  const excludeResolved = true; // Dashboard should not show resolved tickets

  const sections = [
    { name: "demo", label: "Demo" },
    { name: "service", label: "Service" },
    { name: "third party", label: "Third Party Tech" },
    { name: "in store", label: "In Store" },
    { name: "in stock", label: "In Stock" },
  ];

  const handleCategoryClick = (categoryName) => {
    // Toggle behavior: if clicking the same card, show all tickets and deactivate
    if (activeFilter === categoryName && filterCategory === categoryName) {
      setFilterCategory(null); // Show all tickets
      setActiveFilter(null); // Deactivate card (change color back)
    } else {
      setFilterCategory(categoryName); // Show filtered tickets
      setActiveFilter(categoryName); // Activate card
    }
    setShowTickets(true); // Keep tickets visible
    setShowInStockForm(false); // Hide form when switching categories
  };

  const clearFilter = () => {
    setFilterCategory(null);
    setActiveFilter(null);
    setShowTickets(true); // Keep tickets visible
    setShowInStockForm(false);
  };

  const handleBackFromInStock = () => {
    setShowInStockForm(false);
    setFilterCategory('in stock');
    setActiveFilter('in stock');
    setShowTickets(true);
  };

  const handleInStockProductAdded = () => {
    setShowInStockForm(false);
    setFilterCategory('in stock');
    setActiveFilter('in stock');
    setShowTickets(true);
  };

  return (
    <div className="dashboard">
     
     {/* Section cards */}
      <div className="dashboard-sections">
        {sections.map(section => (
          <div
            key={section.name}
            className={`section ${activeFilter === section.name ? "active" : ""}`}
            onClick={() => handleCategoryClick(section.name)}
            style={{ cursor: "pointer" }}
          >
            <h3>{section.label}</h3>
            <p>Click to view {section.label} tickets</p>
          </div>
        ))}
      </div>

      {/* In Stock Form or Tickets Section */}
      <div style={{ marginTop: "30px" }}>
        {showInStockForm ? (
          <AddInStockProduct 
            onBack={handleBackFromInStock}
            onProductAdded={handleInStockProductAdded}
          />
        ) : (
          <>
            <div style={{ 
              marginBottom: "20px", 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap"
            }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#2c3e50", margin: 0 }}>
                {filterCategory ? sections.find(s => s.name === filterCategory)?.label + ' Tickets' : 'All Tickets'}
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {filterCategory === 'in stock' && (
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setShowInStockForm(true);
                      setShowTickets(false);
                    }}
                    style={{ 
                      padding: "8px 16px", 
                      fontSize: "0.95rem",
                      whiteSpace: "nowrap",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "500",
                      width: "auto",
                      minWidth: "fit-content",
                      maxWidth: "220px"
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", fontWeight: "400" }}>+</span>
                    Add Defective Product
                  </button>
                )}
              </div>
            </div>
            <Tickets 
              key="tickets-main" 
              filterCategory={filterCategory} 
              excludeResolved={filterCategory === 'in stock' ? false : excludeResolved} 
              showStatusFilter={false} 
              showEditableNotes={true}
              inStockStatusFilter={filterCategory === 'in stock' ? inStockStatusFilter : null}
              setInStockStatusFilter={setInStockStatusFilter}
            />
          </>
        )}
      </div>

    </div>
  );
};

export default Dashboard;