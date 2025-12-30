import React, { useState, useEffect } from 'react'
import { LayoutDashboard, Box, ShoppingCart, Users, TrendingUp, Package, LogOut, Plus, X, FileText, Shield, User, Settings, Key, UserCircle, Loader2, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Login from './auth/Login'
import VerifyEmail from './auth/VerifyEmail'
import ProductForm from './components/ProductForm'
import ProductList from './components/ProductList'
import BulkUpload from './components/BulkUpload'
import DashboardStats from './pages/DashboardStats'
import OrderManagement from './pages/OrderManagement'
import StaffManagement from './pages/StaffManagement'

function SettingsModal({ isOpen, onClose }) {
  const { userProfile, changePassword, updateUserData } = useAuth();
  const [name, setName] = useState(userProfile?.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    try {
      if (name !== userProfile?.name) {
        await updateUserData({ name });
      }
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await changePassword(newPassword);
      }
      setSuccess('Settings updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-4xl overflow-hidden shadow-2xl relative animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors">
          <X size={20} />
        </button>
        
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-600/10 rounded-2xl">
              <Settings size={24} className="text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Account Settings</h3>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-bold flex items-center gap-2">
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Change Password</label>
              <div className="space-y-3">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-3xl text-sm shadow-xl shadow-blue-900/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4 uppercase tracking-widest"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Add CheckCircle for settings success alert
function CheckCircle({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

function NavItem({ icon, label, to, collapsed }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : ""}
      className={({ isActive }) => `flex items-center transition-all duration-300 group relative ${
        collapsed ? 'justify-center p-4 w-14 h-14 mx-auto' : 'w-full gap-4 px-6 py-4'
      } rounded-2xl ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' + (!collapsed ? ' translate-x-1' : '') 
          : 'text-slate-200 hover:bg-slate-800/40 hover:text-white'
      }`}
    >
      {({ isActive }) => (
        <>
          <div className={`${isActive ? 'text-white' : 'text-slate-300 group-hover:text-blue-400'} transition-colors shrink-0`}>
            {icon}
          </div>
          {!collapsed && (
            <>
              <span className={`font-black text-[10px] uppercase tracking-[0.2em] ${isActive ? 'text-white' : 'text-slate-200'} truncate`}>
                {label}
              </span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_#fff]"></div>}
            </>
          )}
          {collapsed && isActive && (
            <div className="absolute right-0 w-1 h-6 bg-white rounded-l-full shadow-[0_0_10px_#fff]"></div>
          )}
        </>
      )}
    </NavLink>
  )
}

function StatCard({ title, value, change, danger = false }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-2xl">
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-bold">{value}</h3>
        <span className={`text-sm font-bold ${danger ? 'text-red-400' : 'text-emerald-400'}`}>
          {change}
        </span>
      </div>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-red-500/30 p-12 rounded-4xl text-center max-w-lg shadow-2xl">
        <div className="inline-flex p-6 bg-red-500/20 rounded-full mb-6 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <Shield size={64} className="text-red-400" />
        </div>
        <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Unauthorized Access</h2>
        <p className="text-slate-200 text-lg font-medium leading-relaxed">
          This section is reserved for Administrators only. Please use the <span className="text-blue-400 font-bold">Orders</span> tab for sales terminal logic.
        </p>
      </div>
    </div>
  );
}

function DashboardLayout({ children }) {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('shophub_sidebar_collapsed') === 'true';
  });
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false); // Close mobile menu on route change
  }, [location]);

  useEffect(() => {
    localStorage.setItem('shophub_sidebar_collapsed', isCollapsed);
  }, [isCollapsed]);

  return (
    <div className="flex h-screen bg-transparent text-slate-50 font-sans overflow-hidden relative">
      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/40">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-lg font-black text-white tracking-tight">SHOPHUB</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[45] animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-[50]
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-24' : 'md:w-72'} 
        w-72 bg-slate-900/90 md:bg-slate-900/80 backdrop-blur-2xl border-r border-slate-700/50 p-6 flex flex-col shadow-2xl transition-all duration-500 ease-in-out group/sidebar
      `}>
        {/* Toggle Button (Desktop Only) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-4 top-10 w-8 h-8 bg-blue-600 rounded-full items-center justify-center border border-slate-700 shadow-xl opacity-0 group-hover/sidebar:opacity-100 transition-all hover:scale-110 z-50 text-white"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Top: Branding & Nav (Scrollable) */}
        <div className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto scrollbar-none mb-6">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-10 transition-all duration-300`}>
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40 shrink-0">
              <Package size={isCollapsed ? 32 : 24} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-xl font-black text-white leading-none">S-BAKO</span>
                <span className="text-xl font-black text-white leading-none tracking-tighter">SHOPHUB</span>
              </div>
            )}
          </div>
          
          <nav className="space-y-2 flex-1">
            <NavItem icon={<LayoutDashboard size={22} />} label="Dashboard" to="/dashboard" collapsed={isCollapsed} />
            <NavItem icon={<Box size={22} />} label="Products" to="/products" collapsed={isCollapsed} />
            <NavItem icon={<ShoppingCart size={22} />} label="Orders" to="/orders" collapsed={isCollapsed} />
            <NavItem icon={<Users size={22} />} label="Staff" to="/staff" collapsed={isCollapsed} />
          </nav>
        </div>

        {/* Bottom: User Info (Outside scroll container to allow menu overflow) */}
        <div className={`mt-auto pt-6 border-t border-slate-700/50 relative ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center transition-all border ${
              isCollapsed ? 'p-1 rounded-xl w-14 h-14 justify-center' : 'w-full gap-3 p-3 rounded-2xl'
            } ${
              isProfileOpen ? 'bg-slate-700/50 border-slate-600' : 'bg-transparent border-transparent hover:bg-slate-800/40'
            }`}
          >
            <div className={`rounded-xl overflow-hidden shrink-0 shadow-lg shadow-blue-900/20 border border-slate-700 ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}>
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-black text-white truncate">{userProfile?.name || currentUser?.email.split('@')[0]}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">{userProfile?.role || 'Staff'}</p>
              </div>
            )}
          </button>

          {isProfileOpen && (
            <div className={`absolute bottom-0 mb-0 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-left-2 duration-200 z-50 ${isCollapsed ? 'left-full ml-4 w-48' : 'left-0 w-full bottom-full mb-2'}`}>
              <button 
                onClick={() => { setIsSettingsOpen(true); setIsProfileOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-4 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all border-b border-slate-800"
              >
                <Settings size={18} />
                Account Settings
              </button>
              <button 
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-4 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-auto pt-24 md:pt-10">
        <Routes>
          <Route path="dashboard" element={isAdmin ? <DashboardStats /> : <AccessDenied />} />
          <Route path="products" element={isAdmin ? <ProductsView /> : <AccessDenied />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="staff" element={isAdmin ? <StaffManagement /> : <AccessDenied />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ProductsView() {
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Product Catalog</h2>
          <p className="text-slate-400">Manage your inventory across shop and warehouse</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setShowBulkUpload(!showBulkUpload); setShowProductForm(false); }}
            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95 ${
              showBulkUpload ? 'bg-slate-700 text-white border border-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {showBulkUpload ? <X size={20} /> : <FileText size={20} />}
            {showBulkUpload ? 'Cancel Upload' : 'Bulk Upload (CSV)'}
          </button>
          <button 
            onClick={() => { setShowProductForm(!showProductForm); setShowBulkUpload(false); }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2 active:scale-95"
          >
            {showProductForm ? <X size={20} /> : <Plus size={20} />}
            {showProductForm ? 'Cancel' : 'Add New Product'}
          </button>
        </div>
      </header>

      {showProductForm && (
        <div className="max-w-4xl mx-auto bg-slate-800/20 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-md mb-10">
          <ProductForm onComplete={() => setShowProductForm(false)} />
        </div>
      )}

      {showBulkUpload && (
        <div className="max-w-4xl mx-auto bg-slate-800/20 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-md mb-10">
          <BulkUpload onComplete={() => setShowBulkUpload(false)} />
        </div>
      )}

      {!showProductForm && !showBulkUpload && <ProductList />}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!currentUser.emailVerified) return <Navigate to="/verify-email" replace />;
  
  return children;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}
