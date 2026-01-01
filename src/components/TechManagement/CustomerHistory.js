import React from "react";
import "./CustomerHistory.css";

const CustomerHistory = ({ technician, ticketTransactions = [], walletSummary = {}, onClose }) => {
  // Sort ticket transactions by date (newest first)
  const sortedTicketTransactions = [...ticketTransactions].sort((a, b) => {
    const dateA = a.date?.toDate?.() || new Date(a.date || 0);
    const dateB = b.date?.toDate?.() || new Date(b.date || 0);
    return dateB - dateA;
  });

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <h2>💰 Wallet & Transaction History - {technician.name}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="history-modal-body">
          {/* Wallet Summary */}
          {walletSummary && Object.keys(walletSummary).length > 0 && (
            <div className="wallet-summary-section">
              <h3>Wallet Summary</h3>
              <div className="summary-cards">
                <div className="summary-card credit-card">
                  <span className="card-icon">💵</span>
                  <span className="card-label">Total Credits (In Store)</span>
                  <span className="card-amount">₹{walletSummary.credits?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="summary-card debit-card">
                  <span className="card-icon">💸</span>
                  <span className="card-label">Total Debits (Third Party)</span>
                  <span className="card-amount">₹{walletSummary.debits?.toFixed(2) || '0.00'}</span>
                </div>
                <div className={`summary-card balance-card ${walletSummary.balance >= 0 ? 'positive' : 'negative'}`}>
                  <span className="card-icon">🏦</span>
                  <span className="card-label">Net Balance</span>
                  <span className="card-amount">₹{walletSummary.balance?.toFixed(2) || '0.00'}</span>
                  <span className="card-status">
                    {walletSummary.balance >= 0 ? 'You will receive' : 'You owe'}
                  </span>
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
