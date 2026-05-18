import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { Printer, Eye, Calendar, DollarSign, ShoppingBag } from 'lucide-react';

interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  user: { username: string };
  items: any[];
  product?: {
    name: string;
  };
  quantity?: number;
  unit_price?: number;
}

const Sales = () => {
  const { t } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = (sale: Sale) => {
    // Basic print implementation
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Calendar className="mr-2 text-primary-600" size={24} />
          {t('sales_history')}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-4 font-semibold text-gray-600">ID</th>
                <th className="py-3 px-4 font-semibold text-gray-600">{t('date')}</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Cashier</th>
                <th className="py-3 px-4 font-semibold text-gray-600">Product Purchased</th>
                <th className="py-3 px-4 font-semibold text-gray-600 text-center">Qty</th>
                <th className="py-3 px-4 font-semibold text-gray-600">{t('total')}</th>
                <th className="py-3 px-4 font-semibold text-gray-600 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 text-gray-500">#{sale.id}</td>
                  <td className="py-3 px-4 text-gray-600">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">{sale.user?.username}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800">
                    {sale.product?.name || <span className="text-gray-300 italic">Unknown</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-medium text-gray-600">{sale.quantity}</td>
                  <td className="py-3 px-4 font-bold text-primary-600">${sale.total_amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right flex justify-end space-x-2">
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="p-2 text-gray-400 hover:text-primary-600 bg-gray-50 rounded-lg transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handlePrint(sale)}
                      className="p-2 text-gray-400 hover:text-green-600 bg-gray-50 rounded-lg transition-colors"
                    >
                      <Printer size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal & Hidden Receipt Template */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div id={`receipt-${selectedSale.id}`}>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">HOUSEHOLD SHOP POS</h2>
                <p className="text-sm">123 Street Name, City</p>
                <p className="text-sm">Tel: 09-123456789</p>
                <div className="border-t my-4"></div>
                <div className="flex justify-between text-sm">
                  <span>Receipt #: {selectedSale.id}</span>
                  <span>{new Date(selectedSale.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cashier: {selectedSale.user?.username}</span>
                  <span>{new Date(selectedSale.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="border-t my-4"></div>
              </div>
              
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-1">{item.product?.name}</td>
                      <td className="text-center py-1">x{item.quantity}</td>
                      <td className="text-right py-1">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL</span>
                  <span>${selectedSale.total_amount.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-center mt-8 text-sm">
                <p>Thank you for shopping with us!</p>
                <p>Please come again.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 no-print">
              <button 
                onClick={() => setSelectedSale(null)}
                className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
