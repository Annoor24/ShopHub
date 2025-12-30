import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Package, Box, AlertTriangle, Search, Filter, Trash2, Loader2, Eye, X, ShoppingCart, Warehouse, ArrowRightLeft, ArrowUpCircle, History, DollarSign } from 'lucide-react';

export default function ProductList() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleDelete(productId) {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      setDeletingId(productId);
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product. Please try again.");
      }
      setDeletingId(null);
    }
  }

  // Extract unique categories from products
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean).sort())];

  const filteredProducts = products.filter(p => {
    // Search match
    const searchMatch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category match
    const categoryMatch = filterCategory === 'all' || p.category === filterCategory;
    
    // Price match
    const price = p.price || 0;
    const min = parseFloat(minPrice) || 0;
    const max = parseFloat(maxPrice) || Infinity;
    const priceMatch = price >= min && price <= max;
    
    // Stock match
    const totalStock = (p.stock?.shop || 0) + (p.stock?.warehouse || 0);
    const lowStockThreshold = p.minStockThreshold || 5;
    let stockMatch = true;
    if (filterStock === 'in_stock') stockMatch = totalStock > 0;
    else if (filterStock === 'out_of_stock') stockMatch = totalStock <= 0;
    else if (filterStock === 'low_stock') stockMatch = totalStock > 0 && totalStock <= lowStockThreshold;
    
    return searchMatch && categoryMatch && priceMatch && stockMatch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500 animate-pulse">
        <Package size={48} className="mb-4" />
        <p className="text-lg">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-800/20 p-2 md:p-4 rounded-2xl border border-slate-700/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, SKU or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-sm md:text-base"
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border transition-all text-sm font-bold ${
            showFilters || filterCategory !== 'all' || filterStock !== 'all' || minPrice || maxPrice
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/30' 
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
        >
          <Filter size={18} />
          {showFilters ? 'Hide Filters' : 'Filters'}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-slate-800/20 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none appearance-none cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                ))}
              </select>
            </div>

            {/* Stock Status Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock Status</label>
              <select 
                value={filterStock}
                onChange={(e) => setFilterStock(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Items</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock Alerts</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price Range (₦)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
                <span className="text-slate-700">—</span>
                <input 
                  type="number" 
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 font-bold">Showing {filteredProducts.length} of {products.length} products</p>
            <button 
              onClick={() => {
                setFilterCategory('all');
                setFilterStock('all');
                setMinPrice('');
                setMaxPrice('');
                setSearchTerm('');
              }}
              className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onDelete={() => handleDelete(product.id)}
            isDeleting={deletingId === product.id}
            onQuickView={() => setSelectedProduct(product)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center p-20 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700 text-slate-500">
          <Box className="mx-auto mb-4 opacity-20" size={48} />
          <p className="text-lg">No products match your search.</p>
        </div>
      )}

      {selectedProduct && (
        <ManageProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}

function ManageProductModal({ product, onClose }) {
  const { currentUser, isAdmin } = useAuth();
  const [mode, setMode] = useState('view'); // 'view', 'stock', or 'price'
  const [updateType, setUpdateType] = useState('transfer_to_shop'); 
  const [amount, setAmount] = useState('');
  const [newPrice, setNewPrice] = useState(product.price || '');
  const [newCostPrice, setNewCostPrice] = useState(product.costPrice || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  async function handlePriceUpdate(e) {
    e.preventDefault();
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return alert('Please enter a valid price');

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'products', product.id), {
        price: price,
        costPrice: parseFloat(newCostPrice) || product.costPrice || 0,
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'stockMovements'), {
        productId: product.id,
        productName: product.name,
        type: 'price_adjustment',
        oldPrice: product.price,
        newPrice: price,
        oldCostPrice: product.costPrice || 0,
        newCostPrice: parseFloat(newCostPrice) || 0,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        timestamp: serverTimestamp()
      });
      setMessage({ type: 'success', text: 'Pricing updated successfully!' });
      setTimeout(() => { setMode('view'); setMessage(null); }, 1500);
    } catch (err) {
      alert('Failed to update price');
    }
    setIsUpdating(false);
  }

  async function handleStockUpdate(e) {
    e.preventDefault();
    const qty = parseInt(amount);
    if (isNaN(qty) || qty <= 0) return alert('Please enter a valid amount');

    setIsUpdating(true);
    try {
      const productRef = doc(db, 'products', product.id);
      let updateData = {};
      let movementData = {
        productId: product.id,
        productName: product.name,
        type: updateType,
        quantity: qty,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        timestamp: serverTimestamp()
      };

      if (updateType === 'transfer_to_shop') {
        if ((product.stock.warehouse || 0) < qty) throw new Error('Not enough stock in warehouse');
        updateData = {
          'stock.shop': increment(qty),
          'stock.warehouse': increment(-qty)
        };
      } else if (updateType === 'transfer_to_warehouse') {
        if ((product.stock.shop || 0) < qty) throw new Error('Not enough stock in shop');
        updateData = {
          'stock.shop': increment(-qty),
          'stock.warehouse': increment(qty)
        };
      } else if (updateType === 'restock_warehouse') {
        updateData = { 'stock.warehouse': increment(qty) };
      } else if (updateType === 'restock_shop') {
        updateData = { 'stock.shop': increment(qty) };
      }

      await updateDoc(productRef, updateData);
      await addDoc(collection(db, 'stockMovements'), movementData);
      
      setMessage({ type: 'success', text: `Successfully updated stock!` });
      setAmount('');
      setTimeout(() => { setMode('view'); setMessage(null); }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to update stock');
    }
    setIsUpdating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
          <div className="aspect-square bg-slate-950 relative">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-800">
                <Package size={120} />
              </div>
            )}
            <div className="absolute bottom-6 left-6 right-6 flex gap-2">
               <span className="px-3 py-1 bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/10">
                {product.category || 'General'}
              </span>
            </div>
          </div>

          <div className="p-8 md:p-10 flex flex-col min-h-[500px]">
            {mode === 'view' ? (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{product.name}</h2>
                  <p className="text-sm font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Box size={14} />
                    SKU: {product.sku}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="text-5xl font-black text-blue-400">
                    ₦{product.price?.toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl relative">
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Shop Floor</p>
                    <p className="text-3xl font-bold text-white">{product.stock?.shop || 0}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl relative">
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Warehouse</p>
                    <p className="text-3xl font-bold text-white">{product.stock?.warehouse || 0}</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl">
                    <p className="text-emerald-500/70 text-[10px] font-black uppercase mb-1">Cost Price (Admin Only)</p>
                    <p className="text-3xl font-bold text-emerald-400">₦{(product.costPrice || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-500/50 font-bold mt-1 uppercase">Margin: ₦{(product.price - (product.costPrice || 0)).toLocaleString()}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 mt-auto">
                  <button 
                    onClick={() => setMode('stock')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ArrowRightLeft size={20} />
                    Stock
                  </button>
                  <button 
                    onClick={() => setMode('price')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 text-slate-300"
                  >
                    <DollarSign size={20} />
                    Adjust Price
                  </button>
                </div>
              </div>
            ) : mode === 'price' ? (
              <form onSubmit={handlePriceUpdate} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-2">
                   <button type="button" onClick={() => setMode('view')} className="p-2 text-slate-400 hover:text-white"><X size={20} /></button>
                   <h3 className="text-xl font-bold text-white">Price Adjustment</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block ml-1">New Selling Price (₦)</label>
                    <input 
                      type="number" 
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-2xl font-bold"
                      placeholder="Enter new price..."
                      autoFocus
                    />
                  </div>
                  {isAdmin && (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-emerald-500 uppercase tracking-widest block ml-1">New Cost Price (₦)</label>
                      <input 
                        type="number" 
                        value={newCostPrice}
                        onChange={(e) => setNewCostPrice(e.target.value)}
                        className="w-full bg-slate-800 border border-emerald-500/30 text-emerald-400 px-4 py-4 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-2xl font-bold placeholder:text-emerald-900/50"
                        placeholder="Enter cost price..."
                      />
                    </div>
                  )}
                </div>
                {message && <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-bold border border-emerald-500/20">{message.text}</div>}
                <div className="mt-auto">
                   <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl shadow-xl transition-all"
                  >
                    {isUpdating ? <Loader2 className="animate-spin inline mr-2" /> : <DollarSign className="inline mr-2" size={20} />}
                    Apply New Price
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleStockUpdate} className="space-y-6 animate-in slide-in-from-left-4 duration-300 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-2">
                   <button type="button" onClick={() => setMode('view')} className="p-2 text-slate-400 hover:text-white"><X size={20} /></button>
                   <h3 className="text-xl font-bold text-white">Stock Control</h3>
                </div>

                <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[250px] pr-2">
                  <StockActionBtn active={updateType === 'transfer_to_shop'} onClick={() => setUpdateType('transfer_to_shop')} label="Whouse → Shop" />
                  <StockActionBtn active={updateType === 'transfer_to_warehouse'} onClick={() => setUpdateType('transfer_to_warehouse')} label="Shop → Whouse" />
                  <StockActionBtn active={updateType === 'restock_warehouse'} onClick={() => setUpdateType('restock_warehouse')} label="Add to Whouse" />
                  <StockActionBtn active={updateType === 'restock_shop'} onClick={() => setUpdateType('restock_shop')} label="Add to Shop" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block ml-1">Quantity</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" placeholder="Enter quantity..." required />
                </div>

                {message && <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-bold border border-emerald-500/20">{message.text}</div>}

                <div className="mt-auto">
                  <button type="submit" disabled={isUpdating} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                    {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <Package size={20} />}
                    Update Stock
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StockActionBtn({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all text-sm font-bold text-left ${
        active ? 'bg-blue-600/10 border-blue-600 text-white' : 'bg-slate-800/30 border-slate-700 text-slate-500 hover:border-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({ product, onDelete, isDeleting, onQuickView }) {
  const { isAdmin } = useAuth();
  const totalStock = (product.stock?.shop || 0) + (product.stock?.warehouse || 0);
  const isLowStock = totalStock <= (product.minStockThreshold || 5);

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all duration-300 flex flex-col h-full">
      <div className="aspect-[4/3] relative overflow-hidden bg-slate-900 border-b border-slate-800">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700"><Package size={48} /></div>
        )}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-full">
            {product.category || 'General'}
          </span>
        </div>
        {isLowStock && (
          <div className="absolute bottom-4 left-4">
             <span className="px-3 py-1 bg-red-500/90 text-white text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg shadow-red-900/20">
              <AlertTriangle size={12} />
              Low Stock
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button onClick={onQuickView} className="p-3 bg-white text-slate-900 rounded-2xl hover:scale-110 transition-transform shadow-xl"><Eye size={20} /></button>
          {isAdmin && (
            <button onClick={onDelete} disabled={isDeleting} className="p-3 bg-red-600 text-white rounded-2xl hover:scale-110 transition-transform shadow-xl"><Trash2 size={20} /></button>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{product.brand || 'No Brand'}</p>
              <h4 className="text-lg font-bold text-white truncate">{product.name}</h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">SKU: {product.sku}</p>
            </div>
            {isAdmin && (
              <div className="text-right">
                <p className="text-[8px] text-emerald-500/50 font-black uppercase tracking-[0.1em]">Margin</p>
                <p className="text-xs font-black text-emerald-400">₦{(product.price - (product.costPrice || 0)).toLocaleString()}</p>
              </div>
            )}
          </div>

        <div className="flex items-center justify-between mb-4 bg-slate-950 p-3 rounded-2xl mt-auto border border-slate-800">
          <div className="text-center flex-1 border-r border-slate-800">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Shop</p>
            <p className="text-sm font-bold text-white">{product.stock?.shop || 0}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Whouse</p>
            <p className="text-sm font-bold text-white">{product.stock?.warehouse || 0}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-xl font-black text-blue-400">₦{product.price?.toLocaleString()}</div>
          <button onClick={onQuickView} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl border border-slate-700 transition-all active:scale-95">Manage</button>
        </div>
      </div>
    </div>
  );
}
