import React, { useState, useEffect } from 'react'
import { LayoutDashboard, Box, ShoppingCart, Users, TrendingUp, Package, LogOut, Plus, X, FileText, Shield, User, Settings, Key, UserCircle, Loader2, ChevronLeft, ChevronRight, Menu, CheckCircle, Edit2, Trash2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Login from './auth/Login'
import VerifyEmail from './auth/VerifyEmail'
import Register from './auth/Register' // Added import
import ProductForm from './components/ProductForm'
import ProductList from './components/ProductList'
import BulkUpload from './components/BulkUpload'
import DashboardStats from './pages/DashboardStats'
import OrderManagement from './pages/OrderManagement'
import StaffManagement from './pages/StaffManagement'
import { db } from './services/firebase'
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { useStore, StoreProvider } from './context/StoreContext'

function CreateStoreModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const storeRef = await addDoc(collection(db, 'stores'), {
        name,
        ownerId: currentUser.uid,
        createdAt: serverTimestamp(),
        currency: 'NGN'
      });

      // Also add this store to the creator's allowed list
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        allowedStoreIds: arrayUnion(storeRef.id),
        updatedAt: serverTimestamp()
      });

      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create store branch.");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 w-full max-w-md rounded-3xl p-8 animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">New Branch</h2>
        <p className="text-slate-400 text-sm mb-6">Create a separate inventory location.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Branch Name</label>
            <input 
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Abuja Branch"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-500 font-medium hover:text-slate-900 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageStoresModal({ isOpen, onClose }) {
  const { stores, updateStore, deleteStore } = useStore();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (id) => {
    if (!editName) return;
    setLoading(true);
    try {
      await updateStore(id, { name: editName });
      setEditingId(null);
    } catch (err) {
      alert("Failed to update branch name.");
    }
    setLoading(false);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone and may leave products/orders without a branch.`)) {
      setLoading(true);
      try {
        await deleteStore(id);
      } catch (err) {
        alert("Failed to delete branch.");
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-3xl p-8 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Manage Branches</h2>
            <p className="text-slate-400 text-sm">Rename or remove existing branch locations.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300">
          {stores.map(store => (
            <div key={store.id} className="bg-white border border-slate-300 p-4 rounded-2xl flex items-center justify-between group">
              {editingId === store.id ? (
                <div className="flex-1 flex gap-2">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button 
                    onClick={() => handleUpdate(store.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-xl hover:bg-slate-800"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 text-slate-400 text-xs font-medium hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-slate-900 font-medium">{store.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">ID: {store.id}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingId(store.id); setEditName(store.name); }}
                      className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                      title="Rename Branch"
                    >
                      <Edit2 size={16} />
                    </button>
                    {!store.isDefault && (
                      <button 
                        onClick={() => handleDelete(store.id, store.name)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Branch"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {stores.length === 0 && (
            <div className="text-center py-10 text-slate-400 font-medium italic">No branches found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white border border-slate-300 w-full max-w-md rounded-4xl overflow-hidden shadow-2xl relative animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
          <X size={20} />
        </button>
        
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-slate-900/10 rounded-2xl">
              <Settings size={24} className="text-slate-900" />
            </div>
            <h3 className="text-2xl font-medium text-slate-900">Account Settings</h3>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-medium flex items-center gap-2">
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-300">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 ml-1">Change Password</label>
              <div className="space-y-3">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium"
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-3xl text-sm shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4 uppercase tracking-widest"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
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
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' + (!collapsed ? ' translate-x-1' : '') 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {({ isActive }) => (
        <>
          <div className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'} transition-colors shrink-0`}>
            {icon}
          </div>
          {!collapsed && (
            <>
              <span className={`font-bold text-[10px] uppercase tracking-[0.2em] ${isActive ? 'text-white' : 'text-slate-600'} truncate`}>
                {label}
              </span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]"></div>}
            </>
          )}
          {collapsed && isActive && (
            <div className="absolute right-0 w-1 h-6 bg-white rounded-l-full"></div>
          )}
        </>
      )}
    </NavLink>
  )
}

