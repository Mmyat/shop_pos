import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../utils/api";
import { formatMMK } from "../utils/currency";
import { useToast } from "../components/Toast";
import { Search, ShoppingCart, Trash2, Plus, Minus, Package, Printer, UserPlus, X } from "lucide-react";

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

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  points: number;
}

interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  items: any[];
}

const POS = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer / loyalty
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSearching, setCustomerSearching] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products?page_size=100");
      const data = res.data as any;
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setProducts(items);
    } catch (err) {
      console.error(err);
    }
  };

  const lookupCustomer = async () => {
    const phone = customerPhone.trim();
    if (!phone) return;
    setCustomerSearching(true);
    try {
      let res;
      try {
        res = await api.get(`/customers/phone/${encodeURIComponent(phone)}`);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          // Auto-create a walk-in customer for this phone number
          const created = await api.post("/customers", { name: `Walk-in ${phone}`, phone });
          res = created;
        } else {
          throw err;
        }
      }
      setCustomer(res.data as Customer);
      toast.success(t("customer_attached"));
    } catch (err) {
      console.error(err);
      toast.error(t("customer_error"));
    } finally {
      setCustomerSearching(false);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.cartQuantity < product.stock_quantity) {
        setCart(cart.map((item) => (item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item)));
      }
    } else {
      if (product.stock_quantity > 0) {
        setCart([...cart, { ...product, cartQuantity: 1 }]);
      }
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      addToCart(res.data as Product);
      setBarcodeInput("");
      toast.success(t("added_to_cart"));
    } catch (err) {
      toast.error(t("barcode_not_found"));
    }
  };

  const handlePrint = (_sale: Sale) => {
    const printContent = document.getElementById("receipt-print");
    if (printContent) {
      const win = window.open("", "", "height=600,width=400");
      win?.document.write(
        "<html><head><title>Receipt</title><style>body{font-family:monospace;padding:20px;width:300px;}table{width:100%;border-collapse:collapse;}.text-right{text-align:right;}.border-t{border-top:1px dashed #000;margin:10px 0;}</style></head><body>",
      );
      win?.document.write(printContent.innerHTML);
      win?.document.write("</body></html>");
      win?.document.close();
      win?.focus();
      win?.print();
      win?.close();
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.id === id) {
          const newQ = item.cartQuantity + delta;
          if (newQ > 0 && newQ <= item.stock_quantity) {
            return { ...item, cartQuantity: newQ };
          }
          return item;
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const checkout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

      const payload = {
        total_amount: totalAmount,
        customer_id: customer?.id || null,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.cartQuantity,
          price: item.price,
        })),
      };

      const res = await api.post("/sales", payload);

      // Backend now returns the full sale object with items
      if (res.data && res.data.id) {
        const earned = Math.floor(totalAmount / 1000);
        setLastSale(res.data);
        setCart([]);
        setCustomer(null);
        setCustomerPhone("");
        fetchProducts();
        if (earned > 0) {
          toast.success(t("earned_points", { points: earned }));
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error(err);
      alert("Checkout failed! Please check the backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

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
                placeholder={t("scan_barcode")}
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
                placeholder={t("search")}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-gray-50/30">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  product.stock_quantity > 0
                    ? "bg-white border-gray-100 hover:border-primary-300 hover:shadow-md"
                    : "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
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
                  <span className="text-primary-600 font-bold">{formatMMK(product.price)}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    {t("stock")}: {product.stock_quantity}
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
            <span className="bg-primary-100 text-primary-700 py-1 px-3 rounded-full text-sm font-semibold">{cart.length} items</span>
          </div>

          {/* Customer / Loyalty attach */}
          <div className="p-4 border-b border-gray-100 bg-primary-50/40">
            {customer ? (
              <div className="flex items-center justify-between bg-white rounded-xl border border-primary-100 px-3 py-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <UserPlus size={18} className="text-primary-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{customer.name}</p>
                    <p className="text-xs text-gray-500">
                      {t("points")}: <span className="font-bold text-primary-600">{customer.points}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setCustomer(null); setCustomerPhone(""); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={t("clear_customer")}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={16} />
                  <input
                    type="text"
                    placeholder={t("customer_phone")}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-primary-100 rounded-xl focus:border-primary-500 outline-none transition-all text-sm"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupCustomer(); } }}
                  />
                </div>
                <button
                  onClick={lookupCustomer}
                  disabled={customerSearching || !customerPhone.trim()}
                  className="px-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-primary-700 transition-colors"
                >
                  {t("attach_customer")}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart size={48} className="mb-4 opacity-50" />
                <p>{t("no_items")}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex flex-col p-3 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="flex justify-between font-medium text-gray-800 mb-2">
                    <span>{item.name}</span>
                    <span>{formatMMK(item.price * item.cartQuantity)}</span>
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
              <span className="text-gray-600 font-medium">{t("total")}</span>
              <span className="text-3xl font-bold text-gray-900">{formatMMK(total)}</span>
            </div>
            <button
              onClick={checkout}
              disabled={cart.length === 0 || isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${
                cart.length === 0 || isSubmitting
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg transform hover:-translate-y-1"
              }`}
            >
              {isSubmitting ? t("processing") : t("checkout")}
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
                      <td>
                        {item.product?.name} x{item.quantity}
                      </td>
                      <td className="text-right">{formatMMK(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t pt-2 font-bold flex justify-between">
                <span>TOTAL</span>
                 <span>{formatMMK(lastSale.total_amount)}</span>
              </div>
              <div className="text-center mt-6">
                <p>Thank You!</p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={() => setLastSale(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">
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
