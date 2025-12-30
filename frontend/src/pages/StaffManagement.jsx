import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { 
  Users, UserPlus, Shield, ShieldCheck, Mail, 
  Trash2, Search, Loader2, RefreshCw, Star, MailPlus, Send
} from 'lucide-react';

export default function StaffManagement() {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  
  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

    const inviteLink = `${window.location.origin}`;
    const subject = encodeURIComponent("Invitation to join S-BAKO ShopHub");
    const body = encodeURIComponent(`Hello,\n\nYou have been invited to join the S-BAKO ShopHub staff team. Please register your account here:\n\n${inviteLink}\n\nAfter you register and verify your email, the administrator will approve your access level.\n\nThank you!`);
    
    window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`;
    setInviteEmail('');
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse text-slate-500">
        <Users size={48} className="mb-4" />
        <p className="text-xl font-bold">Loading staff directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-blue-400" />
            Staff Directory
          </h3>
          <p className="text-slate-100 font-black text-base mt-2 shadow-sm uppercase tracking-wide">Manage employee roles and access levels</p>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border-2 border-slate-700/50 text-white pl-14 pr-12 py-4 rounded-3xl focus:outline-none focus:ring-8 focus:ring-blue-600/10 focus:border-blue-500 transition-all font-black text-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-slate-800/20 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md group hover:border-slate-600 transition-all flex flex-col relative overflow-hidden">
            {user.role === 'admin' && (
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck size={80} className="text-blue-400" />
              </div>
            )}
            
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-4 rounded-2xl ${user.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {user.role === 'admin' ? <Shield size={24} /> : <Star size={24} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-400 mb-1">{user.role}</p>
                <p className="text-xl font-bold text-white truncate">{user.name || user.email?.split('@')[0]}</p>
                <p className="text-sm text-slate-200 flex items-center gap-2 mt-2 truncate font-bold">
                  <Mail size={14} className="text-blue-400" />
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-auto space-y-3">
               <div className="flex justify-between items-center text-xs font-black text-slate-200 uppercase tracking-[0.15em] px-1">
                 <span>Member Since</span>
                 <span className="text-white bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-700/50">
                   {user.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                 </span>
               </div>
               
               <div className="flex gap-2">
                 <button 
                   onClick={() => toggleRole(user.id, user.role)}
                   disabled={updatingId === user.id || user.id === currentUser.uid}
                   className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
                     user.role === 'admin' 
                      ? 'bg-slate-800 text-slate-400 hover:text-white' 
                      : 'bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20'
                   }`}
                 >
                   {updatingId === user.id ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                   {user.role === 'admin' ? 'Demote' : 'Promote'}
                 </button>
                 
                 {user.id !== currentUser.uid && (
                   <button 
                    onClick={() => handleDeleteStaff(user.id, user.email)}
                    disabled={updatingId === user.id}
                    className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-95 border border-red-500/20"
                   >
                     <Trash2 size={18} />
                   </button>
                 )}
               </div>
            </div>
            
            {user.id === currentUser.uid && (
              <div className="absolute top-6 right-6 px-2 py-1 bg-blue-600 rounded-lg text-[8px] font-black uppercase tracking-tighter text-white">
                You
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600 bg-slate-800/10 rounded-4xl border border-dashed border-slate-700">
          <UserPlus size={64} className="mb-6 opacity-10" />
          <p className="text-xl font-medium">No matches found</p>
        </div>
      )}

      <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-4xl flex flex-col md:flex-row items-center gap-10 backdrop-blur-md">
        <div className="p-5 bg-blue-600 rounded-3xl shadow-xl shadow-blue-900/40 shrink-0">
           <MailPlus size={40} className="text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-3xl font-black text-white mb-3 tracking-tight">Invite New Staff</h4>
          <p className="text-slate-200 text-base leading-relaxed max-w-xl mb-8 font-medium">
            Enter an email address below to send an official invitation. New staff must register with this email to appear in your directory.
          </p>
          
          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
             <input 
               type="email" 
               placeholder="staff@example.com"
               required
               value={inviteEmail}
               onChange={(e) => setInviteEmail(e.target.value)}
               className="flex-1 bg-slate-950 border border-slate-800 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
             />
             <button 
               type="submit"
               className="bg-white text-slate-900 font-black px-8 py-4 rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl shrink-0"
             >
               <Send size={18} />
               Send Invite
             </button>
          </form>
        </div>
      </div>
    </div>
  );
}
