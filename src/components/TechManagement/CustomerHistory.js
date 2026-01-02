import React from "react";
import "./CustomerHistory.css";

const CustomerHistory = ({ technician, ticketTransactions = [], walletSummary = {}, onClose }) => {
  // Sort ticket transactions by date (newest first)
  const sortedTicketTransactions = [...ticketTransactions].sort((a, b) => {
    const dateA = a.date?.toDate?.() || new Date(a.date || 0);
    const dateB = b.date?.toDate?.() || new Date(b.date || 0);
    return dateB - dateA;
  });

  // Calculate accurate service center wallet
  // Service Center Wallet = 
  //   Third Party: Commission received from tech
  //   In Store: (Customer payment collected) - (Commission paid to tech)
  // Total = Third Party Commission + In Store Service - In Store Commission
  const serviceCenterAmount = (walletSummary.thirdPartyCommission || 0) + (walletSummary.inStoreService || 0) - (walletSummary.inStoreCommission || 0);

  // Calculate payable amount (remaining amount tech owes to service center after settlements)
  // When In Store tickets are resolved, commissions are used to settle Third Party debts
  // Payable = Third Party Commission - In Store Commission (settled amount)
  // If positive: Tech still owes, If negative: Tech has credit
  const payableAmount = Math.max(0, (walletSummary.thirdPartyCommission || 0) - (walletSummary.inStoreCommission || 0));

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h2>💰 Wallet & Transaction History - {technician.name}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="history-modal-body">
          {/* Wallet Summary - Only Tech and Service Center Cards */}
          {walletSummary && Object.keys(walletSummary).length > 0 && (
            <div className="wallet-summary-section">
              <div className="wallet-details-cards">
                <div className="wallet-detail-card tech-wallet">
                  <span className="wallet-icon">👤</span>
                  <div className="wallet-info">
                    <span className="wallet-label">Technician Wallet</span>
                    <span className="wallet-amount">₹{walletSummary.balance >= 0 ? walletSummary.balance.toFixed(2) : '0.00'}</span>
                    <span className="wallet-description">
                      {walletSummary.balance >= 0 ? 'Amount to receive from service center' : 'No pending amount'}
                    </span>
                  </div>
                </div>
                <div className="wallet-detail-card service-wallet">
                  <span className="wallet-icon">🏢</span>
                  <div className="wallet-info">
                    <span className="wallet-label">Service Center Wallet</span>
                    <span className="wallet-amount">
                      {serviceCenterAmount >= 0 
                        ? `+₹${serviceCenterAmount.toFixed(2)}` 
                        : `-₹${Math.abs(serviceCenterAmount).toFixed(2)}`}
                    </span>
                    <span className="wallet-description">
                      {serviceCenterAmount >= 0 
                        ? `Net balance after all transactions` 
                        : `Net amount to pay technician`}
                    </span>
                  </div>
                </div>
                <div className="wallet-detail-card payable-wallet">
                  <span className="wallet-icon">💰</span>
                  <div className="wallet-info">
                    <span className="wallet-label">Payable Amount</span>
                    <span className="wallet-amount">₹{payableAmount.toFixed(2)}</span>
                    <span className="wallet-description">
                      {payableAmount > 0 
                        ? 'Remaining commission after settlements' 
                        : 'All commissions settled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commission History */}
          <div className="transactions-list">
            <h3>Commission-Based Transactions</h3>
            {sortedTicketTransactions.length > 0 ? (
              <div className="transactions-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ticket #</th>
                      <th>Customer</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Tech Gets</th>
                      <th>Service Center</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTicketTransactions.map((trans) => {
                      const transDate = trans.date?.toDate?.() || new Date(trans.date || 0);
                      return (
                        <tr key={trans.id}>
                          <td>{transDate.toLocaleDateString('en-GB')}</td>
                          <td>#{trans.ticketNumber}</td>
                          <td>{trans.customerName}</td>
                          <td>
                            <span className={`category-badge ${trans.category.replace(' ', '-').toLowerCase()}`}>
                              {trans.category}
                            </span>
                          </td>
                          <td>
                            <span className={`type-badge ${trans.type}`}>
                              {trans.type === 'credit' ? '💵 Credit' : '💸 Debit'}
                            </span>
                          </td>
                          <td className={`amount ${trans.type}`}>
                            {trans.type === 'credit' ? '+' : '-'}₹{trans.amount.toFixed(2)}
                          </td>
                          <td className={`tech-amount ${trans.netAmount >= 0 ? 'positive' : 'negative'}`}>
                            {trans.category === 'In Store' 
                              ? `+₹${trans.amount.toFixed(2)}` 
                              : `+₹${trans.netAmount.toFixed(2)}`}
                          </td>
                          <td className={`service-amount ${trans.category === 'Third Party' && trans.type === 'debit' ? 'receives' : 'pays'}`}>
                            {trans.category === 'In Store' 
                              ? `-₹${trans.amount.toFixed(2)}` 
                              : (trans.type === 'debit' ? `+₹${trans.amount.toFixed(2)}` : `-₹${trans.amount.toFixed(2)}`)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-transactions">
                <p>No commission transactions found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerHistory;
