import React, { useState, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, writeBatch, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import Papa from 'papaparse';
import { useStore } from '../context/StoreContext';
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileText, Download } from 'lucide-react';

export default function BulkUpload({ onComplete }) {
  const { currentStore } = useStore();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        return setError('Please upload a CSV file.');
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const downloadSample = () => {
    const csvContent = "name,sku,category,brand,selling_price,cost_price,description,stockShop,stockWarehouse,minStockThreshold\n" +
                       "Samsung TV,SAM-TV-01,Electronics,Samsung,450000,380000,65 inch 4K Smart TV,10,20,5\n" +
                       "Dano Milk,DANO-MLK-02,Groceries,Dano,2500,2100,400g Powdered Milk,50,100,10";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "shophub_sample_products.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processUpload = () => {
    if (!file || !currentStore) {
      if (!currentStore) setError("Please select a branch first.");
      return;
    }
    setLoading(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        setProgress({ total: data.length, current: 0 });
        
        try {
          const batch = writeBatch(db);
          let count = 0;
          let skipped = 0;
          
          // Basic validation and batching
          // Note: Firestore batches have a 500 document limit
          for (const row of data) {
            const price = parseFloat(row.selling_price || row.price);
            if (!row.name || !row.sku || isNaN(price)) {
              skipped++;
              continue;
            }

            const newDocRef = doc(collection(db, 'products'));
            batch.set(newDocRef, {
              storeId: currentStore.id,
              name: row.name,
              sku: row.sku,
              category: row.category || 'General',
              brand: row.brand || '',
              price: price,
              costPrice: parseFloat(row.cost_price) || 0,
              description: row.description || '',
              imageUrl: '', // Bulk upload usually doesn't include images easily without URLs
              stock: {
                shop: parseInt(row.stockShop) || 0,
                warehouse: parseInt(row.stockWarehouse) || 0
              },
              minStockThreshold: parseInt(row.minStockThreshold) || 5,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            count++;
            setProgress(prev => ({ ...prev, current: count }));
            
            // If we hit 400 (buffer for safety), commit and start new batch? 
            // For simplicity in this demo, we assume < 500 rows for now.
            // In a real app, you'd loop batches.
          }

          if (count > 0) {
            await batch.commit();
            setResults({ success: count, skipped });
          } else {
            setError('No valid rows found in CSV.');
          }
        } catch (err) {
          console.error(err);
          setError('Error uploading to database. Check your connection.');
        }
        setLoading(false);
      },
      error: (err) => {
        setError('Error parsing CSV. Please check formatting.');
        setLoading(false);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h3 className="text-2xl font-medium text-slate-900 mb-2">Bulk Product Upload</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Upload a CSV file containing your product list. Make sure to use our template for the best results.
        </p>
      </div>

      {!results ? (
        <div className="space-y-6">
          <div 
            onClick={() => !loading && fileInputRef.current.click()}
            className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
              file ? 'border-slate-800/50 bg-slate-900/5' : 'border-slate-300 hover:border-slate-800/50 hover:bg-white'
            } ${loading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {file ? (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-slate-900 rounded-2xl mb-4 shadow-lg shadow-slate-900/20">
                  <FileText size={32} className="text-slate-900" />
                </div>
                <p className="text-slate-900 font-medium text-lg">{file.name}</p>
                <p className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-4 text-red-400 hover:text-red-300 text-sm font-medium underline"
                >
                  Remove File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <Upload size={48} strokeWidth={1.5} className="mb-4" />
                <p className="font-medium text-lg">Click to select CSV</p>
                <p className="text-sm mt-1 uppercase tracking-widest font-bold opacity-40">or drag and drop</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".csv"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm animate-in shake duration-300">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={downloadSample}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-300 font-medium transition-all"
            >
              <Download size={20} />
              Download Template
            </button>
            <button
              onClick={processUpload}
              disabled={!file || loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-white disabled:text-slate-600 text-white rounded-2xl font-medium shadow-xl shadow-slate-900/20 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Start Upload
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center bg-white border border-slate-300 p-10 rounded-3xl animate-in zoom-in-95 duration-500">
          <div className="inline-flex p-4 bg-emerald-500/10 rounded-full mb-6">
            <CheckCircle size={48} className="text-emerald-500" />
          </div>
          <h4 className="text-2xl font-medium text-slate-900 mb-2">Upload Complete!</h4>
          <p className="text-slate-400 mb-8">
            Successfully imported <span className="text-emerald-400 font-medium">{results.success}</span> products.
            {results.skipped > 0 && ` ${results.skipped} rows were skipped due to missing data.`}
          </p>
          <button
            onClick={() => { setResults(null); setFile(null); onComplete(); }}
            className="px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-2xl transition-all"
          >
            Back to Catalog
          </button>
        </div>
      )}
    </div>
  );
}
