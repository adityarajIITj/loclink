import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import DashboardLinks from './pages/DashboardLinks';
import LinkDetail from './pages/LinkDetail';
import Settings from './pages/Settings';
import PublicLink from './pages/PublicLink';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public link page — no navbar */}
          <Route path="/l/:token" element={<PublicLink />} />

          {/* All other pages with navbar */}
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-slate-950 text-white">
                <Navbar />
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardOverview />} />
                    <Route path="links" element={<DashboardLinks />} />
                    <Route path="links/:id" element={<LinkDetail />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
