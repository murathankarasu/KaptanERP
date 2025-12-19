# Kaptan - Advanced Business Management System

A comprehensive, multi-tenant Business Management System built with React, Vite, and Firebase (Firestore). Designed with a minimalist black-and-white UI, Kaptan provides modular solutions for SCM, CRM, Finance, Production, and HR.

## 🚀 Key Features

### 📦 Supply Chain & Inventory (SCM)
- **Stock Tracking:** Real-time entry/output tracking with SKU, serial/lot, and expiry date support.
- **WMS:** Bin locations management for optimized warehouse organization.
- **Procurement:** Full cycle from Requisition -> RFQ -> Purchase Order -> Goods Receipt (GRN).
- **Unit Conversions:** Automatic conversion between base units and sale/purchase units.

### 🤝 Sales & Customer Relations (CRM)
- **Customer Management:** Comprehensive profiles with credit limits, balance tracking, and groups.
- **Order-to-Cash:** Integrated flow for Quotes -> Orders -> Shipments -> Invoices.
- **Price Rules:** Automated pricing based on customer groups, quantities, and date ranges.
- **Customer Insights:** AI-powered analysis of top products, payment habits, and churn risk.

### 💰 Financial Management
- **General Ledger:** Multi-currency journal entries with automated exchange rate conversion.
- **AP/AR:** Automated tracking of accounts payable and receivable.
- **e-Transformation:** Local generation of UBL-TR XML and PDF for e-Invoice, e-Archive, and e-Waybill.
- **Aging Reports:** Detailed customer balance aging for cash flow management.

### 🏭 Production Management (MRP & MES)
- **BOM:** Multi-level Bill of Materials management.
- **MRP:** Automated material requirements planning based on orders and current stock.
- **Shop Floor Control:** Real-time production order tracking, workstation logs, and duration reports.

### 👥 Human Resources (HRM)
- **Personnel Management:** Automated personnel card creation for new users.
- **Leave Management:** Digital request and approval workflow for employee leave.
- **Payroll Calculator:** Turkish regulation compliant payroll calculations (Gross to Net).

### 🤖 AI Capabilities
- **Smart Reconciliation:** ML-powered bank statement matching.
- **Forecasting:** Cash flow and demand forecasting using historical data.
- **Sales Assistant:** Generative AI for follow-up emails and customer engagement.
- **Autonomous Reporting:** Chat with your data using natural language.

## 🛠 Technical Stack
- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Firebase Firestore (Multi-tenant architecture)
- **Authentication:** Firebase Auth (Google & Password-based)
- **Visualization:** Recharts for analytics dashboards
- **Reporting:** Excel (XLSX) and PDF (jsPDF) export capabilities
- **AI Engine:** OpenAI GPT-4o Mini for intelligent processing

## ⚙️ Configuration

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=...
VITE_OPENAI_API_KEY=...
```

3. Run in development mode:
```bash
npm run dev
```

## 🔒 Security & Multi-tenancy
Kaptan uses a strict `companyId` filtering mechanism across all services, ensuring data isolation for each registered firm. User roles (Admin, Manager, User) and granular permissions control access to specific modules.

## 📄 License
MIT
