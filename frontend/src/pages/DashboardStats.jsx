import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, Package, AlertTriangle, Activity, DollarSign, X, Search } from 'lucide-react';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalValue: 0,
    totalItems: 0,
    lowStockCount: 0,
    categoryData: []
  });
  const [orderStats, setOrderStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    revenueData: []
  });
  const [recentMovements, setRecentMovements] = useState([]);
  const [allMovements, setAllMovements] = useState([]);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all'); // '24h', '7d', '30d', 'all', 'day'
  const [lookupDate, setLookupDate] = useState('');
  const { userProfile } = useAuth();
  const { currentStore } = useStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    if (!currentStore) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    let startDate = null;
    let endDate = null;
    const now = new Date();
    if (timeframe === '24h') startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (timeframe === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (timeframe === '30d') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (timeframe === 'day' && lookupDate) {
      startDate = new Date(lookupDate);
      startDate.setHours(0,0,0,0);
      endDate = new Date(lookupDate);
      endDate.setHours(23,59,59,999);
    }

    const qProducts = query(
      collection(db, 'products'), 
      where('storeId', '==', currentStore.id)
    );
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
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

      setStats(prev => ({
        ...prev,
        totalValue: value,
        totalItems: items,
        lowStockCount: lowStock,
        categoryData
      }));
      setLoading(false);
    }, (error) => {
      console.error("DashboardStats: Products Snapshot Error", error);
      setLoading(false);
    });

    // Orders listener with timeframe filtering
    let ordersQuery = query(
      collection(db, 'orders'), 
      where('storeId', '==', currentStore.id),
      orderBy('createdAt', 'desc')
    );
    
    if (startDate) {
      if (endDate) {
        ordersQuery = query(
          collection(db, 'orders'), 
          where('storeId', '==', currentStore.id),
          where('createdAt', '>=', Timestamp.fromDate(startDate)), 
          where('createdAt', '<=', Timestamp.fromDate(endDate)), 
          orderBy('createdAt', 'desc')
        );
      } else {
        ordersQuery = query(
          collection(db, 'orders'), 
          where('storeId', '==', currentStore.id),
          where('createdAt', '>=', Timestamp.fromDate(startDate)), 
          orderBy('createdAt', 'desc')
        );
      }
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
          if (timeframe === '24h' || timeframe === 'day') {
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
      } else if (timeframe === 'day' && startDate) {
        const data = [];
        for (let i = 0; i < 24; i++) {
          const key = `${i.toString().padStart(2, '0')}:00`;
          data.push({ 
            name: key, 
            revenue: revenueMap[key] || 0,
            profit: profitMap[key] || 0
          });
        }
        revenueData = data;
      } else {
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

      setOrderStats({
        totalRevenue: revenue,
        totalProfit: profit,
        revenueData
      });
    }, (error) => {
      console.error("DashboardStats: Orders query failed. This usually means a missing index.", error);
    });

    // Recent stock movements with timeframe
    let movementQuery = query(
      collection(db, 'stockMovements'), 
      where('storeId', '==', currentStore.id),
      orderBy('timestamp', 'desc'), 
      limit(50)
    );
    if (startDate) {
      if (endDate) {
        movementQuery = query(
          collection(db, 'stockMovements'), 
          where('storeId', '==', currentStore.id),
          where('timestamp', '>=', Timestamp.fromDate(startDate)), 
          where('timestamp', '<=', Timestamp.fromDate(endDate)), 
          orderBy('timestamp', 'desc')
        );
      } else {
        movementQuery = query(
          collection(db, 'stockMovements'), 
          where('storeId', '==', currentStore.id),
          where('timestamp', '>=', Timestamp.fromDate(startDate)), 
          orderBy('timestamp', 'desc')
        );
      }
    }

    const unsubscribeMovements = onSnapshot(movementQuery, (snapshot) => {
      const movements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllMovements(movements);
      setRecentMovements(movements.slice(0, 5));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeMovements();
    };
  }, [timeframe, lookupDate, currentStore]);

  const generateReport = () => {
    const headers = ['Type', 'Item/Ref', 'Date', 'Amount/Qty', 'User'];
    const rows = [
      ['SUMMARY', 'Stats', new Date().toLocaleDateString(), '', ''],
      ['Revenue', 'Total', '', orderStats.totalRevenue, ''],
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

  const TimeframeBtn = ({ id, label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all ${
        active 
          ? 'bg-slate-900 text-white shadow-lg shadow-blue-900/40' 
          : 'text-slate-400 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-50 rounded-2xl border border-slate-300"></div>)}
      </div>
      <div className="h-80 bg-slate-50 rounded-3xl border border-slate-300"></div>
    </div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header with Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-1 tracking-tight">
            {getGreeting()}, {userProfile?.name?.split(' ')?.[0] || 'Member'}
          </h2>
          <div className="flex flex-col gap-0.5">
            <p className="text-slate-800 text-sm font-medium shadow">Welcome back to your business dashboard</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900">BRANCH: {currentStore?.name?.toUpperCase() || 'GENERAL'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-300 backdrop-blur-sm">
            {[
              { id: '24h', label: '24H' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: 'all', label: 'ALL' }
            ].map(tf => (
              <TimeframeBtn
                key={tf.id}
                id={tf.id}
                label={tf.label}
                active={timeframe === tf.id}
                onClick={() => setTimeframe(tf.id)}
              />
            ))}
            
            <div className="flex items-center gap-2 bg-white border border-slate-300 p-1 rounded-xl ml-2">
              <input 
                type="date" value={lookupDate}
                onChange={(e) => {
                  setLookupDate(e.target.value);
                  setTimeframe('day');
                }}
                className="bg-transparent text-slate-900 text-[10px] font-bold uppercase tracking-widest outline-none px-2 py-1 [color-scheme:light]"
              />
            </div>
          </div>
          <button 
            onClick={generateReport}
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-2"
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
          value={`₦${Math.round(orderStats.totalRevenue).toLocaleString()}`} 
          icon={<DollarSign className="text-slate-900" />}
          description="Total lifetime shop sales"
        />
        <StatCard 
          title="Gross Profit" 
          value={`₦${Math.round(orderStats.totalProfit).toLocaleString()}`} 
          icon={<TrendingUp className="text-emerald-400" />}
          description={`Margin: ${orderStats.totalRevenue > 0 ? Math.round((orderStats.totalProfit / orderStats.totalRevenue) * 100) : 0}%`}
        />
        <StatCard 
          title="Inventory Value" 
          value={`₦${Math.round(stats.totalValue).toLocaleString()}`} 
          icon={<Package className="text-indigo-400" />}
          description="Estimated market value"
        />
        <StatCard 
          title="Low Stock" 
          value={stats.lowStockCount} 
          danger={stats.lowStockCount > 0}
          icon={<AlertTriangle className={stats.lowStockCount > 0 ? "text-red-400" : "text-slate-400"} />}
          description="Items needing restock"
        />
      </div>

      {/* Revenue Trend Chart - Wave Like */}
      <div className="bg-white border border-slate-300 p-4 md:p-8 rounded-4xl backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Activity size={24} className="text-emerald-400" />
              Monthly Revenue Trend
            </h3>
            <p className="text-sm text-slate-800 mt-1 font-medium">Financial performance visualization for {new Date().getFullYear()}</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-300">
             <span className="px-3 py-1 text-[10px] font-bold uppercase text-slate-900">Monthly Wave</span>
          </div>
        </div>
        
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={orderStats.revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                tickFormatter={(value) => `₦${Math.round(value/1000)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                formatter={(value) => [`₦${Math.round(value).toLocaleString()}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                data={orderStats.revenueData}
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
        <div className="bg-white border border-slate-300 p-4 md:p-8 rounded-3xl backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-slate-900" />
              Stock Distribution
            </h3>
            <p className="text-xs text-slate-700 font-bold uppercase tracking-widest">By Category</p>
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
        <div className="bg-white border border-slate-300 p-4 md:p-6 rounded-3xl backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity size={20} className="text-indigo-400" />
              Recent Movements
            </h3>
            <button 
              onClick={() => setShowMovementsModal(true)}
              className="text-xs text-slate-900 font-bold uppercase tracking-widest hover:text-blue-600 transform transition-colors"
            >
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentMovements.length > 0 ? recentMovements.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-300 transition-all hover:bg-white group">
                <div className={`p-3 rounded-xl ${
                  m.type?.includes('restock') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-slate-900'
                }`}>
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{m.productName}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">
                    {m.type?.replace(/_/g, ' ')} • {m.quantity} Units
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-800 font-bold uppercase">
                    {m.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">{m.userEmail?.split('@')[0]}</p>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  if (!isOpen) return null;

  const filteredMovements = movements.filter(m => {
    const productName = m.productName?.toLowerCase() || '';
    const productId = m.productId?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    
    const matchesProduct = !searchTerm || productName.includes(searchLower) || productId.includes(searchLower);
    
    let matchesDate = true;
    if (dateFilter && m.timestamp) {
      const movementDate = m.timestamp.toDate().toISOString().split('T')[0];
      matchesDate = movementDate === dateFilter;
    }

    return matchesProduct && matchesDate;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white border border-slate-300 w-full max-w-4xl rounded-4xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 h-[85vh] flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white text-slate-900 rounded-full hover:bg-slate-100 transition-colors z-20">
          <X size={20} />
        </button>
        
        <div className="p-8 flex flex-col h-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600/10 rounded-2xl">
                <Activity size={24} className="text-indigo-400" />
              </div>
              <h3 className="text-2xl font-medium text-slate-900">Full Movement History</h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search Product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm w-full md:w-48 transition-all"
                />
              </div>
              <input 
                type="date" value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm transition-all [color-scheme:light]"
              />
              {(searchTerm || dateFilter) && (
                <button 
                  onClick={() => { setSearchTerm(''); setDateFilter(''); }}
                  className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {filteredMovements.length > 0 ? filteredMovements.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-300">
                <div className={`p-3 rounded-xl ${
                  m.type?.includes('restock') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-slate-900'
                }`}>
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{m.productName}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">
                    {m.type?.replace(/_/g, ' ')} • {m.quantity} Units
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-medium">
                    {m.timestamp?.toDate().toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate max-w-[120px]">{m.userEmail}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-400 text-sm bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                No history found for these filters
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description, danger = false }) {
  return (
    <div className={`bg-white backdrop-blur-2xl border p-6 rounded-2xl transition-all hover:border-slate-500 ${
      danger ? 'border-red-500/30 bg-red-500/10' : 'border-slate-300'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-100 border border-slate-300 shadow rounded-xl">
          {icon}
        </div>
        {danger && (
          <span className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-tighter rounded-full">
            Action Needed
          </span>
        )}
      </div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
      <p className="text-[10px] text-slate-700 mt-2 font-bold uppercase tracking-tight">{description}</p>
    </div>
  );
}
