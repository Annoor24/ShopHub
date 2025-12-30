import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, Package, AlertTriangle, Activity, DollarSign, X } from 'lucide-react';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalValue: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalItems: 0,
    lowStockCount: 0,
    categoryData: [],
    revenueData: [],
    profitData: []
  });
  const [recentMovements, setRecentMovements] = useState([]);
  const [allMovements, setAllMovements] = useState([]);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all'); // '24h', '7d', '30d', 'all'
  const { userProfile } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    setLoading(true);
    
    // Calculate start date based on timeframe
    let startDate = null;
    const now = new Date();
    if (timeframe === '24h') startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (timeframe === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (timeframe === '30d') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Products listener (always All Time for inventory overview)
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      let value = 0;
      let items = 0;
      let lowStock = 0;
      const categories = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const shopStock = data.stock?.shop || 0;
        const warehouseStock = data.stock?.warehouse || 0;
        const totalStock = shopStock + warehouseStock;
        
        value += (data.price || 0) * totalStock;
        items += totalStock;
        
        if (totalStock <= (data.minStockThreshold || 5)) {
          lowStock++;
        }

        const cat = data.category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + totalStock;
      });

      const categoryData = Object.keys(categories).map(name => ({
        name,
        value: categories[name]
      })).sort((a, b) => b.value - a.value).slice(0, 5);

      // Orders listener with timeframe filtering
      let ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      if (startDate) {
        ordersQuery = query(collection(db, 'orders'), where('createdAt', '>=', Timestamp.fromDate(startDate)), orderBy('createdAt', 'desc'));
      }

      const unsubscribeOrders = onSnapshot(ordersQuery, (orderSnap) => {
        let revenue = 0;
        let profit = 0;
        const revenueMap = {};
        const profitMap = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        orderSnap.docs.forEach(doc => {
          const data = doc.data();
          const amount = data.total || data.amount || 0;
          revenue += amount;

          // Calculate Profit for this order
          let orderProfit = 0;
          data.items?.forEach(item => {
            const itemPrice = item.price || 0;
            const itemCost = item.unitCost || item.costPrice || 0;
            orderProfit += (itemPrice - itemCost) * (item.quantity || 1);
          });
          profit += orderProfit;

          if (data.createdAt) {
            const date = data.createdAt.toDate();
            let key;
            if (timeframe === '24h') {
              key = `${date.getHours().toString().padStart(2, '0')}:00`;
            } else if (timeframe === 'all') {
              key = monthNames[date.getMonth()];
            } else {
              key = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
            revenueMap[key] = (revenueMap[key] || 0) + amount;
            profitMap[key] = (profitMap[key] || 0) + orderProfit;
          }
        });

        // Format revenue data for chart
        let revenueData = [];
        if (timeframe === 'all') {
          revenueData = monthNames.map(name => ({ 
            name, 
            revenue: revenueMap[name] || 0,
            profit: profitMap[name] || 0
          }));
        } else if (timeframe === '24h') {
          // Generate last 24 hours to ensure a continuous wave
          const data = [];
          for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 60 * 60 * 1000);
            const key = `${d.getHours().toString().padStart(2, '0')}:00`;
            data.push({ 
              name: key, 
              revenue: revenueMap[key] || 0,
              profit: profitMap[key] || 0
            });
          }
          revenueData = data;
        } else {
          // Past 7 or 30 days
          const days = timeframe === '7d' ? 6 : 29;
          const data = [];
          for (let i = days; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
            data.push({ 
              name: key, 
              revenue: revenueMap[key] || 0,
              profit: profitMap[key] || 0
            });
          }
          revenueData = data;
        }

        setStats(prev => ({
          ...prev,
          totalValue: value,
          totalItems: items,
          lowStockCount: lowStock,
          categoryData,
          totalRevenue: revenue,
          totalProfit: profit,
          revenueData
        }));
        setLoading(false);
      });

      return unsubscribeOrders;
    });

    // Recent stock movements with timeframe
    let movementQuery = query(collection(db, 'stockMovements'), orderBy('timestamp', 'desc'), limit(50)); // Fetch more for modal
    if (startDate) {
      movementQuery = query(collection(db, 'stockMovements'), where('timestamp', '>=', Timestamp.fromDate(startDate)), orderBy('timestamp', 'desc'));
    }

    const unsubscribeMovements = onSnapshot(movementQuery, (snapshot) => {
      const movements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllMovements(movements);
      setRecentMovements(movements.slice(0, 5)); // Show only 5 in dashboard
    });

    return () => {
      unsubscribeProducts();
      unsubscribeMovements();
    };
  }, [timeframe]);

  const generateReport = () => {
    const headers = ['Type', 'Item/Ref', 'Date', 'Amount/Qty', 'User'];
    const rows = [
      ['SUMMARY', 'Stats', new Date().toLocaleDateString(), '', ''],
      ['Revenue', 'Total', '', stats.totalRevenue, ''],
      ['Inventory', 'Total Units', '', stats.totalItems, ''],
      ['Value', 'Market Estimate', '', stats.totalValue, ''],
      ['', '', '', '', ''],
      ['MOVEMENTS HISTORY', '', '', '', ''],
      ...recentMovements.map(m => [
        m.type,
        m.productName || m.productId,
        m.timestamp?.toDate().toLocaleString(),
        m.quantity,
        m.userEmail
      ])
    ];

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ShopHub_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#2563eb', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b'];

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-800/50 rounded-2xl border border-slate-700"></div>)}
      </div>
      <div className="h-80 bg-slate-800/50 rounded-3xl border border-slate-700"></div>
    </div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header with Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-3xl font-black text-white mb-1 tracking-tight">
            {getGreeting()}, {userProfile?.name?.split(' ')?.[0] || 'Member'}
          </h2>
          <div className="flex flex-col gap-0.5">
            <p className="text-slate-200 text-sm font-bold shadow-sm">Welcome back to your business dashboard</p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">BRANCH: S-Bako, Ganaja.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
            {[
              { id: '24h', label: '24H' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: 'all', label: 'ALL' }
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                  timeframe === tf.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button 
            onClick={generateReport}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/30 active:scale-95 flex items-center gap-2"
          >
            <DollarSign size={16} />
            DOWNLOAD REPORT
          </button>
        </div>
      </header>
      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₦${stats.totalRevenue.toLocaleString()}`} 
          icon={<DollarSign className="text-blue-400" />}
          description="Total lifetime shop sales"
        />
        <StatCard 
          title="Gross Profit" 
          value={`₦${stats.totalProfit.toLocaleString()}`} 
          icon={<TrendingUp className="text-emerald-400" />}
          description={`Margin: ${stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%`}
        />
        <StatCard 
          title="Inventory Value" 
          value={`₦${stats.totalValue.toLocaleString()}`} 
          icon={<Package className="text-indigo-400" />}
          description="Estimated market value"
        />
        <StatCard 
          title="Low Stock" 
          value={stats.lowStockCount} 
          danger={stats.lowStockCount > 0}
          icon={<AlertTriangle className={stats.lowStockCount > 0 ? "text-red-400" : "text-slate-500"} />}
          description="Items needing restock"
        />
      </div>

      {/* Revenue Trend Chart - Wave Like */}
      <div className="bg-slate-900/70 border border-slate-700/50 p-4 md:p-8 rounded-4xl backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <Activity size={24} className="text-emerald-400" />
              Monthly Revenue Trend
            </h3>
            <p className="text-sm text-slate-200 mt-1 font-medium">Financial performance visualization for {new Date().getFullYear()}</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-700">
             <span className="px-3 py-1 text-[10px] font-black uppercase text-blue-400">Monthly Wave</span>
          </div>
        </div>
        
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `₦${(value/1000)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                formatter={(value) => [`₦${value.toLocaleString()}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorRev)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock Distribution Chart */}
        <div className="bg-slate-900/60 border border-slate-700/50 p-4 md:p-8 rounded-3xl backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-400" />
              Stock Distribution
            </h3>
            <p className="text-xs text-slate-300 font-black uppercase tracking-widest">By Category</p>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900/60 border border-slate-700/50 p-4 md:p-6 rounded-3xl backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Activity size={20} className="text-indigo-400" />
              Recent Movements
            </h3>
            <button 
              onClick={() => setShowMovementsModal(true)}
              className="text-xs text-blue-400 font-black uppercase tracking-widest hover:text-blue-300 transform transition-colors"
            >
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentMovements.length > 0 ? recentMovements.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-slate-900/40 rounded-2xl border border-slate-800 transition-all hover:bg-slate-800/40 group">
                <div className={`p-3 rounded-xl ${
                  m.type?.includes('restock') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{m.productName}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
                    {m.type?.replace(/_/g, ' ')} • {m.quantity} Units
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-200 font-black uppercase">
                    {m.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold truncate max-w-[80px]">{m.userEmail?.split('@')[0]}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                <Activity size={40} className="mb-2 opacity-20" />
                <p className="text-sm">No recent activity detected</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <MovementsModal 
        isOpen={showMovementsModal} 
        onClose={() => setShowMovementsModal(false)} 
        movements={allMovements} 
      />
    </div>
  );
}

function MovementsModal({ isOpen, onClose, movements }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-4xl overflow-hidden shadow-2xl relative animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors">
          <X size={20} />
        </button>
        
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-600/10 rounded-2xl">
              <Activity size={24} className="text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Full Movement History</h3>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {movements.length > 0 ? movements.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
                <div className={`p-3 rounded-xl ${
                  m.type?.includes('restock') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{m.productName}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">
                    {m.type?.replace(/_/g, ' ')} • {m.quantity} Units
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold">
                    {m.timestamp?.toDate().toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate max-w-[120px]">{m.userEmail}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-500 text-sm">No history found for this period</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description, danger = false }) {
  return (
    <div className={`bg-slate-900/60 backdrop-blur-2xl border p-6 rounded-2xl transition-all hover:border-slate-500 ${
      danger ? 'border-red-500/30 bg-red-500/10' : 'border-slate-700/50'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-900 rounded-xl">
          {icon}
        </div>
        {danger && (
          <span className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-tighter rounded-full">
            Action Needed
          </span>
        )}
      </div>
      <p className="text-slate-100 text-xs font-black uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-3xl font-black text-white">{value}</h3>
      <p className="text-[10px] text-slate-300 mt-2 font-black uppercase tracking-tight">{description}</p>
    </div>
  );
}
