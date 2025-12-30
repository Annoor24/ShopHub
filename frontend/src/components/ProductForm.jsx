import React, { useState, useRef } from 'react';
import { db, storage } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Package, Plus, Image as ImageIcon, X, Save, AlertCircle, Loader2 } from 'lucide-react';

export default function ProductForm({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef();

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    brand: '',
    price: '',
    costPrice: '',
    description: '',
    stockShop: 0,
    stockWarehouse: 0,
    minStockThreshold: 5
  });

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return setError('Image size must be less than 2MB');
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let imageUrl = '';
      
      // 1. Upload Image to Storage if exists
      if (image) {
        const storageRef = ref(storage, `product-images/${Date.now()}_${image.name}`);
        const uploadResult = await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      // 2. Save Product to Firestore
      await addDoc(collection(db, 'products'), {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        brand: formData.brand,
        price: parseFloat(formData.price),
        costPrice: parseFloat(formData.costPrice || 0),
        description: formData.description,
        imageUrl,
        stock: {
          shop: parseInt(formData.stockShop),
          warehouse: parseInt(formData.stockWarehouse)
        },
        minStockThreshold: parseInt(formData.minStockThreshold),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (onComplete) onComplete();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Please check your connection and try again.');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Image Upload */}
        <div className="lg:col-span-1">
          <div className="sticky top-0">
            <label className="block text-sm font-black text-white mb-4 uppercase tracking-wider shadow-sm drop-shadow-md">Product Image</label>
            <div 
              onClick={() => fileInputRef.current.click()}
              className={`relative aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${
                imagePreview ? 'border-blue-500/50 bg-slate-800/20' : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/30'
              }`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-medium">Change Image</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-500 group-hover:text-blue-400 transition-colors">
                  <ImageIcon size={48} strokeWidth={1.5} />
                  <p className="mt-4 font-medium">Click to upload</p>
                  <p className="text-xs text-slate-600 mt-1">PNG, JPG (Max 2MB)</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            
            {error && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="Product Name" 
              placeholder="e.g. Wireless Headphones" 
              value={formData.name}
              onChange={(v) => setFormData({...formData, name: v})}
              required
            />
            <InputField 
              label="SKU" 
              placeholder="e.g. WH-1000XM4 (Optional)" 
              value={formData.sku}
              onChange={(v) => setFormData({...formData, sku: v})}
            />
            <InputField 
              label="Category" 
              placeholder="e.g. Electronics" 
              value={formData.category}
              onChange={(v) => setFormData({...formData, category: v})}
            />
            <InputField 
              label="Brand" 
              placeholder="e.g. Sony" 
              value={formData.brand}
              onChange={(v) => setFormData({...formData, brand: v})}
            />
            <InputField 
              label="Selling Price" 
              placeholder="0.00" 
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(v) => setFormData({...formData, price: v})}
              required
            />
            <InputField 
              label="Cost Price (Admin Only)" 
              placeholder="0.00" 
              type="number"
              step="0.01"
              value={formData.costPrice}
              onChange={(v) => setFormData({...formData, costPrice: v})}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-white ml-1 uppercase tracking-wider shadow-sm drop-shadow-md">Description</label>
            <textarea
              className="w-full bg-slate-800/50 border border-slate-700 text-white p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all min-h-[120px] placeholder:text-slate-600"
              placeholder="Describe the product features, specs, etc..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="pt-6 border-t border-slate-800">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Package size={20} className="text-blue-400" />
              Initial Inventory
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputField 
                label="Shop Stock" 
                type="number"
                value={formData.stockShop}
                onChange={(v) => setFormData({...formData, stockShop: v})}
                required
              />
              <InputField 
                label="Warehouse Stock" 
                type="number"
                value={formData.stockWarehouse}
                onChange={(v) => setFormData({...formData, stockWarehouse: v})}
                required
              />
              <InputField 
                label="Low Stock Alert At" 
                type="number"
                value={formData.minStockThreshold}
                onChange={(v) => setFormData({...formData, minStockThreshold: v})}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              disabled={loading}
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Saving Product...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Register Product
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", required = false, step }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-black text-white ml-1 uppercase tracking-wider shadow-sm drop-shadow-md">{label}</label>
      <input
        type={type}
        required={required}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900/60 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder:text-slate-600"
        placeholder={placeholder}
      />
    </div>
  );
}
