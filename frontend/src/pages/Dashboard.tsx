import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { formatMMK } from '../utils/currency';
import { TrendingUp, Package, DollarSign, AlertTriangle, Clock } from 'lucide-react';

interface Stats {
  total_sales: number;
  total_products: number;
  total_revenue: number;
  today_revenue: number;
}

interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  user?: { username: string };
  items?: any[];
}

interface Product {
  id: number;
  name: string;
  stock_quantity: number;
  image_url: string;
  category?: { name: string };
}

interface DailyPoint {
  date: string;
  total: number;
  count: number;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [stats, setStats] = useState<Stats>({ total_sales: 0, total_products: 0, total_revenue: 0, today_revenue: 0 });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [series, setSeries] = useState<DailyPoint[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchSeries(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data.stats);
      setRecentSales(res.data.recent_sales ?? []);
      const low = res.data.low_stock_products ?? [];
      setLowStock(low);
      if (low.length > 0) {
        setTimeout(() => toast.info(`${low.length} product(s) are running low on stock.`), 600);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeries = async (d: number) => {
    try {
      const res = await api.get(`/reports/daily-sales?days=${d}`);
      setSeries(res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const changeDays = (d: number) => {
    setDays(d);
    fetchSeries(d);
  };

  const maxTotal = Math.max(1, ...series.map((s) => s.total));

  const cards = [
    {
      title: t('sales'),
      value: stats.total_sales,
      icon: <TrendingUp size={24} className="text-blue-500" />,
      bg: 'bg-blue-50'
    },
    {
      title: t('products'),
      value: stats.total_products,
      icon: <Package size={24} className="text-indigo-500" />,
      bg: 'bg-indigo-50'
    },
    {
      title: "Today's Revenue",
      value: formatMMK(stats.today_revenue),
      icon: <DollarSign size={24} className="text-green-500" />,
      bg: 'bg-green-50'
    },
    {
      title: 'Total Revenue',
      value: formatMMK(stats.total_revenue),
      icon: <DollarSign size={24} className="text-purple-500" />,
      bg: 'bg-purple-50'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-xl ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <h3 className="text-2xl font-bold text-gray-800">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <TrendingUp size={20} className="mr-2 text-primary-500" />
            Revenue Trend
          </h3>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[7, 30].map((d) => (
              <button
                key={d}
                onClick={() => changeDays(d)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  days === d ? 'bg-white shadow text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {series.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400">No revenue data yet.</div>
        ) : (
          <div className="flex items-end space-x-1 sm:space-x-2 h-48">
            {series.map((point) => {
              const heightPct = (point.total / maxTotal) * 100;
              const label = new Date(point.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
              return (
                <div key={point.date} className="flex-1 flex flex-col items-center justify-end group" title={`${label}: ${formatMMK(point.total)} (${point.count} sales)`}>
                  <span className="text-[10px] text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatMMK(point.total)}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary-500 to-primary-400 hover:from-primary-600 transition-all"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  ></div>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Clock size={20} className="mr-2 text-primary-500" />
            {t('recent_sales')}
          </h3>
          {recentSales.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No recent sales yet.</div>
          ) : (
            <div className="space-y-3">
              {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-800">Sale #{sale.id}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {sale.user?.username} · {new Date(sale.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="font-bold text-primary-600">{formatMMK(sale.total_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <AlertTriangle size={20} className="mr-2 text-yellow-500" />
            {t('low_stock')}
          </h3>
          {lowStock.length === 0 ? (
            <div className="text-center py-10 text-gray-400">All products are sufficiently stocked.</div>
          ) : (
            <div className="space-y-3">
              {lowStock.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} className="m-auto mt-2 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category?.name}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    product.stock_quantity === 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {product.stock_quantity === 0 ? 'Out of stock' : `${product.stock_quantity} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
