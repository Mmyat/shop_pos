import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Search, ShoppingCart, Trash2, Plus, Minus, Package, Printer } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string;
  barcode: string;
}

interface CartItem extends Product {
  cartQuantity: number;
}

interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  items: any[];
}

const POS = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8080/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.cartQuantity < product.stock_quantity) {
        setCart(cart.map(item =>
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        ));
      }
    } else {
      if (product.stock_quantity > 0) {
        setCart([...cart, { ...product, cartQuantity: 1 }]);
      }
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      alert('Product not found with this barcode');
    }
  };

  const handlePrint = (sale: Sale) => {
    const printContent = document.getElementById('receipt-print');
    if (printContent) {
      const win = window.open('', '', 'height=600,width=400');
      win?.document.write('<html><head><title>Receipt</title><style>body{font-family:monospace;padding:20px;width:300px;}table{width:100%;border-collapse:collapse;}.text-right{text-align:right;}.border-t{border-top:1px dashed #000;margin:10px 0;}</style></head><body>');
      win?.document.write(printContent.innerHTML);
      win?.document.write('</body></html>');
      win?.document.close();
      win?.focus();
      win?.print();
      win?.close();
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.cartQuantity + delta;
        if (newQ > 0 && newQ <= item.stock_quantity) {
          return { ...item, cartQuantity: newQ };
        }
        return item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

      const payload = {
        total_amount: totalAmount,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.cartQuantity,
          price: item.price
        }))
      };

      const res = await axios.post('http://localhost:8080/api/sales', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Backend now returns the full sale object with items
      if (res.data && res.data.id) {
        setLastSale(res.data);
        setCart([]);
        fetchProducts();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error(err);
      alert('Checkout failed! Please check the backend is running.');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const total = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  return (
    <>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-4 sm:gap-6">
        {/* Product Selection */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[50vh] lg:min-h-0">
          <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={18} />
              <input
                type="text"
                placeholder="Scan Barcode..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-primary-100 rounded-xl focus:border-primary-500 outline-none transition-all font-mono text-sm"
                value={barcodeInput}
                autoFocus
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
            </form>
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={t('search')}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-gray-50/30">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  product.stock_quantity > 0
                    ? 'bg-white border-gray-100 hover:border-primary-300 hover:shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="h-24 bg-primary-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={32} className="text-primary-300" />
                  )}
                </div>
                <h4 className="font-semibold text-gray-800 line-clamp-1">{product.name}</h4>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-primary-600 font-bold">${product.price.toFixed(2)}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    {t('stock')}: {product.stock_quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:flex-shrink-0">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center text-gray-800">
              <ShoppingCart className="mr-2" size={20} />
              Current Order
            </h2>
            <span className="bg-primary-100 text-primary-700 py-1 px-3 rounded-full text-sm font-semibold">
              {cart.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart size={48} className="mb-4 opacity-50" />
                <p>{t('no_items')}</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex flex-col p-3 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="flex justify-between font-medium text-gray-800 mb-2">
                    <span>{item.name}</span>
                    <span>${(item.price * item.cartQuantity).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 text-gray-500 hover:text-primary-600 hover:bg-white rounded transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-semibold w-4 text-center text-sm">{item.cartQuantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 text-gray-500 hover:text-primary-600 hover:bg-white rounded transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-600 font-medium">{t('total')}</span>
              <span className="text-3xl font-bold text-gray-900">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={checkout}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${
                cart.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg transform hover:-translate-y-1'
              }`}
            >
              {t('checkout')}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div id="receipt-print" className="font-mono text-sm">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold uppercase">Household Shop</h2>
                <p>Receipt #: {lastSale.id}</p>
                <p>{new Date(lastSale.created_at).toLocaleString()}</p>
                <div className="border-t my-2"></div>
              </div>
              <table className="w-full mb-4">
                <tbody>
                  {(lastSale.items ?? []).map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product?.name} x{item.quantity}</td>
                      <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t pt-2 font-bold flex justify-between">
                <span>TOTAL</span>
                <span>${lastSale.total_amount.toFixed(2)}</span>
              </div>
              <div className="text-center mt-6">
                <p>Thank You!</p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setLastSale(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold"
              >
                Done
              </button>
              <button
                onClick={() => handlePrint(lastSale)}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold flex items-center justify-center"
              >
                <Printer size={18} className="mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default POS;
