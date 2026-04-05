import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, getUserRole } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [checkComplete, setCheckComplete] = useState(false);
  const verificationCompleteRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    if (verificationCompleteRef.current) return;

    const checkRole = async () => {
      // If user is not present but loading is false, just finish check
      if (!user) {
        if (isMounted) {
          setRoleLoading(false);
          setCheckComplete(true);
          verificationCompleteRef.current = true;
        }
        return;
      }

      try {
        const role = await getUserRole();
        if (isMounted) {
          setUserRole(role);
          setRoleLoading(false);
          setCheckComplete(true);
          verificationCompleteRef.current = true;
        }
      } catch (error) {
        console.error("Role check failed", error);
        if (isMounted) {
          setRoleLoading(false);
          setCheckComplete(true);
          verificationCompleteRef.current = true;
        }
      }
    };

    if (!loading) {
      // Timeout de sécurité : si ça prend plus de 5 secondes, on arrête le loading
      timeoutId = setTimeout(() => {
        if (isMounted && !verificationCompleteRef.current) {
          console.warn("Role check timeout - forcing completion");
          setRoleLoading(false);
          setCheckComplete(true);
          verificationCompleteRef.current = true;
        }
      }, 5000);

      checkRole();
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, getUserRole, user]);

  // Show loading while auth or role check is in progress
  if (loading || (user && roleLoading && !checkComplete)) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mx-auto mb-4" />
          <p className="text-[#A0A0A0]">Vérification de l'accès...</p>
        </motion.div>
      </div>
    );
  }

  // Not authenticated -> Login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role restriction check
  if (allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    const homePath = {
      'admin': '/admin/dashboard',
      'agent': '/agent/dashboard',
      'worker': '/worker/dashboard',
      'special-agent': '/special-agent/dashboard'
    }[userRole] || '/login';

    // Prevent infinite redirect loop if trying to access home path itself
    if (location.pathname === homePath) {
      return <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-red-500">Access Denied</div>;
    }

    return <Navigate to={homePath} replace />;
  }

  return children;
};

export default ProtectedRoute;