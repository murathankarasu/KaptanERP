import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase/config';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import StockEntry from './pages/StockEntry';
import StockOutput from './pages/StockOutput';
import StockStatus from './pages/StockStatus';
import StockStatusDetail from './pages/StockStatusDetail';
import ZimmetSignature from './pages/ZimmetSignature';
import PersonnelManagement from './pages/PersonnelManagement';
import OrderManagement from './pages/OrderManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import AdminPanel from './pages/AdminPanel';
import ActivityLogs from './pages/ActivityLogs';
import TransactionOrders from './pages/TransactionOrders';
import CustomerManagement from './pages/CustomerManagement';
import ShipmentManagement from './pages/ShipmentManagement';
import CustomerPayments from './pages/CustomerPayments';
import CustomerAgingReport from './pages/CustomerAgingReport';
import JournalEntries from './pages/JournalEntries';
import ProductManagement from './pages/ProductManagement';
import RequisitionManagement from './pages/RequisitionManagement';
import RFQManagement from './pages/RFQManagement';
import PurchaseOrderManagement from './pages/PurchaseOrderManagement';
import GoodsReceiptManagement from './pages/GoodsReceiptManagement';
import EDocsLocal from './pages/EDocsLocal';
import PriceListManagement from './pages/PriceListManagement';
import CustomerInsights from './pages/CustomerInsights';
import QuoteManagement from './pages/QuoteManagement';
import BOMManagement from './pages/BOMManagement';
import MRPPlanner from './pages/MRPPlanner';
import ShopFloor from './pages/ShopFloor';
import LeaveManagement from './pages/LeaveManagement';
import PayrollCalculator from './pages/PayrollCalculator';
import SettingsPage from './pages/Settings';
import SalesInvoices from './pages/SalesInvoices';
import Signup from './pages/Signup';
import InviteAdmin from './pages/InviteAdmin';
import About from './pages/About';
import AIAssistantPage from './pages/AIAssistant';
import AIChat from './pages/ai-tools/AIChat';
import StockAnalysis from './pages/ai-tools/StockAnalysis';
import DailyReport from './pages/ai-tools/DailyReport';
import AnomalyDetection from './pages/ai-tools/AnomalyDetection';
import FinancialInsights from './pages/ai-tools/FinancialInsights';
import Predictions from './pages/ai-tools/Predictions';
import BarcodeScanner from './pages/BarcodeScanner';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase auth state kontrolü
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Yükleniyor...
      </div>
    );
  }

  // Kullanıcı kontrolü: Firebase auth veya localStorage'dan
  const isAuthenticated = () => {
    // Firebase auth varsa (Google ile giriş)
    if (user) return true;
    
    // localStorage'da kullanıcı varsa (şifre ile giriş)
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        // Admin kullanıcıları normal uygulamaya giremez
        if (userData.role === 'admin') {
          return false;
        }
        // Normal kullanıcılar girebilir
        return true;
      } catch (error) {
        return false;
      }
    }
    
    return false;
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/signup"
          element={<Signup />}
        />
        <Route
          path="/admin-login"
          element={<AdminLogin />}
        />
        <Route
          path="/invite-admin"
          element={isAuthenticated() ? <InviteAdmin /> : <Navigate to="/login" />}
        />
        <Route
          path="/about"
          element={isAuthenticated() ? <About /> : <Navigate to="/login" />}
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/stock-entry" 
          element={isAuthenticated() ? <StockEntry /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/stock-output" 
          element={isAuthenticated() ? <StockOutput /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/stock-status" 
          element={isAuthenticated() ? <StockStatus /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/stock-status-detail" 
          element={isAuthenticated() ? <StockStatusDetail /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/zimmet-signature/:outputId" 
          element={isAuthenticated() ? <ZimmetSignature /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/personnel-management" 
          element={isAuthenticated() ? <PersonnelManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/order-management" 
          element={isAuthenticated() ? <OrderManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/warehouse-management" 
          element={isAuthenticated() ? <WarehouseManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/customer-management" 
          element={isAuthenticated() ? <CustomerManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/shipment-management" 
          element={isAuthenticated() ? <ShipmentManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/customer-payments" 
          element={isAuthenticated() ? <CustomerPayments /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/customer-aging" 
          element={isAuthenticated() ? <CustomerAgingReport /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/journal-entries" 
          element={isAuthenticated() ? <JournalEntries /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/product-management" 
          element={isAuthenticated() ? <ProductManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/requisition-management" 
          element={isAuthenticated() ? <RequisitionManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/rfq-management" 
          element={isAuthenticated() ? <RFQManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/purchase-orders" 
          element={isAuthenticated() ? <PurchaseOrderManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/goods-receipts" 
          element={isAuthenticated() ? <GoodsReceiptManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/edocs-local" 
          element={isAuthenticated() ? <EDocsLocal /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/price-lists" 
          element={isAuthenticated() ? <PriceListManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/customer-insights" 
          element={isAuthenticated() ? <CustomerInsights /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/bom" 
          element={isAuthenticated() ? <BOMManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/mrp" 
          element={isAuthenticated() ? <MRPPlanner /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/shop-floor" 
          element={isAuthenticated() ? <ShopFloor /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/leave-management" 
          element={isAuthenticated() ? <LeaveManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/payroll" 
          element={isAuthenticated() ? <PayrollCalculator /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={isAuthenticated() ? <SettingsPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/ai-assistant" 
          element={isAuthenticated() ? <AIAssistantPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/ai-tools/chat" 
          element={isAuthenticated() ? <AIChat /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/ai-tools/stock-analysis" 
          element={isAuthenticated() ? <StockAnalysis /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/ai-tools/daily-report" 
          element={isAuthenticated() ? <DailyReport /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/ai-tools/anomaly-detection" 
          element={isAuthenticated() ? <AnomalyDetection /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/ai-tools/financial-insights" 
          element={isAuthenticated() ? <FinancialInsights /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/ai-tools/predictions" 
          element={isAuthenticated() ? <Predictions /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/sales-invoices" 
          element={isAuthenticated() ? <SalesInvoices /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/quotes" 
          element={isAuthenticated() ? <QuoteManagement /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/activity-logs" 
          element={isAuthenticated() ? <ActivityLogs /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/transaction-orders" 
          element={<TransactionOrders />} 
        />
        <Route 
          path="/admin-panel" 
          element={<AdminPanel />} 
        />
        <Route 
          path="/barcode-scanner" 
          element={<BarcodeScanner />} 
        />
        <Route path="/" element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;

