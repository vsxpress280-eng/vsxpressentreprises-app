import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainHeader from '@/components/MainHeader';
import OfflineHandler from '@/components/OfflineHandler';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import CreateAccountForm from '@/pages/admin/CreateAccountForm';
import CreateAccount from '@/pages/admin/CreateAccount'; 
import CreateAgentForm from '@/pages/admin/CreateAgentForm';
import CreateWorkerForm from '@/pages/admin/CreateWorkerForm';
import UsersManager from '@/pages/admin/UsersManager';
import TeamsManager from '@/pages/admin/TeamsManager';
import WorkerReassignment from '@/pages/admin/WorkerReassignment';
import AdminWorkerManagement from '@/pages/admin/AdminWorkerManagement';
import AdminAdjustments from '@/pages/admin/AdminAdjustments';
import DepositsDashboard from '@/pages/admin/DepositsDashboard';
import TransactionsDashboard from '@/pages/admin/TransactionsDashboard';
import RegistrationRequestsList from '@/pages/admin/RegistrationRequestsList';
import AdminStats from '@/pages/admin/AdminStats';
import AgentDashboard from '@/pages/agent/AgentDashboard';
import AgentStats from '@/pages/agent/AgentStats';
import AgentSettings from '@/pages/agent/AgentSettings';
import CreateTransferForm from '@/pages/agent/CreateTransferForm';
import DepositForm from '@/pages/agent/DepositForm';
import DepositHistory from '@/pages/agent/DepositHistory';
import History from '@/pages/agent/History';
import TransferDetailAgent from '@/pages/agent/history/TransferDetail';
import WorkerDashboard from '@/pages/worker/WorkerDashboard';
import WorkerStats from '@/pages/worker/WorkerStats';
import WorkerTransfers from '@/pages/worker/WorkerTransfers';
import TransferDetail from '@/pages/worker/TransferDetail';
import WorkerAdjustments from '@/pages/worker/WorkerAdjustments';
import WorkerSettings from '@/pages/worker/WorkerSettings';
import SpecialAgentDashboard from '@/pages/special-agent/SpecialAgentDashboard';
import SetSecurityQuestion from '@/pages/auth/SetSecurityQuestion';
import ResetPassword from '@/pages/auth/ResetPassword';
import ChangePassword from '@/pages/profile/ChangePassword';
import Profile from '@/pages/profile/Profile';
import AdjustmentPage from '@/pages/adjustment/AdjustmentPage';
import MyAdjustmentsPage from '@/pages/adjustment/MyAdjustmentsPage';
import { Toaster } from '@/components/ui/toaster';

const MainLayout = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/auth/reset-password', '/auth/set-security-question'].includes(location.pathname);

  return (
    <>
      <MainHeader />
      <div className={`${!isAuthPage ? 'pt-[64px]' : ''} min-h-screen bg-[#0B0B0B]`}>
        <Outlet />
      </div>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <OfflineHandler />
      
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          
          <Route element={<MainLayout />}>
            
            <Route path="/auth/set-security-question" element={
              <ProtectedRoute>
                <SetSecurityQuestion />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['agent', 'worker', 'special-agent', 'admin']}>
                <Profile />
              </ProtectedRoute>
            } />

            <Route path="/profile/change-password" element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/create-account-legacy" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CreateAccountForm />
              </ProtectedRoute>
            } />

            <Route path="/admin/create-account" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CreateAccount />
              </ProtectedRoute>
            } />

            <Route path="/admin/create-agent" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CreateAgentForm />
              </ProtectedRoute>
            } />

            <Route path="/admin/create-worker" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CreateWorkerForm />
              </ProtectedRoute>
            } />

            <Route path="/admin/users-manager" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersManager />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/teams" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TeamsManager />
              </ProtectedRoute>
            } />

            <Route path="/admin/worker-reassignment" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <WorkerReassignment />
              </ProtectedRoute>
            } />

            <Route path="/admin/worker-management" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminWorkerManagement />
              </ProtectedRoute>
            } />

            {/* Note: /admin/adjustments already existed but we are adding the new AdjustmentPage 
                at /adjustment as requested. Keeping existing routes intact but adding new ones. */}
            <Route path="/admin/adjustments" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAdjustments />
              </ProtectedRoute>
            } />

            {/* New Route for Admin Adjustment Creation */}
            <Route path="/adjustment" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdjustmentPage />
              </ProtectedRoute>
            } />
            
            {/* New Route for User Adjustment Acceptance */}
            <Route path="/adjustment/my-adjustments" element={
              <ProtectedRoute allowedRoles={['agent', 'worker', 'special-agent']}>
                <MyAdjustmentsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/deposits-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DepositsDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin/transactions" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TransactionsDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin/registration-requests" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RegistrationRequestsList />
              </ProtectedRoute>
            } />

            <Route path="/admin/stats" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminStats />
              </ProtectedRoute>
            } />

            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            } />
            
            <Route path="/agent/dashboard" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentDashboard />
              </ProtectedRoute>
            } />

            <Route path="/agent/settings" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentSettings />
              </ProtectedRoute>
            } />
            
            <Route path="/agent/create-transfer" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <CreateTransferForm />
              </ProtectedRoute>
            } />
            
            <Route path="/agent/deposit" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <DepositForm />
              </ProtectedRoute>
            } />

            <Route path="/agent/deposit-form" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <DepositForm />
              </ProtectedRoute>
            } />

            <Route path="/agent/deposit-history" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <Navigate to="/agent/history?tab=deposits" replace />
              </ProtectedRoute>
            } />

            <Route path="/agent/history" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <History />
              </ProtectedRoute>
            } />

            <Route path="/agent/history/transfer/:id" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <TransferDetailAgent />
              </ProtectedRoute>
            } />

            <Route path="/agent/stats" element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentStats />
              </ProtectedRoute>
            } />
            
            <Route path="/worker/dashboard" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerDashboard />
              </ProtectedRoute>
            } />

            <Route path="/worker/profile" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/worker/transfers" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerTransfers />
              </ProtectedRoute>
            } />

            <Route path="/worker/transfer/:id" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <TransferDetail />
              </ProtectedRoute>
            } />

            <Route path="/worker/adjustments" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerAdjustments />
              </ProtectedRoute>
            } />

            <Route path="/worker/settings" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerSettings />
              </ProtectedRoute>
            } />

            <Route path="/worker/stats" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerStats />
              </ProtectedRoute>
            } />
            
            <Route path="/special-agent/dashboard" element={
              <ProtectedRoute allowedRoles={['special-agent']}>
                <SpecialAgentDashboard />
              </ProtectedRoute>
            } />
            
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;