import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import HomePage from "./pages/HomePage";
import AboutUs from "./pages/AboutUsPage";
import FindWorker from "./pages/FindandWorkerPage";
import Subscriptions from "./pages/SubscriptionsPage";
import ContactUs from "./pages/ContactUsPage";
import RoleSelectionPage from './pages/RoleSelectionPage';
import Register from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import CustomerDashboard from './components/Dashboards/CustomerDashboard';
import LaborDashboard from './components/Dashboards/LaborDashboard';
import AdminDashboard from './components/Dashboards/AdminDashboard';

// ✅ NEW: Card payment page
import CardPaymentForm from './pages/Payments/CardPaymentForm';

const ProtectedRoute = ({ children, role }) => {
  const { auth } = useAuth();

  // If context hasn't loaded yet, you can show a tiny fallback (optional)
  // if (auth.loading) return null;

  if (!auth?.token) return <Navigate to="/login" replace />;
  if (role && auth?.role !== role) return <Navigate to="/" replace />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/find-worker" element={<FindWorker />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/select-role" element={<RoleSelectionPage />} />
          <Route path="/register/:role" element={<Register />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected: Customer */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute role="Customer">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          {/* ✅ NEW: Protected payment page for customers */}
          <Route
            path="/payments/card"
            element={
              <ProtectedRoute role="Customer">
                <CardPaymentForm />
              </ProtectedRoute>
            }
          />

          {/* Protected: Labor */}
          <Route
            path="/labor/dashboard"
            element={
              <ProtectedRoute role="Labor">
                <LaborDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected: Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="Admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
