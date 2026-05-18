import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { Plus, Edit2, Trash2, Layers, Search, ShieldAlert } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description: string;
}

const emptyCategoryForm = {
  name: '',
  description: '',
};

const Categories = () => {
  const { t } = useTranslation();

  // Role authentication state
  const [isAdmin, setIsAdmin] = useState(false);

  // Data list and filter states
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals and form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState(emptyCategoryForm);

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

    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to retrieve categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    if (!isAdmin) return;
    setEditingCategory(null);
    setFormData(emptyCategoryForm);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    if (!isAdmin) return;
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Unauthorized! Only administrators can manage categories.');
      return;
    }

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to save category. Make sure the category name is unique.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      alert('Unauthorized! Only administrators can delete categories.');
      return;
    }
    if (!window.confirm('Delete this category? Products currently assigned to this category might lose their category reference.')) return;

    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to delete category.');
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Layers size={22} className="mr-2 text-primary-500" />
            Category Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">Classify and organize your shop products catalog</p>
        </div>

        <div>
          {isAdmin ? (
            <button
              onClick={openAddModal}
              className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl hover:bg-primary-700 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto"
            >
              <Plus size={18} />
              <span>Add Category</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
              <ShieldAlert size={14} className="text-amber-500" />
              <span>View-only mode (Admin required)</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search categories by name or description..."
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
        /* Categories Table Grid */
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm w-16">ID</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm w-48">Category Name</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">Description</th>
                {isAdmin && <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm text-right w-32">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map(category => (
                <tr key={category.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 text-gray-500 text-sm font-mono">{category.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-800 text-sm">{category.name}</td>
                  <td className="py-3.5 px-4 text-gray-500 text-sm max-w-md truncate" title={category.description}>
                    {category.description || <em className="text-gray-300">No description provided</em>}
                  </td>
                  {isAdmin && (
                    <td className="py-3.5 px-4">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
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
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="py-12 text-center text-gray-400 text-sm">
                    No categories found. Add a classification to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-5">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Beverages"
                  className="input-field"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Describe the category items..."
                  className="input-field min-h-[100px] resize-y"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
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
                  {editingCategory ? 'Update' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
