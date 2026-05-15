import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { TrendingUp, Package, Users, DollarSign, AlertTriangle, Clock } from 'lucide-react';

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

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({ total_sales: 0, total_products: 0, total_revenue: 0, today_revenue: 0 });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8080/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.stats);
      setRecentSales(res.data.recent_sales ?? []);
      setLowStock(res.data.low_stock_products ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      value: `$${stats.today_revenue.toFixed(2)}`,
      icon: <DollarSign size={24} className="text-green-500" />,
      bg: 'bg-green-50'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.total_revenue.toFixed(2)}`,
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
                  <span className="font-bold text-primary-600">${sale.total_amount.toFixed(2)}</span>
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
