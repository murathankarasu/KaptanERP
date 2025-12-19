import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase/config';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StockEntry from './pages/StockEntry';
import StockOutput from './pages/StockOutput';
import StockStatus from './pages/StockStatus';
import ZimmetSignature from './pages/ZimmetSignature';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
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

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/stock-entry" 
          element={user ? <StockEntry /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/stock-output" 
          element={user ? <StockOutput /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/stock-status" 
          element={user ? <StockStatus /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/zimmet-signature/:outputId" 
          element={user ? <ZimmetSignature /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;

