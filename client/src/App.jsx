/**
 * Main Application Component
 *
 * Configures client routing, global layout, authentication context,
 * and top scroll progress indicator.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollProgressBar from './components/ScrollProgressBar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import TournamentsPage from './pages/TournamentsPage';
import SubmitMatchPage from './pages/SubmitMatchPage';
import ComparePage from './pages/ComparePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollProgressBar />
        <div className="min-h-screen flex flex-col bg-[#181305] text-[#ede1c9]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/players/:id" element={<PlayerProfilePage />} />

              {/* Protected Member Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/matches/submit"
                element={
                  <ProtectedRoute>
                    <SubmitMatchPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Catch-All */}
              <Route
                path="*"
                element={
                  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                    <span className="text-5xl font-['Playfair_Display'] font-bold text-[#ff3b3f] mb-3">
                      404
                    </span>
                    <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#ede1c9] mb-2">
                      Page Not Found
                    </h2>
                    <p className="text-xs text-[#9a8e7a] mb-6">
                      The court or page you are looking for does not exist.
                    </p>
                    <Navigate to="/" replace />
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
