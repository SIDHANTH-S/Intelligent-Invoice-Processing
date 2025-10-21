import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Upload, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface InvoiceItem {
  productId?: string;
  name?: string;
  quantity?: number;
  rate?: number;
  gst?: number;
  total?: number;
}

interface InvoiceData {
  companyName?: string;
  address?: string;
  gstNumber?: string;
  date?: string;
  invoiceNumber?: string;
  customerId?: string;
  items: InvoiceItem[];
  subtotal?: number;
  taxes?: number;
  grandTotal?: number;
  comments?: string;
  signatures?: string[];
}

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  stock: number;
}

interface BillItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceImportProps {
  invoice: InvoiceData;
  onClose: () => void;
  onSuccess: () => void;
}

export const InvoiceImport: React.FC<InvoiceImportProps> = ({ invoice, onClose, onSuccess }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Follow BillGenerator pattern EXACTLY
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState(invoice.companyName || '');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]); // DEFAULT current date
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  
  // For adding new items
  const [selectedProduct, setSelectedProduct] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [quantity, setQuantity] = useState('1.00');
  const [price, setPrice] = useState('0.00');

  // Load customers and products from Supabase
  useEffect(() => {
    loadData();
  }, []);

  // Pre-populate items from invoice
  useEffect(() => {
    if (invoice.items && invoice.items.length > 0 && products.length > 0) {
      const mappedItems = invoice.items
        .filter(item => item.name && item.name !== 'N/A' && item.quantity && item.rate)
        .map(item => {
          // Try to find matching product
          const matchingProduct = products.find(p => 
            p.name.toLowerCase() === item.name?.toLowerCase()
          );
          
          return {
            productId: matchingProduct?.id || '',
            productName: item.name || '',
            quantity: item.quantity || 1,
            price: item.rate || 0,
            total: (item.quantity || 1) * (item.rate || 0)
          };
        });
      
      setBillItems(mappedItems);
    }
  }, [invoice.items, products]);

  const loadData = async () => {
    if (!supabase) {
      setLoadingData(false);
      return;
    }

    try {
      const [{ data: customersData }, { data: productsData }] = await Promise.all([
        supabase.from('customers').select('id, name'),
        supabase.from('products').select('id, name, cost_price, selling_price, stock')
      ]);

      if (customersData) setCustomers(customersData);
      if (productsData) setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const addItem = () => {
    if (!selectedProduct && !newProductName) {
      setErrors(['Please select a product or enter a new product name']);
      return;
    }
    
    let productId = '';
    let productName = '';
    let itemPrice = parseFloat(price);

    if (selectedProduct) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        productId = product.id;
        productName = product.name;
        itemPrice = itemPrice || product.selling_price; // Use product price if not set
      }
    } else {
      productName = newProductName;
    }

    const newItem: BillItem = {
      productId,
      productName,
      quantity: parseFloat(quantity),
      price: itemPrice,
      total: parseFloat(quantity) * itemPrice
    };

    setBillItems([...billItems, newItem]);
    setSelectedProduct('');
    setNewProductName('');
    setQuantity('1.00');
    setPrice('0.00');
    setErrors([]);
  };

  const removeItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    const newItems = [...billItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate total
    if (field === 'quantity' || field === 'price') {
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }
    
    setBillItems(newItems);
  };

  const total = billItems.reduce((sum, item) => sum + item.total, 0);

  const validateData = (): string[] => {
    const validationErrors: string[] = [];
    
    if (!selectedCustomer && !newCustomerName) {
      validationErrors.push('Please select a customer or enter a new customer name');
    }
    
    if (!billDate) {
      validationErrors.push('Bill date is required');
    }
    
    if (billItems.length === 0) {
      validationErrors.push('Please add at least one item');
    }
    
    billItems.forEach((item, idx) => {
      if (!item.productName) {
        validationErrors.push(`Item ${idx + 1}: Product name is required`);
      }
      if (item.quantity <= 0) {
        validationErrors.push(`Item ${idx + 1}: Quantity must be greater than 0`);
      }
      if (item.price <= 0) {
        validationErrors.push(`Item ${idx + 1}: Price must be greater than 0`);
      }
    });
    
    return validationErrors;
  };

  const handleImport = async () => {
    const validationErrors = validateData();
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsImporting(true);
    setErrors([]);
    
    try {
      if (!supabase) throw new Error('Supabase not configured');

      let finalCustomerId = selectedCustomer;

      // 1. Handle customer - Check if exists first, then create if needed
      if (selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          finalCustomerId = customer.id;
        }
      } else if (newCustomerName) {
        // Check if customer with this name already exists
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('name', newCustomerName)
          .single();
        
        if (existingCustomer) {
          // Customer already exists, use existing ID
          finalCustomerId = existingCustomer.id;
        } else {
          // Create new customer only if doesn't exist
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: newCustomerName,
              total_revenue: 0,
              total_cost: 0,
              total_profit: 0,
              profit_margin: 0,
              bill_count: 0,
              segment: 'Low Value',
              last_purchase_date: billDate
            })
            .select('id')
            .single();
          
          if (customerError) throw customerError;
          finalCustomerId = newCustomer.id;
        }
      }

      // 2. Handle products - Check if exist first, create only if needed
      const processedItems: BillItem[] = [];
      const productCache = new Map<string, string>(); // Cache: productName -> productId
      
      for (const item of billItems) {
        let productId = item.productId;
        
        // If product doesn't have an ID, try to find or create it
        if (!productId && item.productName) {
          // Check cache first (in case same product appears multiple times in this import)
          if (productCache.has(item.productName)) {
            productId = productCache.get(item.productName)!;
          } else {
            // Check if product exists in database
            const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('name', item.productName)
              .single();
            
            if (existingProduct) {
              // Product exists, use existing ID
              productId = existingProduct.id;
              productCache.set(item.productName, productId);
            } else {
              // Create new product only if doesn't exist
              const { data: newProduct, error: productError } = await supabase
                .from('products')
                .insert({
                  name: item.productName,
                  cost_price: item.price * 0.7, // Estimate: 70% of selling price
                  selling_price: item.price,
                  stock: 0,
                  reorder_threshold: 10,
                  lead_time: 7,
                  category: 'Uncategorized',
                  status: 'Out of Stock'
                })
                .select('id')
                .single();
              
              if (productError) {
                console.warn(`Could not create product ${item.productName}:`, productError);
                // Continue without product ID
              } else {
                productId = newProduct.id;
                productCache.set(item.productName, productId); // Add to cache
              }
            }
          }
        }
        
        processedItems.push({
          ...item,
          productId: productId || ''
        });
      }

      // 3. Insert bill - EXACTLY like BillGenerator addBill logic
      const billNumber = `B${Date.now()}`;
      const dbPayload = {
        bill_number: billNumber,
        customer_id: finalCustomerId,
        bill_date: billDate, // YYYY-MM-DD format
        subtotal: total,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: total,
        status: 'Paid'
        // Note: remarks column doesn't exist in bills table schema
      };
      
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert(dbPayload)
        .select('id')
        .single();
      
      if (billError) throw billError;
      
      // 4. Insert bill items - EXACTLY like BillGenerator
      const itemPayloads = processedItems.map(item => ({
        bill_id: bill.id,
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        rate: item.price,
        amount: item.total
      }));
      
      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(itemPayloads);
      
      if (itemsError) throw itemsError;
      
      // Success!
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Import error:', error);
      setErrors([error.message || 'Failed to import invoice to database']);
    } finally {
      setIsImporting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-gray-700">Loading data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Import Invoice to Database</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0 flex-shrink-0">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Please fix the following issues:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Existing Customer
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select Customer --</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter New Customer Name
              </label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                disabled={!!selectedCustomer}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="New customer name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Add Item Form */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Add Item to Bill</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Product
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    const product = products.find(p => p.id === e.target.value);
                    if (product) {
                      setPrice(product.selling_price.toString());
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Product --</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (₹{product.selling_price})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Or New Product Name
                </label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  disabled={!!selectedProduct}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="New product"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Price (₹)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="md:col-span-3 flex items-end">
                <button
                  onClick={addItem}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {billItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Bill Items ({billItems.length})</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Price (₹)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total (₹)</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {billItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right ml-auto block"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right ml-auto block"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₹{item.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">
                        TOTAL:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 text-lg">
                        ₹{total.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {billItems.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No items added yet. Add items using the form above.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Import to Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
