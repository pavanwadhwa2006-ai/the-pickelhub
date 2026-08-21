/**
 * ProtectedRoute Component
 *
 * Route guard requiring active authentication and optional role authorization.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#3b3423] border-t-[#ff3b3f] animate-spin" />
        <span className="text-xs font-bold tracking-[0.2em] text-[#ad8885] uppercase">
          VERIFYING CREDENTIALS...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 bg-[#251f10] border border-[#ff5451]/40 text-center">
        <div className="inline-block px-3 py-1 bg-[#ff5451]/20 text-[#ffb4ab] text-xs font-bold tracking-widest uppercase mb-4">
          ACCESS RESTRICTED
        </div>
        <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#ede1c9] mb-3">
          Unauthorized Access
        </h2>
        <p className="text-sm text-[#d8cdb5] mb-6">
          Your account role (<span className="text-[#ffb3ad] font-bold">{user?.role}</span>) does not have permission to view this administrative resource.
        </p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
