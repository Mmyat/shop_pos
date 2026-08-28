import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../utils/api";
import { useToast } from "../components/Toast";
import {
  Plus,
  Edit2,
  Trash2,
  Contact,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  points: number;
}

const emptyForm = { name: "", phone: "", email: "" };

const Customers = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      const res = await api.get(`/customers?${params.toString()}`);
      const data = res.data as any;
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setCustomers(items);
      setTotal(Number(data?.total) || 0);
      setTotalPages(Number(data?.total_pages) || 1);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      try {
        const user = JSON.parse(userString);
        setIsAdmin(user.role === "admin");
      } catch (err) {
        console.error(err);
      }
    }
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  const openAddModal = () => {
    setEditing(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditing(c);
    setFormData({ name: c.name, phone: c.phone, email: c.email });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = { ...formData, phone: String(formData.phone).trim() };
      if (editing) {
        await api.put(`/customers/${editing.id}`, payload);
      } else {
        await api.post("/customers", payload);
      }
      setIsModalOpen(false);
      fetchCustomers();
      toast.success(editing ? t("customer_updated") : t("customer_created"));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save customer. Ensure the phone is unique.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("confirm_delete_customer"))) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
      toast.success(t("customer_deleted"));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete customer.");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Contact size={22} className="mr-2 text-primary-500" />
            {t("customers")}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{t("loyalty")}</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl hover:bg-primary-700 transition-colors shadow-sm font-medium text-sm w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>{t("add_customer")}</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder={t("search_customers")}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow text-sm"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-200 border-t-primary-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">{t("customer_name")}</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">{t("customer_phone")}</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">{t("customer_email")}</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm">{t("points")}</th>
                {isAdmin && <th className="py-3.5 px-4 font-semibold text-gray-600 text-sm text-right w-32">{t("actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="py-3 px-4 font-medium text-gray-800">{c.name}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono text-sm">{c.phone}</td>
                  <td className="py-3 px-4 text-gray-600 text-sm">{c.email || "-"}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-700">
                      {c.points}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 rounded-lg transition-colors"
                          title={t("edit")}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                          title={t("delete")}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-gray-400 text-sm">
                    {t("no_customers_found")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-gray-500">{t("total_results", { count: total })}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} /> {t("previous")}
          </button>
          <span className="text-sm text-gray-600 px-2">
            {t("page_of", { page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            {t("next")} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Add / Edit Modal (Admin) */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-5">
              {editing ? t("edit_customer") : t("add_customer")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("customer_name")}</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("customer_phone")}</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("customer_email")}</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
