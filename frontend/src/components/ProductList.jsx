import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, increment, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { Package, Box, AlertTriangle, Search, Filter, Trash2, Loader2, Eye, X, ShoppingCart, Warehouse, ArrowRightLeft, ArrowUpCircle, History, DollarSign, Check, Pencil } from 'lucide-react';

export default function ProductList() {
  const { isAdmin } = useAuth();
  const { currentStore } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);

  useEffect(() => {
    if (!currentStore) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'products'), 
      where('storeId', '==', currentStore.id),
      orderBy('createdAt', 'desc')
    );
    
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
  }, [currentStore]);

  async function handleDelete(productId) {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      setDeletingId(productId);
      try {
        // Optimistic UI update: Remove from list immediately
        setProducts(prev => prev.filter(p => p.id !== productId));
        await deleteDoc(doc(db, 'products', productId));
        setSelectedIds(prev => prev.filter(id => id !== productId));
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product. Please try again.");
      }
      setDeletingId(null);
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} products? This action cannot be undone.`)) {
      setIsBulkDeleting(true);
      try {
        // FireBatch for atomic deletion
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        // Optimistic UI update: Remove all selected from list immediately
        const idsToRemove = [...selectedIds];
        setProducts(prev => prev.filter(p => !idsToRemove.includes(p.id)));
        
        selectedIds.forEach(id => {
          batch.delete(doc(db, 'products', id));
        });
        await batch.commit();
        setSelectedIds([]);
      } catch (error) {
        console.error("Error bulk deleting products:", error);
        alert("Failed to delete some products. Please try again.");
      }
      setIsBulkDeleting(false);
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Extract unique categories from products
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean).sort())];

  // Find duplicates
  const duplicateNames = new Set();
  const nameCounts = {};
  products.forEach(p => {
    const name = p.name?.toLowerCase().trim() || '';
    if (name) {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
      if (nameCounts[name] > 1) duplicateNames.add(name);
    }
  });

  let filteredProducts = products.filter(p => {
    const st = searchTerm.toLowerCase();
    const pName = p.name?.toLowerCase() || '';
    const pSku = p.sku?.toLowerCase() || '';
    const pCat = p.category?.toLowerCase() || '';
    
    // Search match
    const searchMatch = !searchTerm || 
      pName.includes(st) ||
      pSku.includes(st) ||
      pCat.includes(st);
    
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
    
    // Duplicate match
    const duplicateMatch = !showDuplicates || duplicateNames.has(pName.trim());

    return searchMatch && categoryMatch && priceMatch && stockMatch && duplicateMatch;
  });

  // Hierarchical Search Sorting
  if (searchTerm) {
    const st = searchTerm.toLowerCase();
    filteredProducts.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      
      const aExact = aName === st;
      const bExact = bName === st;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStarts = aName.startsWith(st);
      const bStarts = bName.startsWith(st);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return 0;
    });
  } else if (showDuplicates) {
    // If showing duplicates, sort by name to group them together
    filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 animate-pulse">
        <Package size={48} className="mb-4" />
        <p className="text-lg">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-2 md:p-4 rounded-2xl border border-slate-300">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, SKU or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all text-sm md:text-base"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          {filteredProducts.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl border transition-all text-sm font-medium ${
                selectedIds.length > 0 
                  ? 'bg-slate-700 border-slate-600 text-slate-900' 
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              <div className={`size-4 rounded border flex items-center justify-center transition-all ${
                selectedIds.length === filteredProducts.length && filteredProducts.length > 0
                  ? 'bg-slate-900 border-slate-900' 
                  : 'border-slate-500'
              }`}>
                {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 && <Check size={12} className="text-slate-900" />}
                {selectedIds.length > 0 && selectedIds.length < filteredProducts.length && <div className="w-2 h-0.5 bg-slate-900 rounded-full" />}
              </div>
              <span className="hidden sm:inline">Select All</span>
              <span className="sm:hidden">All</span>
            </button>
          )}

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl border transition-all text-sm font-medium ${
              showFilters || filterCategory !== 'all' || filterStock !== 'all' || minPrice || maxPrice || showDuplicates
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10' 
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            <Filter size={18} />
            {showFilters ? 'Hide Filters' : 'Filters'}
          </button>
        </div>
      </div>

      {/* Selection Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900/10 border border-slate-800/20 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-medium text-sm shadow-lg shadow-slate-900/10">
              {selectedIds.length}
            </div>
            <p className="text-sm font-medium text-slate-700">Products Selected</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-500 text-slate-900 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
            >
              {isBulkDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-300 p-6 rounded-3xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none appearance-none cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                ))}
              </select>
            </div>

            {/* Stock Status Filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stock Status</label>
              <select 
                value={filterStock}
                onChange={(e) => setFilterStock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Items</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock Alerts</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Price Range (₦)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                />
                <span className="text-slate-700">—</span>
                <input 
                  type="number" 
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            {/* Duplicates Toggle */}
            <div className="space-y-2 lg:col-span-4 flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="showDuplicates" 
                checked={showDuplicates}
                onChange={(e) => setShowDuplicates(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 bg-slate-50 text-slate-900 focus:ring-slate-900 focus:ring-offset-slate-900"
              />
              <label htmlFor="showDuplicates" className="text-sm font-medium text-slate-900 cursor-pointer select-none">
                Show Duplicate Products Only
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-300">
            <p className="text-xs text-slate-400 font-medium">Showing {filteredProducts.length} of {products.length} products</p>
            <button 
              onClick={() => {
                setFilterCategory('all');
                setFilterStock('all');
                setMinPrice('');
                setMaxPrice('');
                setSearchTerm('');
                setShowDuplicates(false);
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
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
            isSelected={selectedIds.includes(product.id)}
            onSelect={() => toggleSelect(product.id)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center p-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
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
  const [manualShopStock, setManualShopStock] = useState(product.stock?.shop || 0);
  const [manualWarehouseStock, setManualWarehouseStock] = useState(product.stock?.warehouse || 0);
  const [message, setMessage] = useState(null);
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editName, setEditName] = useState(product.name || '');
  const [editSku, setEditSku] = useState(product.sku || '');
  const [editCategory, setEditCategory] = useState(product.category || 'General');
  const fileInputRef = React.useRef();

  async function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('Image must be less than 2MB');
      setNewImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleImageSave() {
    if (!newImage) return;
    setIsUpdating(true);
    try {
      const storageRef = ref(storage, `product-images/${Date.now()}_${newImage.name}`);
      const uploadResult = await uploadBytes(storageRef, newImage);
      const imageUrl = await getDownloadURL(uploadResult.ref);
      
      await updateDoc(doc(db, 'products', product.id), {
        imageUrl: imageUrl,
        updatedAt: serverTimestamp()
      });
      
      setMessage({ type: 'success', text: 'Image updated successfully!' });
      setNewImage(null);
      setImagePreview(null);
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      alert('Failed to update image');
    }
    setIsUpdating(false);
  }

  async function handleDetailsUpdate(e) {
    if (e) e.preventDefault();
    if (!editName.trim()) return alert('Product name is required');
    
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'products', product.id), {
        name: editName.trim(),
        sku: editSku.trim(),
        category: editCategory.trim(),
        updatedAt: serverTimestamp()
      });
      
      setMessage({ type: 'success', text: 'Product details updated!' });
      setTimeout(() => {
        setMode('view');
        setMessage(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Failed to update product details');
    }
    setIsUpdating(false);
  }

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
    if (updateType !== 'manual_adjustment' && (isNaN(qty) || qty <= 0)) {
      return alert('Please enter a valid amount');
    }

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
      } else if (updateType === 'manual_adjustment') {
        const ms = parseInt(manualShopStock);
        const mw = parseInt(manualWarehouseStock);
        updateData = {
          'stock.shop': ms,
          'stock.warehouse': mw
        };
        movementData = {
          ...movementData,
          type: 'manual_adjustment',
          quantity: (ms + mw) - ((product.stock?.shop || 0) + (product.stock?.warehouse || 0)),
          oldShopStock: product.stock?.shop || 0,
          newShopStock: ms,
          oldWarehouseStock: product.stock?.warehouse || 0,
          newWarehouseStock: mw
        };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-slate-50/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white border-x border-b md:border border-slate-300 w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] md:rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-white hover:bg-slate-100 text-slate-900 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-y-auto">
          <div className="aspect-[16/10] md:aspect-square bg-slate-50 relative group shrink-0">
            {imagePreview || product.imageUrl ? (
              <img src={imagePreview || product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-800">
                <Package size={120} />
              </div>
            )}
            
            {/* Image Overlay Controls */}
            <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
              <button 
                onClick={() => fileInputRef.current.click()}
                className="bg-white text-slate-900 px-6 py-2 rounded-full font-medium shadow-xl hover:scale-105 transition-all text-sm"
              >
                {product.imageUrl ? 'Change Photo' : 'Add Photo'}
              </button>
              {newImage && (
                <button 
                  onClick={handleImageSave}
                  disabled={isUpdating}
                  className="bg-slate-900 text-white px-6 py-2 rounded-full font-medium shadow-xl hover:scale-105 transition-all text-sm flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={14} /> : 'Save New Photo'}
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />

            <div className="absolute bottom-6 left-6 right-6 flex gap-2">
               <span className="px-3 py-1 bg-slate-900/90 backdrop-blur-md text-slate-900 text-xs font-medium rounded-full border border-slate-300">
                {product.category || 'General'}
              </span>
            </div>
          </div>

          <div className="p-6 md:p-10 flex flex-col">
            {mode === 'view' ? (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                <div>
                  <div className="flex items-center gap-3 group/title mb-2">
                    <h2 className="text-3xl font-medium text-slate-900">{product.name}</h2>
                    <button 
                      onClick={() => setMode('edit_details')}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-blue-400/10 rounded-lg transition-all opacity-0 group-hover/title:opacity-100"
                      title="Edit Product Details"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
                  <p className="text-sm font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Box size={14} />
                    SKU: {product.sku}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="text-5xl font-bold text-slate-900">
                    ₦{product.price?.toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-300 p-5 rounded-2xl relative">
                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Shop Floor</p>
                    <p className="text-3xl font-medium text-slate-900">{product.stock?.shop || 0}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-300 p-5 rounded-2xl relative">
                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Warehouse</p>
                    <p className="text-3xl font-medium text-slate-900">{product.stock?.warehouse || 0}</p>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl">
                  <p className="text-emerald-500/70 text-[10px] font-bold uppercase mb-1">Cost Price</p>
                  <p className="text-3xl font-medium text-emerald-400">₦{(product.costPrice || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-500/50 font-medium mt-1 uppercase">Margin: ₦{(product.price - (product.costPrice || 0)).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 mt-auto">
                  <button 
                    onClick={() => setMode('stock')}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-4 rounded-xl shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ArrowRightLeft size={20} />
                    Stock
                  </button>
                  <button 
                    onClick={() => setMode('price')}
                    className="bg-white hover:bg-slate-100 text-slate-900 font-medium py-4 rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95 text-slate-700"
                  >
                    <DollarSign size={20} />
                    Adjust Price
                  </button>
                </div>
              </div>
            ) : mode === 'edit_details' ? (
              <form onSubmit={handleDetailsUpdate} className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                <div className="flex items-center gap-4 mb-2">
                   <button type="button" onClick={() => setMode('view')} className="p-2 text-slate-400 hover:text-slate-900"><X size={20} /></button>
                   <h3 className="text-xl font-medium text-slate-900">Edit Product Details</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Product Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-4 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium"
                      placeholder="Enter product name..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">SKU</label>
                    <input 
                      type="text" 
                      value={editSku}
                      onChange={(e) => setEditSku(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-4 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-mono"
                      placeholder="Enter SKU..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Category</label>
                    <input 
                      type="text" 
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-4 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                      placeholder="Enter category..."
                    />
                  </div>
                </div>
                {message && <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-medium border border-emerald-500/20">{message.text}</div>}
                <div className="mt-auto">
                   <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    Save Changes
                  </button>
                </div>
              </form>
            ) : mode === 'price' ? (
              <form onSubmit={handlePriceUpdate} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-2">
                   <button type="button" onClick={() => setMode('view')} className="p-2 text-slate-400 hover:text-slate-900"><X size={20} /></button>
                   <h3 className="text-xl font-medium text-slate-900">Price Adjustment</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">New Selling Price (₦)</label>
                    <input 
                      type="number" 
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-4 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-2xl font-medium"
                      placeholder="Enter new price..."
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-emerald-500 uppercase tracking-widest block ml-1">New Cost Price (₦)</label>
                    <input 
                      type="number" 
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value)}
                      className="w-full bg-white border border-emerald-500/30 text-emerald-400 px-4 py-4 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-2xl font-medium placeholder:text-emerald-900/50"
                      placeholder="Enter cost price..."
                    />
                  </div>
                </div>
                {message && <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-medium border border-emerald-500/20">{message.text}</div>}
                <div className="mt-auto">
                   <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-5 rounded-2xl shadow-xl transition-all"
                  >
                    {isUpdating ? <Loader2 className="animate-spin inline mr-2" /> : <DollarSign className="inline mr-2" size={20} />}
                    Apply New Price
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleStockUpdate} className="space-y-6 animate-in slide-in-from-left-4 duration-300 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-2">
                   <button type="button" onClick={() => setMode('view')} className="p-2 text-slate-400 hover:text-slate-900"><X size={20} /></button>
                   <h3 className="text-xl font-medium text-slate-900">Stock Control</h3>
                </div>

                <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[250px] pr-2">
                  <StockActionBtn active={updateType === 'transfer_to_shop'} onClick={() => setUpdateType('transfer_to_shop')} label="Whouse → Shop" />
                  <StockActionBtn active={updateType === 'transfer_to_warehouse'} onClick={() => setUpdateType('transfer_to_warehouse')} label="Shop → Whouse" />
                  <StockActionBtn active={updateType === 'restock_warehouse'} onClick={() => setUpdateType('restock_warehouse')} label="Add to Whouse" />
                  <StockActionBtn active={updateType === 'restock_shop'} onClick={() => setUpdateType('restock_shop')} label="Add to Shop" />
                  <StockActionBtn active={updateType === 'manual_adjustment'} onClick={() => setUpdateType('manual_adjustment')} label="Direct Edit (Manual)" />
                </div>

                {updateType === 'manual_adjustment' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">New Shop Qty</label>
                      <input 
                        type="number" 
                        value={manualShopStock} 
                        onChange={(e) => setManualShopStock(e.target.value)} 
                        className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-4 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">New Whouse Qty</label>
                      <input 
                        type="number" 
                        value={manualWarehouseStock} 
                        onChange={(e) => setManualWarehouseStock(e.target.value)} 
                        className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-4 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Quantity</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-4 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none" placeholder="Enter quantity..." required />
                  </div>
                )}

                {message && <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-medium border border-emerald-500/20">{message.text}</div>}

                <div className="mt-auto">
                  <button type="submit" disabled={isUpdating} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
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
      className={`p-4 rounded-xl border transition-all text-sm font-medium text-left ${
        active ? 'bg-slate-900/10 border-slate-900 text-slate-900' : 'bg-white border-slate-300 text-slate-400 hover:border-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({ product, onDelete, isDeleting, onQuickView, isSelected, onSelect }) {
  const { isAdmin } = useAuth();
  const totalStock = (product.stock?.shop || 0) + (product.stock?.warehouse || 0);
  const isLowStock = totalStock <= (product.minStockThreshold || 5);

  return (
    <div className={`bg-white border rounded-3xl overflow-hidden group hover:border-slate-800/50 transition-all duration-300 flex flex-col h-full relative ${
      isSelected ? 'border-slate-800 ring-2 ring-blue-500/20 shadow-2xl shadow-blue-900/40' : 'border-slate-300'
    }`}>
      {/* Checkbox Overlay */}
      <div 
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`absolute top-4 right-4 z-20 size-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
          isSelected 
            ? 'bg-slate-900 border-slate-900 scale-110 shadow-lg' 
            : 'bg-white border-slate-600 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <Check size={16} className="text-slate-900" />}
      </div>

      <div className="aspect-[4/3] relative overflow-hidden bg-white border-b border-slate-300 cursor-pointer" onClick={onQuickView}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700"><Package size={48} /></div>
        )}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white backdrop-blur-md border border-slate-300 text-[10px] font-bold uppercase tracking-widest text-slate-700 rounded-full">
            {product.category || 'General'}
          </span>
        </div>
        {isLowStock && (
          <div className="absolute bottom-4 left-4">
             <span className="px-3 py-1 bg-red-500/90 text-slate-900 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg shadow-red-900/20">
              <AlertTriangle size={12} />
              Low Stock
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button onClick={(e) => { e.stopPropagation(); onQuickView(); }} className="p-3 bg-white text-slate-900 rounded-2xl hover:scale-110 transition-transform shadow-xl"><Eye size={20} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} disabled={isDeleting} className="p-3 bg-red-600 text-slate-900 rounded-2xl hover:scale-110 transition-transform shadow-xl"><Trash2 size={20} /></button>
        </div>
      </div>

      <div className="p-4 md:p-5 flex flex-col flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{product.brand || 'No Brand'}</p>
              <h4 className="text-lg font-medium text-slate-900 truncate">{product.name}</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {product.sku}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-emerald-500/50 font-bold uppercase tracking-[0.1em]">Margin</p>
              <p className="text-xs font-bold text-emerald-400">₦{(product.price - (product.costPrice || 0)).toLocaleString()}</p>
            </div>
          </div>

        <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 rounded-2xl mt-auto border border-slate-300">
          <div className="text-center flex-1 border-r border-slate-300">
            <p className="text-[10px] text-slate-400 font-medium uppercase mb-1">Shop</p>
            <p className="text-sm font-medium text-slate-900">{product.stock?.shop || 0}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[10px] text-slate-400 font-medium uppercase mb-1">Whouse</p>
            <p className="text-sm font-medium text-slate-900">{product.stock?.warehouse || 0}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-xl font-bold text-slate-900">₦{product.price?.toLocaleString()}</div>
          <button onClick={onQuickView} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl border border-slate-300 transition-all active:scale-95">Manage</button>
        </div>
      </div>
    </div>
  );
}
