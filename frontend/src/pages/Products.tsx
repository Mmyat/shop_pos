import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { Plus, Edit2, Trash2, Package, Search } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  category_id: number;
  image_url: string;
  barcode: string;
  category?: {
    id: number;
    name: string;
    description: string;
  };
}

interface Category {
  id: number;
  name: string;
}

const emptyProductForm = {
  name: '',
  price: 0,
  stock_quantity: 0,
  low_stock_threshold: 5,
  category_id: 0,
  image_url: '',
  barcode: '',
};

const Products = () => {
  const { t } = useTranslation();

  // Role authentication state
  const [isAdmin, setIsAdmin] = useState(false);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal and form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(emptyProductForm);

  useEffect(() => {
    // Extract logged in user credentials
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        setIsAdmin(user.role === 'admin');
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }

    fetchProducts();
    fetchCategories();
  }, []);

  // Update default category ID for product form once categories are fetched
  useEffect(() => {
    if (categories.length > 0 && formData.category_id === 0) {
      setFormData(prev => ({ ...prev, category_id: categories[0].id }));
    }
  }, [categories, formData.category_id]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      ...emptyProductForm,
      category_id: categories[0]?.id || 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
      category_id: product.category_id,
      image_url: product.image_url,
      barcode: product.barcode,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock_quantity),
        low_stock_threshold: Number(formData.low_stock_threshold),
        category_id: Number(formData.category_id),
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to save product. Ensure the barcode is unique and all fields are complete.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to delete product.');
    }
  };

  const getStockBadge = (qty: number, threshold: number) => {
    if (qty === 0) return 'bg-red-100 text-red-700';
    if (qty <= threshold) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Package size={22} className="mr-2 text-primary-500" />
            {t('products')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">Manage and track your shop's inventory items</p>
        </div>

        <div>
          {isAdmin ? (
            <button
              onClick={openAddModal}
              className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl hover:bg-primary-700 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto"
            >
              <Plus size={18} />
              <span>{t('add_product')}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
              <span>View-only mode (Admin required to modify)</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search products by name, category, or barcode..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Loading Spin */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-200 border-t-primary-600"></div>
        </div>
      ) : (
        /* Products Table Grid */
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">Image</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">{t('name')}</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">Category</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">Barcode</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">{t('price')}</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">{t('stock')}</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">Min. Alert</th>
                {isAdmin && <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm text-right w-32">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} className="text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800 text-sm max-w-[160px] truncate" title={product.name}>
                    {product.name}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-sm">
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold">
                      {product.category?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-sm font-mono">{product.barcode || '-'}</td>
                  <td className="py-3 px-4 text-gray-800 text-sm font-semibold">${product.price.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStockBadge(product.stock_quantity, product.low_stock_threshold)}`}>
                      {product.stock_quantity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-sm font-mono">{product.low_stock_threshold}</td>
                  {isAdmin && (
                    <td className="py-3 px-4">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-gray-400 text-sm">
                    No products found. Add an item to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ADD / EDIT PRODUCT MODAL (ADMIN ONLY) --- */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-5">
              {editingProduct ? 'Edit Product' : t('add_product')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                />
                {formData.image_url && (
                  <div className="mt-2 flex items-center space-x-2">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="h-14 w-14 rounded-lg object-cover border border-gray-200"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <span className="text-xs text-gray-400 font-mono truncate max-w-xs">{formData.image_url}</span>
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode / SKU</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="e.g. 000001"
                  required
                  value={formData.barcode}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('price')} ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field"
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stock')}</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    required
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Alert threshold & Categories dropdown selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert Min.</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    required
                    value={formData.low_stock_threshold}
                    onChange={e => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="input-field bg-white"
                    required
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: Number(e.target.value) })}
                  >
                    {categories.length === 0 ? (
                      <option value={0}>No Categories Available</option>
                    ) : (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium text-sm"
                >
                  {editingProduct ? 'Update' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
