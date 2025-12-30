import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, doc, runTransaction, serverTimestamp, getDocs, limit, where, Timestamp, deleteDoc, increment, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { 
  Search, ShoppingCart, Plus, Minus, CheckCircle, 
  CreditCard, Package, AlertCircle, Loader2, DollarSign, Smartphone, Wallet,
  History, Printer, X, Filter, ChevronRight, Trash2
} from 'lucide-react';

export default function OrderManagement() {
  const { currentUser } = useAuth();
  const [activeView, setActiveView] = useState('terminal'); // 'terminal' or 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // History states
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'cash', 'moniepoint', 'opay'
  const [historyDateFilter, setHistoryDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const searchRef = useRef(null);

  // Click outside to hide search results
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setProducts([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef]);

  // Fetch products for search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setProducts([]);
      return;
    }
    
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);
      setProducts(results);
    });

    return () => unsubscribe();
  }, [searchTerm]);

  // Fetch history with date filter
  useEffect(() => {
    if (activeView === 'history') {
      const startOfDay = new Date(historyDateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(historyDateFilter);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'orders'), 
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistoryOrders(orders);
      });
      return () => unsubscribe();
    }
  }, [activeView, historyDateFilter]);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= (product.stock?.shop || 0)) {
        return alert("Not enough stock on shop floor!");
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if ((product.stock?.shop || 0) <= 0) {
        return alert("Item out of stock in shop!");
      }
      setCart([...cart, { ...product, quantity: 1, editablePrice: product.price }]);
    }
    setSearchTerm('');
    setProducts([]);
  };

  const updateQuantity = (id, delta, exactValue = null) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        if (exactValue !== null) {
          // Allow empty string so user can clear the field
          if (exactValue === '') return { ...item, quantity: '' };
          
          const val = parseInt(exactValue);
          if (isNaN(val)) return item;
          
          const availableStock = (item.stock?.shop || 0);
          if (val > availableStock) {
            alert(`Maximum available shop stock reached (${availableStock})`);
            return { ...item, quantity: availableStock };
          }
          return { ...item, quantity: val };
        } else {
          const currentQty = parseInt(item.quantity) || 0;
          const newQty = currentQty + delta;
          if (newQty <= 0) return item;
          
          const availableStock = (item.stock?.shop || 0);
          if (newQty > availableStock) {
            alert(`Maximum available shop stock reached (${availableStock})`);
            return { ...item, quantity: availableStock };
          }
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const updatePriceInCart = (id, newValue) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        return { ...item, editablePrice: newValue };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const price = parseFloat(item.editablePrice);
      const qty = parseInt(item.quantity) || 0;
      return sum + ((isNaN(price) ? 0 : price) * qty);
    }, 0);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setProcessing(true);

    try {
      const totalAmount = calculateTotal();
      const orderId = doc(collection(db, 'orders')).id;

      await runTransaction(db, async (transaction) => {
        const productRefs = cart.map(item => doc(db, 'products', item.id));
        const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        for (let i = 0; i < cart.length; i++) {
          const item = cart[i];
          const snap = productSnaps[i];
          const stockInShop = snap.data().stock?.shop || 0;
          
          const finalPrice = parseFloat(item.editablePrice);
          const finalQty = parseInt(item.quantity);

          if (isNaN(finalPrice) || finalPrice < 0) {
            throw new Error(`Please enter a valid price for ${item.name}`);
          }

          if (isNaN(finalQty) || finalQty < 1) {
            throw new Error(`Please enter a valid quantity (min 1) for ${item.name}`);
          }

          if (stockInShop < finalQty) {
            throw new Error(`Insufficient stock for ${item.name}. Available: ${stockInShop}`);
          }
        }

        cart.forEach((item, index) => {
          transaction.update(productRefs[index], {
            'stock.shop': productSnaps[index].data().stock.shop - item.quantity,
            updatedAt: serverTimestamp()
          });
        });

        const orderRef = doc(db, 'orders', orderId);
        transaction.set(orderRef, {
          items: cart.map((i, index) => {
            const productSnap = productSnaps[index];
            const costPriceAtSale = productSnap.data().costPrice || 0;
            return { 
              id: i.id, 
              name: i.name, 
              price: parseFloat(i.editablePrice) || i.price, 
              basePrice: i.price, 
              unitCost: costPriceAtSale,
              quantity: i.quantity 
            };
          }),
          total: totalAmount,
          paymentMethod: paymentMethod,
          status: 'completed',
          staffId: currentUser.uid,
          staffEmail: currentUser.email,
          createdAt: serverTimestamp()
        });

        cart.forEach(item => {
          const movementRef = doc(collection(db, 'stockMovements'));
          transaction.set(movementRef, {
            productId: item.id,
            productName: item.name,
            type: 'sale',
            quantity: item.quantity,
            paymentMethod: paymentMethod,
            orderId: orderId,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            timestamp: serverTimestamp()
          });
        });
      });

      const orderSummary = {
        id: orderId,
        amount: totalAmount,
        paymentMethod: paymentMethod,
        items: cart.map(i => ({ ...i, price: i.editablePrice || i.price }))
      };

      setOrderComplete(orderSummary);
      setCart([]);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Permission Error: Please check if your computer is correctly connected to Firebase and that your email is verified.');
    }
    setProcessing(false);
  };

  const filteredHistory = historyOrders.filter(o => 
    historyFilter === 'all' || o.paymentMethod === historyFilter
  );

  const filteredTotal = filteredHistory.reduce((sum, o) => sum + (o.total || 0), 0);

  const handleDeleteOrder = async (order) => {
    if (!window.confirm('Are you sure you want to delete this order? All items will be returned to store stock. This cannot be undone.')) return;

    setProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Revert Stock for each item
        for (const item of order.items) {
          const productRef = doc(db, 'products', item.id);
          transaction.update(productRef, {
            'stock.shop': increment(item.quantity),
            updatedAt: serverTimestamp()
          });

          // 2. Log Restoration Movement
          const movementRef = doc(collection(db, 'stockMovements'));
          transaction.set(movementRef, {
            productId: item.id,
            productName: item.name,
            type: 'adjustment',
            quantity: item.quantity,
            note: `Order Reversion [${order.id.substring(0,6)}]`,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            timestamp: serverTimestamp()
          });
        }

        // 3. Delete the Order
        const orderRef = doc(db, 'orders', order.id);
        transaction.delete(orderRef);
      });
      // Order list will auto-update via onSnapshot
    } catch (err) {
      console.error('Error deleting order:', err);
      alert('Failed to delete order and revert stock: ' + err.message);
    }
    setProcessing(false);
  };

  const handleGenerateSummaryReceipt = () => {
    // Aggregate items across all filtered orders
    const allItems = [];
    filteredHistory.forEach(order => {
      order.items?.forEach(item => {
        const existing = allItems.find(i => i.id === item.id && i.price === item.price);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          allItems.push({ ...item });
        }
      });
    });

    const summaryData = {
      id: `SUM-${historyFilter.toUpperCase()}-${new Date().getTime()}`,
      items: allItems,
      total: filteredTotal,
      paymentMethod: historyFilter,
      isSummary: true,
      createdAt: { toDate: () => new Date() }
    };

    setSelectedReceipt(summaryData);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* View Switcher */}
      <div className="flex bg-slate-800/50 p-1.5 rounded-2xl w-fit border border-slate-700/50">
        <button 
          onClick={() => setActiveView('terminal')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
            activeView === 'terminal' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard size={18} />
          Sales Terminal
        </button>
        <button 
          onClick={() => setActiveView('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${
            activeView === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History size={18} />
          Order History
        </button>
      </div>

      {activeView === 'terminal' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SEARCH & CART (LEFT) */}
          <div className="lg:col-span-12 xl:col-span-8 space-y-6">
            <div className="relative group" ref={searchRef}>
              <div className="absolute inset-y-0 left-5 flex items-center text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <Search size={22} />
              </div>
              <input 
                type="text" 
                placeholder="Scan SKU or Search Product..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700/50 text-white pl-12 md:pl-14 pr-12 md:pr-14 py-4 md:py-5 rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600/50 text-base md:text-lg transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => { setSearchTerm(''); setProducts([]); }}
                  className="absolute inset-y-0 right-5 flex items-center text-slate-500 hover:text-white transition-colors"
                >
                  <X size={22} />
                </button>
              )}
              
              {products.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden z-50">
                  {products.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full flex items-center justify-between p-5 hover:bg-slate-800 transition-all border-b border-slate-800 last:border-0 group"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden border border-slate-700">
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-600"><Package size={20} /></div>}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{p.name}</p>
                          <p className="text-xs text-slate-500 font-mono">SKU: {p.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-blue-400">₦{p.price.toLocaleString()}</p>
                        <p className={`text-[10px] font-black uppercase ${p.stock?.shop > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          In Shop: {p.stock?.shop || 0}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800/20 border border-slate-700/50 rounded-3xl md:rounded-4xl p-4 md:p-8 backdrop-blur-md min-h-[300px] md:min-h-[400px]">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-600/10 rounded-2xl">
                  <ShoppingCart size={24} className="text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Shopping Cart</h3>
              </div>

              {cart.length > 0 ? (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5 bg-slate-900/60 rounded-3xl border border-slate-800 group hover:border-slate-700 transition-all">
                       <div className="flex items-center gap-4 flex-1">
                          <div className="w-16 h-16 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-800"><Package size={24} /></div>}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg leading-tight">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Base Price: ₦{item.price.toLocaleString()}</span>
                            </div>
                          </div>
                       </div>
                      
                      {/* Price Adjustment */}
                      <div className="flex flex-col gap-1 min-w-[140px]">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Price Adjust (₦)</span>
                        <input 
                          type="number" 
                          value={item.editablePrice}
                          onChange={(e) => updatePriceInCart(item.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-blue-400 font-black px-3 py-2 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"><Minus size={16} /></button>
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, 0, e.target.value)}
                          className="w-10 bg-transparent text-center font-black text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-sm"
                        />
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"><Plus size={16} /></button>
                      </div>

                      <div className="text-right min-w-[120px]">
                        <p className="text-lg font-black text-white">₦{(item.editablePrice * item.quantity).toLocaleString()}</p>
                        <button onClick={() => removeFromCart(item.id)} className="text-xs font-bold text-red-500 hover:underline mt-1">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                  <ShoppingCart size={64} className="mb-6 opacity-10" />
                  <p className="text-xl font-medium text-slate-500">Cart is empty</p>
                </div>
              )}
            </div>
          </div>

          {/* CHECKOUT SECTION (RIGHT) */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-8">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl md:rounded-4xl p-6 md:p-8 backdrop-blur-md shadow-2xl sticky top-20 md:top-10">
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] mb-2">Grand Total</p>
              <h2 className="text-5xl font-black text-white mb-8 transition-all scale-100 active:scale-95">₦{calculateTotal().toLocaleString()}</h2>

              <div className="space-y-6">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block ml-1">Select Payment</label>
                <div className="grid grid-cols-1 gap-2">
                  <PaymentBtn active={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} icon={<DollarSign size={18} />} label="Cash" />
                  <PaymentBtn active={paymentMethod === 'moniepoint'} onClick={() => setPaymentMethod('moniepoint')} icon={<Smartphone size={18} />} label="Moniepoint" />
                  <PaymentBtn active={paymentMethod === 'opay'} onClick={() => setPaymentMethod('opay')} icon={<Wallet size={18} />} label="OPay" />
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || processing}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-3xl text-lg shadow-xl shadow-blue-900/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                >
                  {processing ? <Loader2 size={24} className="animate-spin" /> : <CreditCard size={24} />}
                  Complete Order
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ORDER HISTORY VIEW */
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-800/20 p-4 md:p-6 rounded-3xl border border-slate-700/50">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex flex-wrap items-center gap-3 md:gap-4 md:border-r border-slate-700/50 md:pr-6">
                <div className="flex items-center gap-2 text-slate-200 shadow-sm w-full md:w-auto">
                  <Filter size={18} className="text-blue-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Filter:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['all', 'cash', 'moniepoint', 'opay'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setHistoryFilter(f)}
                      className={`px-3 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
                        historyFilter === f ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-white uppercase tracking-widest shadow-sm">Date:</span>
                <input 
                  type="date" 
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-blue-400 font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div className="flex flex-row items-center justify-between xl:justify-end gap-6 md:pl-6 md:border-l border-slate-700/50">
               <div>
                  <p className="text-[10px] md:text-xs text-slate-200 font-black uppercase tracking-widest mb-1 shadow-sm">{historyFilter} Total</p>
                  <p className="text-xl md:text-2xl font-black text-blue-400">₦{filteredTotal.toLocaleString()}</p>
               </div>
               <button 
                onClick={handleGenerateSummaryReceipt}
                disabled={filteredHistory.length === 0}
                className="flex items-center gap-2 px-4 md:px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
               >
                 <Printer size={16} />
                 <span className="hidden sm:inline">Session Receipt</span>
                 <span className="sm:hidden">Receipt</span>
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredHistory.length > 0 ? filteredHistory.map(order => (
              <div key={order.id} className="bg-slate-800/30 border border-slate-700/30 rounded-3xl p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 group hover:border-slate-600 transition-all">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className={`p-3 md:p-4 rounded-2xl shrink-0 ${
                    order.paymentMethod === 'cash' ? 'bg-emerald-500/10 text-emerald-400' :
                    order.paymentMethod === 'moniepoint' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {order.paymentMethod === 'cash' ? <DollarSign size={20} /> : 
                     order.paymentMethod === 'moniepoint' ? <Smartphone size={20} /> : <Wallet size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg md:text-xl font-bold text-white">₦{order.total?.toLocaleString()}</h4>
                    <p className="text-[10px] md:text-xs text-slate-300 font-bold uppercase tracking-widest mt-1 truncate">
                       {order.items?.length} items • {order.paymentMethod.toUpperCase()} • Staff: {order.staffEmail?.split('@')[0]}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 border-t sm:border-t-0 border-slate-700/30 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right sm:mr-4">
                     <p className="text-[10px] md:text-xs text-slate-200 font-bold">{order.createdAt?.toDate().toLocaleDateString()}</p>
                     <p className="text-[10px] text-slate-400 font-bold tracking-tighter uppercase">{order.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDeleteOrder(order)}
                      className="p-2.5 md:p-3 bg-red-500/10 text-red-500 hover:text-white hover:bg-red-500 rounded-xl md:rounded-2xl transition-all border border-red-500/20"
                      title="Delete Order & Revert Stock"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => setSelectedReceipt(order)}
                      className="p-2.5 md:p-3 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl md:rounded-2xl transition-all border border-slate-800"
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center text-slate-400 bg-slate-900/20 rounded-4xl border border-dashed border-slate-700/50">
                <History size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-bold">No orders found for this view</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {(selectedReceipt || orderComplete) && (
        <ReceiptModal 
          order={selectedReceipt || orderComplete} 
          onClose={() => { setSelectedReceipt(null); setOrderComplete(null); }} 
        />
      )}
    </div>
  );
}

function ReceiptModal({ order, onClose }) {
  const receiptRef = useRef();

  const handlePrint = () => {
    const printContent = receiptRef.current.innerHTML;
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    windowPrint.document.write(`
      <html>
        <head>
          <title>S-BAKO ShopHub Receipt</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
            .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          ${printContent}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-4xl overflow-hidden shadow-2xl relative animate-in zoom-in-95">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-800 text-white rounded-full"><X size={20} /></button>
        
        <div className="p-8">
           <div ref={receiptRef} className="bg-white p-6 rounded-2xl text-slate-900">
              <div className="header text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter">ShopHub</h3>
                <p className="text-[10px] font-bold text-slate-500">
                  {order.isSummary ? 'SESSION SUMMARY RECEIPT' : 'LOKOJA BRANCH, NIGERIA'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}</p>
                {order.isSummary && (
                  <p className="text-[10px] font-black text-blue-600 mt-2 uppercase tracking-widest">Filter: {order.paymentMethod}</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm">
                    <div className="flex-1">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-[10px] text-slate-500">{item.quantity} x ₦{item.price.toLocaleString()}</p>
                    </div>
                    <span className="font-black">₦{(item.quantity * item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-4 space-y-2">
                <div className="flex justify-between font-black text-xl">
                  <span>TOTAL</span>
                  <span>₦{order.total?.toLocaleString() || order.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>PAYMENT</span>
                  <span className="text-blue-600">{order.paymentMethod?.toUpperCase()}</span>
                </div>
              </div>

              <div className="mt-8 text-center text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] border-t border-slate-100 pt-4">
                Thank you for your business!<br/>Original Thermal Receipt
              </div>
           </div>

           <div className="mt-8 flex gap-4">
              <button 
                onClick={handlePrint}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                Generate Receipt
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function PaymentBtn({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
        active 
          ? 'bg-blue-600/10 border-blue-600 text-white shadow-lg' 
          : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
      }`}
    >
      <div className={`p-2 rounded-xl ${active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
        {icon}
      </div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );
}
