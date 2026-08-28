import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { formatMMK } from '../utils/currency';
import { Printer, Eye, Calendar, Search, X, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface SaleItem {
  id: number;
  product_id: number;
  product: {
    name: string;
  };
  quantity: number;
  price: number;
}

interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  user: { username: string };
  items: SaleItem[];
}

interface Filters {
  product_name: string;
  from_date: string;
  to_date: string;
}

const Sales = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const [filters, setFilters] = useState<Filters>({ product_name: '', from_date: '', to_date: '' });
  const [applied, setApplied] = useState<Filters>({ product_name: '', from_date: '', to_date: '' });
  const [loading, setLoading] = useState(false);

  const fetchSales = async (active: Filters = applied, pageNum: number = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(pageNum));
      params.append('page_size', String(pageSize));
      if (active.product_name) params.append('product_name', active.product_name);
      if (active.from_date) params.append('from_date', active.from_date);
      if (active.to_date) params.append('to_date', active.to_date);

      const res = await api.get(`/sales?${params.toString()}`);
      const data = res.data as any;
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setSales(items);
      setTotal(typeof data?.total === 'number' ? data.total : items.length);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sales history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(applied, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApply = () => {
    setPage(1);
    setApplied(filters);
    fetchSales(filters, 1);
  };

  const handleReset = () => {
    const empty = { product_name: '', from_date: '', to_date: '' };
    setFilters(empty);
    setApplied(empty);
    setPage(1);
    fetchSales(empty, 1);
  };

  const handlePrint = (sale: Sale) => {
    const printContent = document.getElementById(`receipt-${sale.id}`);
    if (printContent) {
      const win = window.open('', '', 'height=600,width=400');
      win?.document.write('<html><head><title>Receipt</title><style>body{font-family:monospace;padding:20px;}table{width:100%;border-collapse:collapse;}.text-right{text-align:right;}.border-t{border-top:1px dashed #000;margin:10px 0;}</style></head><body>');
      win?.document.write(printContent.innerHTML);
      win?.document.write('</body></html>');
      win?.document.close();
      win?.focus();
      win?.print();
      win?.close();
    }
  };

  const handleExport = () => {
    if (sales.length === 0) {
      toast.info('No sales to export for the current filters.');
      return;
    }
    const header = ['Receipt #', 'Date', 'Cashier', 'Products', 'Total'];
    const rows = sales.map((s) => [
      s.id,
      new Date(s.created_at).toLocaleString(),
      s.user?.username || '',
      s.items.map((i) => `${i.product?.name} (x${i.quantity})`).join('; '),
      s.total_amount.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Sales exported as CSV.');
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Calendar className="mr-2 text-primary-600" size={24} />
            {t('sales_history')}
          </h2>
          <button
            onClick={handleExport}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Download size={16} />
            {t('export_csv')}
          </button>
        </div>

        {/* Filter header */}
        <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">{t('filter_product_name')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={filters.product_name}
                onChange={(e) => setFilters({ ...filters, product_name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                placeholder={t('filter_product_name')}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">{t('from_date')}</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              className="py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">{t('to_date')}</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              className="py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
            />
          </div>

          <button
            onClick={handleApply}
            className="py-2 px-5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center"
          >
            <Search size={16} className="mr-1.5" />
            {t('apply_filter')}
          </button>

          <button
            onClick={handleReset}
            className="py-2 px-4 text-gray-600 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium flex items-center"
          >
            <X size={16} className="mr-1.5" />
            {t('reset_filter')}
          </button>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {t('total_results', { count: total })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">ID</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t('date')}</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t('cashier')}</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t('product_purchased')}</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">{t('qty')}</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">{t('total')}</th>
                <th className="py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400 dark:text-gray-500">
                    {loading ? t('search') : t('no_sales_found')}
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">#{sale.id}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{new Date(sale.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-100">{sale.user?.username}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">
                      {sale.items && sale.items.length > 0
                        ? sale.items.map((item) => `${item.product?.name} (x${item.quantity})`).join(', ')
                        : <span className="text-gray-300 dark:text-gray-500 italic">No Items</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-gray-600 dark:text-gray-300">
                      {sale.items && sale.items.length > 0
                        ? sale.items.reduce((sum, item) => sum + item.quantity, 0)
                        : 0
                      }
                    </td>
                    <td className="py-3 px-4 font-bold text-primary-600 dark:text-primary-400">{formatMMK(sale.total_amount)}</td>
                    <td className="py-3 px-4 text-right flex justify-end space-x-2">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-2 text-gray-400 hover:text-primary-600 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handlePrint(sale)}
                        className="p-2 text-gray-400 hover:text-green-600 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft size={16} /> {t('previous')}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('page_of', { page, total: totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('next')} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Sale Detail Modal & Hidden Receipt Template */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div id={`receipt-${selectedSale.id}`}>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">HOUSEHOLD SHOP POS</h2>
                <p className="text-sm">123 Street Name, City</p>
                <p className="text-sm">Tel: 09-123456789</p>
                <div className="border-t my-4"></div>
                <div className="flex justify-between text-sm">
                  <span>{t('receipt_no')}: {selectedSale.id}</span>
                  <span>{new Date(selectedSale.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('cashier')}: {selectedSale.user?.username}</span>
                  <span>{new Date(selectedSale.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="border-t my-4"></div>
              </div>

              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 w-10"></th>
                    <th className="text-left py-2">{t('item')}</th>
                    <th className="text-center py-2">{t('qty')}</th>
                    <th className="text-right py-2">{t('price')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-1">
                        <img
                          src={item.product?.image_url}
                          alt={item.product?.name}
                          className="w-8 h-8 rounded object-cover"
                          onError={(e: any) => (e.currentTarget.style.visibility = 'hidden')}
                        />
                      </td>
                      <td className="py-1">{item.product?.name}</td>
                      <td className="text-center py-1">x{item.quantity}</td>
                      <td className="text-right py-1">{formatMMK(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('total')}</span>
                  <span>{formatMMK(selectedSale.total_amount)}</span>
                </div>
              </div>

              <div className="text-center mt-8 text-sm">
                <p>{t('thank_you')}</p>
                <p>{t('come_again')}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 no-print">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-6 py-2 text-gray-600 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('close')}
              </button>
              <button
                onClick={() => handlePrint(selectedSale)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
              >
                <Printer size={18} className="mr-2" />
                {t('print')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