function StatCard({ title, value, change, danger = false }) {
  return (
    <div className="bg-slate-50 backdrop-blur-sm border border-slate-300 p-6 rounded-2xl">
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-medium">{value}</h3>
        <span className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-emerald-400'}`}>
          {change}
        </span>
      </div>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white backdrop-blur-2xl border border-red-500/30 p-12 rounded-4xl text-center max-w-lg shadow-2xl">
        <div className="inline-flex p-6 bg-red-500/20 rounded-full mb-6 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <Shield size={64} className="text-red-400" />
        </div>
        <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Unauthorized Access</h2>
        <p className="text-slate-800 text-lg font-medium leading-relaxed">
          This section is reserved for Administrators only. Please use the <span className="text-slate-900 font-medium">Orders</span> tab for sales terminal logic.
        </p>
      </div>
    </div>
  );
}

function DashboardLayout({ children }) {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { stores, currentStore, switchStore } = useStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [isManageStoresOpen, setIsManageStoresOpen] = useState(false);
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
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white backdrop-blur-xl border-b border-slate-300 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-slate-900 rounded-lg shadow-lg shadow-slate-900/20">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight shrink-0">SHOPHUB</span>
          {currentStore && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/10 border border-slate-800/20 rounded-lg ml-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold text-slate-900 uppercase tracking-tighter truncate max-w-[80px]">{currentStore.name}</span>
            </div>
          )}
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-700 hover:text-slate-900 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-50 backdrop-blur-sm z-[45] animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-[50]
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-24' : 'md:w-72'} 
        w-72 bg-white md:bg-white backdrop-blur-2xl border-r border-slate-300 p-6 flex flex-col shadow-2xl transition-all duration-500 ease-in-out group/sidebar
      `}>
        {/* Toggle Button (Desktop Only) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-4 top-10 w-8 h-8 bg-slate-900 rounded-full items-center justify-center border border-slate-300 shadow-xl opacity-0 group-hover/sidebar:opacity-100 transition-all hover:scale-110 z-50 text-white"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Top: Branding & Nav (Scrollable) */}
        <div className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto scrollbar-none mb-6">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-10 transition-all duration-300`}>
            <div className={`p-2.5 bg-slate-900 rounded-xl shadow-lg shadow-slate-900/20 shrink-0`}>
              <Package size={(isCollapsed && !isMobileMenuOpen) ? 32 : 24} className="text-white" />
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-xl font-bold text-slate-900 leading-none">S-BAKO</span>
                <span className="text-[10px] font-bold text-slate-900 leading-none tracking-[0.2em] mt-1">COSMETICS</span>
              </div>
            )}
          </div>

          {(!isCollapsed || isMobileMenuOpen) && isAdmin && (
            <div className="mb-6 px-2 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Branch</label>
                <button 
                  onClick={() => setIsManageStoresOpen(true)}
                  className="text-[10px] font-bold text-slate-900 hover:text-blue-600 uppercase tracking-widest transition-colors"
                >
                  Manage
                </button>
              </div>
              <div className="relative group">
                <select 
                  value={currentStore?.id || ''}
                  onChange={(e) => {
                    if (e.target.value === 'create') {
                      setIsCreateStoreOpen(true);
                    } else {
                      switchStore(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 appearance-none cursor-pointer font-medium text-sm transition-all hover:bg-white"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                  <option value="create">+ Create New Store</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Menu size={14} />
                </div>
              </div>
            </div>
          )}

          {(!isCollapsed || isMobileMenuOpen) && !isAdmin && currentStore && (
            <div className="mb-6 px-4 py-3 bg-slate-900/10 border border-slate-800/20 rounded-2xl animate-in fade-in duration-500">
               <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Active Branch</p>
               <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                 <Shield size={14} className="text-slate-900" />
                 {currentStore.name}
               </p>
            </div>
          )}
          
          <nav className="space-y-2 flex-1">
            <NavItem icon={<LayoutDashboard size={22} />} label="Dashboard" to="/dashboard" collapsed={isCollapsed} />
            <NavItem icon={<Box size={22} />} label="Products" to="/products" collapsed={isCollapsed} />
            <NavItem icon={<ShoppingCart size={22} />} label="Orders" to="/orders" collapsed={isCollapsed} />
            <NavItem icon={<Users size={22} />} label="Staff" to="/staff" collapsed={isCollapsed} />
          </nav>
        </div>

        {/* Bottom: User Info (Outside scroll container to allow menu overflow) */}
        <div className={`mt-auto pt-6 border-t border-slate-300 relative ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center transition-all border ${
              isCollapsed ? 'p-1 rounded-xl w-14 h-14 justify-center' : 'w-full gap-3 p-3 rounded-2xl'
            } ${
              isProfileOpen ? 'bg-slate-700/50 border-slate-600' : 'bg-transparent border-transparent hover:bg-white'
            }`}
          >
            <div className={`rounded-xl overflow-hidden shrink-0 shadow-lg shadow-slate-900/20 border border-slate-300 ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}>
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{userProfile?.name || currentUser?.email.split('@')[0]}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.1em]">{userProfile?.role || 'Staff'}</p>
              </div>
            )}
          </button>

          {isProfileOpen && (
            <div className={`absolute bottom-0 mb-0 bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-left-2 duration-200 z-50 ${isCollapsed ? 'left-full ml-4 w-48' : 'left-0 w-full bottom-full mb-2'}`}>
              <button 
                onClick={() => { setIsSettingsOpen(true); setIsProfileOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-4 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900 transition-all border-b border-slate-300"
              >
                <Settings size={18} />
                Account Settings
              </button>
              <button 
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-4 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CreateStoreModal isOpen={isCreateStoreOpen} onClose={() => setIsCreateStoreOpen(false)} />
      <ManageStoresModal isOpen={isManageStoresOpen} onClose={() => setIsManageStoresOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-auto pt-24 md:pt-10">
        <Routes>
          <Route path="dashboard" element={isAdmin ? <DashboardStats /> : <AccessDenied />} />
          <Route path="products" element={<ProductsView />} />
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
          <h2 className="text-3xl font-medium text-slate-900 mb-2">Product Catalog</h2>
          <p className="text-slate-400">Manage your inventory across shop and warehouse</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setShowBulkUpload(!showBulkUpload); setShowProductForm(false); }}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 active:scale-95 ${
              showBulkUpload ? 'bg-slate-700 text-slate-900 border border-slate-600' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
            }`}
          >
            {showBulkUpload ? <X size={20} /> : <FileText size={20} />}
            {showBulkUpload ? 'Cancel Upload' : 'Bulk Upload (CSV)'}
          </button>
          <button 
            onClick={() => { setShowProductForm(!showProductForm); setShowBulkUpload(false); }}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2 active:scale-95"
          >
            {showProductForm ? <X size={20} /> : <Plus size={20} />}
            {showProductForm ? 'Cancel' : 'Add New Product'}
          </button>
        </div>
      </header>

      {showProductForm && (
        <div className="max-w-4xl mx-auto bg-white border border-slate-300 p-8 rounded-3xl backdrop-blur-md mb-10">
          <ProductForm onComplete={() => setShowProductForm(false)} />
        </div>
      )}

      {showBulkUpload && (
        <div className="max-w-4xl mx-auto bg-white border border-slate-300 p-8 rounded-3xl backdrop-blur-md mb-10">
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
      <Route path="/register" element={<Register />} /> {/* Added Register route */}
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
      <StoreProvider>
        <Router>
          <AppContent />
        </Router>
      </StoreProvider>
    </AuthProvider>
  )
}
