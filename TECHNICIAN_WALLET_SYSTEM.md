# 💰 Technician Wallet & Commission System

## Overview
Every technician now has their own wallet dashboard showing real-time commission calculations based on their ticket activity. The system automatically tracks:
- **Credits**: Commissions earned from In Store tickets
- **Debits**: Commissions owed from Third Party tickets
- **Net Balance**: The final amount they will receive or owe

---

## 🎯 How It Works

### **Commission Logic**

#### **Third Party Tickets (Out of Store)**
- Technician takes product to their own workshop
- **Technician collects money** from customer
- **Technician owes commission** to store owner
- **Result**: DEBIT in technician's wallet

**Example:**
- Third Party ticket with ₹500 commission
- Technician wallet: **-₹500** (debit)
- Meaning: Tech owes ₹500 to store

#### **In Store Tickets (Inside Store)**
- Repair done inside store premises
- **Store owner collects money** from customer
- **Store owner owes commission** to technician
- **Result**: CREDIT in technician's wallet

**Example:**
- In Store ticket with ₹500 commission
- Technician wallet: **+₹500** (credit)
- Meaning: Store owes ₹500 to tech

---

## 📊 Wallet Dashboard Features

### **1. Wallet Overview Cards**
When a technician logs in, they see three colorful cards:

#### **💵 Credits Card (Green)**
- Shows total commission from In Store tickets
- Displays number of In Store tickets
- Example: "₹2,500 | 5 tickets"

#### **💸 Debits Card (Orange)**
- Shows total commission from Third Party tickets
- Displays number of Third Party tickets
- Example: "₹1,000 | 2 tickets"

#### **🏦 Net Balance Card (Blue/Green/Red)**
- Calculates: Credits - Debits
- Color changes based on balance:
  - **Green**: Positive (tech will receive money)
  - **Red**: Negative (tech owes money)
- Shows status: "You will receive" or "You owe"
- Example: "₹1,500 | You will receive"

---

### **2. Transaction History**
Click "📜 View Transaction History" to see detailed breakdown:

#### **Commission History Tab**
Shows all ticket-based transactions:
- Date of ticket
- Ticket number
- Customer name
- Category (Third Party / In Store)
- Transaction type (Credit / Debit)
- Commission amount

**Example Table:**
| Date | Ticket # | Customer | Category | Type | Amount |
|------|----------|----------|----------|------|--------|
| 30/12/24 | #712873939 | Mubina Mulla | Third Party | 💸 Debit | -₹400,000 |
| 29/12/24 | #712873940 | John Doe | In Store | 💵 Credit | +₹500 |

#### **Manual Transactions Tab**
Shows admin-added adjustments:
- Manual credits or debits
- Custom descriptions
- Balance corrections
- Settlement payments

---

## 🔢 Calculation Example

### Scenario:
Azim Khan (from your screenshot) has:
- Phone: 8754356263
- Skills: Electrition
- Current Wallet: ₹-387265.00 (showing in red)

### Breakdown:
```
Third Party Tickets:
Ticket #712873939 | ₹400,000 commission → DEBIT

In Store Tickets:
Ticket #712873940 | ₹500 commission → CREDIT
Ticket #712873941 | ₹300 commission → CREDIT
Ticket #712873942 | ₹200 commission → CREDIT
... (more tickets) ...
Total In Store: ₹12,735

Net Calculation:
Credits (In Store):  ₹12,735
Debits (Third Party): ₹400,000
─────────────────────────────
Net Balance: -₹387,265

Status: "You owe ₹387,265"
```

This means Azim owes ₹387,265 to the store because he collected ₹400,000 in commissions from Third Party tickets but only earned ₹12,735 from In Store work.

---

## 🖥️ User Interface

### **Technician Dashboard View**
```
┌─────────────────────────────────────────────────────┐
│ 🔧 Azim Khan's Dashboard                            │
│ User ID: AK001                                      │
├─────────────────────────────────────────────────────┤
│ Phone: 8754356263                                   │
│ Skills: Electrition                                 │
├─────────────────────────────────────────────────────┤
│ 💰 Wallet Overview                                  │
│                                                     │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│ │ 💵 Credits │  │ 💸 Debits  │  │ 🏦 Balance │   │
│ │            │  │            │  │            │   │
│ │ In Store   │  │Third Party │  │ Net Amount │   │
│ │ ₹12,735    │  │ ₹400,000   │  │ -₹387,265  │   │
│ │ 18 tickets │  │ 6 tickets  │  │ You owe    │   │
│ └────────────┘  └────────────┘  └────────────┘   │
│                                                     │
│ [📜 View Transaction History]                      │
└─────────────────────────────────────────────────────┘
```

