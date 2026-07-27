import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { 
  Users, UserPlus, Shield, ShieldCheck, Mail, 
  Trash2, Search, Loader2, RefreshCw, Star, MailPlus, Send, Copy, Check
} from 'lucide-react';

export default function StaffManagement() {
  const { currentUser, isAdmin } = useAuth();
  const { currentStore } = useStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  
  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!currentStore) return;

    // Show users who have access to this store OR are Admins (Admins have access to everything)
    const q = query(
      collection(db, 'users'), 
      where('role', 'in', ['admin', 'staff']) // Fetch all active users
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(user => {
        // Filter in memory: show if they are admin OR they are assigned to this store
        return user.role === 'admin' || user.allowedStoreIds?.includes(currentStore.id);
      });
      
      setUsers(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentStore]);

  const toggleRole = async (userId, currentRole) => {
    if (!isAdmin) return alert("Only Admins can change roles.");
    if (userId === currentUser.uid) return alert("You cannot change your own role!");

    setUpdatingId(userId);
    try {
      const newRole = currentRole === 'admin' ? 'staff' : 'admin';
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
    } catch (error) {
       console.error(error);
       alert("Failed to update role.");
    }
    setUpdatingId(null);
  };

  const handleDeleteStaff = async (userId, userEmail) => {
    if (userId === currentUser.uid) return alert("You cannot delete yourself!");
    if (!window.confirm(`Are you sure you want to remove ${userEmail} from the system? They will lose all access.`)) return;

    setUpdatingId(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      console.error(error);
      alert("Failed to delete staff member.");
    }
    setUpdatingId(null);
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    // Check if user already exists in listing
    const exists = users.find(u => u.email?.toLowerCase() === inviteEmail.toLowerCase());
    if (exists) return alert("This user is already registered!");

    const inviteLink = `${window.location.origin}/register?storeId=${currentStore.id}`;
    const subject = encodeURIComponent(`Invitation to join ${currentStore.name} on ShopHub`);
    const body = encodeURIComponent(`Hello,\n\nYou have been invited to join the ${currentStore.name} staff team. To get started, please create your account at the following link:\n\n${inviteLink}\n\nSteps to follow:\n1. Click the link above to register.\n2. Once registered, verify your email.\n3. After verification, you will have access to the Shophub dashboard.\n\nThank you!`);
    
    window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`;
    setInviteEmail('');
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/register?storeId=${currentStore.id}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse text-slate-400">
        <Users size={48} className="mb-4" />
        <p className="text-xl font-medium">Loading staff directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-medium text-slate-900 flex items-center gap-3">
            <Users className="text-slate-900" />
            Staff Directory
          </h3>
          <p className="text-slate-500 font-bold text-base mt-2 shadow uppercase tracking-wide">Manage employee roles and access levels</p>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 pl-14 pr-12 py-4 rounded-3xl focus:outline-none focus:ring-8 focus:ring-slate-900/10 focus:border-slate-800 transition-all font-bold text-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white border border-slate-300 rounded-3xl p-6 backdrop-blur-md group hover:border-slate-600 transition-all flex flex-col relative overflow-hidden">
            {user.role === 'admin' && (
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck size={80} className="text-slate-900" />
              </div>
            )}
            
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-4 rounded-2xl ${user.role === 'admin' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>
                {user.role === 'admin' ? <Shield size={24} /> : <Star size={24} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900 mb-1">{user.role}</p>
                <p className="text-xl font-medium text-slate-900 truncate">{user.name || user.email?.split('@')[0]}</p>
                <p className="text-sm text-slate-800 flex items-center gap-2 mt-2 truncate font-medium">
                  <Mail size={14} className="text-slate-900" />
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-auto space-y-3">
               <div className="flex justify-between items-center text-xs font-bold text-slate-800 uppercase tracking-[0.15em] px-1">
                 <span>Member Since</span>
                 <span className="text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-300">
                   {user.createdAt ? (
                     typeof user.createdAt.toDate === 'function'
                       ? user.createdAt.toDate().toLocaleDateString()
                       : new Date(user.createdAt).toLocaleDateString()
                   ) : 'N/A'}
                 </span>
               </div>
               
               <div className="flex gap-2">
                 <button 
                   onClick={() => toggleRole(user.id, user.role)}
                   disabled={updatingId === user.id || user.id === currentUser.uid}
                   className={`flex-1 py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
                     user.role === 'admin' 
                      ? 'bg-white text-slate-400 hover:text-slate-900' 
                      : 'bg-slate-900/10 text-slate-900 border border-slate-900/20 hover:bg-slate-900/20'
                   }`}
                 >
                   {updatingId === user.id ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                   {user.role === 'admin' ? 'Demote' : 'Promote'}
                 </button>
                 
                 {user.id !== currentUser.uid && (
                   <button 
                    onClick={() => handleDeleteStaff(user.id, user.email)}
                    disabled={updatingId === user.id}
                    className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-slate-900 rounded-xl transition-all active:scale-95 border border-red-500/20"
                   >
                     <Trash2 size={18} />
                   </button>
                 )}
               </div>
            </div>
            
            {user.id === currentUser.uid && (
              <div className="absolute top-6 right-6 px-2 py-1 bg-slate-900 rounded-lg text-[8px] font-bold uppercase tracking-tighter text-white">
                You
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600 bg-slate-50 rounded-4xl border border-dashed border-slate-300">
          <UserPlus size={64} className="mb-6 opacity-10" />
          <p className="text-xl font-medium">No matches found</p>
        </div>
      )}

      <div className="bg-white border border-slate-300 p-8 rounded-4xl flex flex-col md:flex-row items-center gap-10 backdrop-blur-md">
        <div className="p-5 bg-slate-900 rounded-3xl shadow-xl shadow-blue-900/40 shrink-0">
           <MailPlus size={40} className="text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Invite New Staff</h4>
          <p className="text-slate-800 text-base leading-relaxed max-w-xl mb-8 font-medium">
            Enter an email address below to send an official invitation. New staff must register with this email to appear in your directory.
          </p>
          
          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
             <input 
               type="email" 
               placeholder="staff@example.com"
               required
               value={inviteEmail}
               onChange={(e) => setInviteEmail(e.target.value)}
               className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium"
             />
             <button 
               type="submit"
               className="bg-slate-900 text-white font-bold px-8 py-4 rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl shrink-0"
             >
               <Send size={18} />
               Send Email
             </button>
             <button 
               type="button"
               onClick={handleCopyLink}
               className="bg-white text-slate-900 font-bold px-8 py-4 rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl shrink-0"
             >
               {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
               {copied ? 'Copied!' : 'Copy Link'}
             </button>
          </form>
        </div>
      </div>
    </div>
  );
}