### **Transaction History Modal**
```
┌─────────────────────────────────────────────────────┐
│ 💰 Wallet & Transaction History - Azim Khan    [✕] │
├─────────────────────────────────────────────────────┤
│ Wallet Summary                                      │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│ │💵₹12,735  │ │💸₹400,000 │ │🏦-₹387,265│         │
│ └───────────┘ └───────────┘ └───────────┘         │
├─────────────────────────────────────────────────────┤
│ [Commission History] [Manual Transactions]          │
├─────────────────────────────────────────────────────┤
│ Commission-Based Transactions                       │
│                                                     │
│ Date     | Ticket # | Customer | Type   | Amount  │
│ 30/12/24 | #712... | Mubina   | 💸Debit | -₹400k │
│ 29/12/24 | #713... | John     | 💵Credit| +₹500  │
│ 28/12/24 | #714... | Sarah    | 💵Credit| +₹300  │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

---

## 📱 Features for Technicians

### **Real-Time Updates**
- Wallet updates automatically when tickets are created
- No manual entry required
- Instant visibility of earnings and debts

### **Transparency**
- See every transaction that affects wallet
- Track ticket numbers and customers
- Understand exactly where money comes from

### **Easy Navigation**
- One-click access to transaction history
- Color-coded for quick understanding
- Mobile-responsive design

---

## 🔧 Technical Implementation

### **Files Modified**
1. **TechnicianPortal.js**
   - Added wallet calculation logic
   - Created transaction history array
   - Updated UI with wallet cards

2. **CustomerHistory.js**
   - Added tabs for commission vs manual transactions
   - Added wallet summary display
   - Enhanced transaction table

3. **TechnicianPortal.css**
   - Added wallet card styles
   - Added gradient backgrounds
   - Made responsive

4. **CustomerHistory.css**
   - Added summary card styles
   - Added tab navigation styles
   - Added category badges

### **Data Structure**
No database changes required! System uses existing ticket data:
```javascript
// Automatically calculated from tickets
{
  category: "Third Party" → Creates DEBIT
  category: "In Store" → Creates CREDIT
  commissionAmount: 500 → Amount
}
```

### **Calculation Formula**
```javascript
Credits = Sum of commissionAmount from In Store tickets
Debits = Sum of commissionAmount from Third Party tickets
Net Balance = Credits - Debits
```

---

## ✅ Benefits

### **For Technicians**
- ✅ Clear visibility of earnings
- ✅ Understand debts to store
- ✅ Track individual ticket commissions
- ✅ Professional dashboard

### **For Store Owner**
- ✅ Technicians can self-service their balance
- ✅ Reduced queries about payments
- ✅ Transparent commission system
- ✅ Easy to verify calculations

### **For System**
- ✅ No database changes needed
- ✅ Automatic calculations
- ✅ Real-time updates
- ✅ No manual entry errors

---

## 🎨 Design Highlights

### **Color Coding**
- 🟢 **Green**: Credits/Earnings (In Store)
- 🟠 **Orange**: Debits/Owed (Third Party)
- 🔵 **Blue**: Neutral balance display
- 🔴 **Red**: Negative balance (owe money)

### **Icons**
- 💵: Credits/Money earned
- 💸: Debits/Money owed
- 🏦: Net balance/Bank
- 📜: Transaction history

### **Visual Hierarchy**
1. Most important: Net Balance (largest, colored)
2. Supporting info: Credits & Debits (medium)
3. Details: Transaction history (accessible on click)

---

## 📖 How to Use (Technician Guide)

1. **Login to your portal** using User ID and Password
2. **View your dashboard** - wallet cards appear below your info
3. **Check your balance**:
   - Green card = You'll get paid
   - Red card = You owe money
4. **Click "View Transaction History"** to see details
5. **Switch tabs**:
   - "Commission History" = Ticket-based transactions
   - "Manual Transactions" = Admin adjustments
6. **Review each transaction** to understand your balance

---

## 🚀 Future Enhancements (Potential)

- 📊 Monthly commission reports
- 📈 Earnings trends and graphs
- 🔔 Notifications for new commissions
- 💳 Payment request feature
- 📄 Export transaction history to PDF
- 🎯 Commission goals and achievements

---

## 📝 Summary

The technician wallet system provides complete transparency in commission management. Every technician can now:
- See their real-time wallet balance
- Understand credits (earnings) vs debits (owed)
- Track every ticket's commission
- Access detailed transaction history
- Know exactly what they'll receive or owe

**No manual calculation needed - everything is automatic!** 🎉
