
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, ShoppingCart, Package, Layers, Settings, Users, TrendingUp, X, Contact } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { t } = useTranslation();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { role: 'cashier' };

  const links = [
    { name: t('dashboard'), path: '/', icon: <LayoutDashboard size={20} /> },
    { name: t('pos'), path: '/pos', icon: <ShoppingCart size={20} /> },
    { name: t('products'), path: '/products', icon: <Package size={20} /> },
    { name: t('categories'), path: '/categories', icon: <Layers size={20} /> },
    { name: t('sales'), path: '/sales', icon: <TrendingUp size={20} /> },
    { name: t('customers'), path: '/customers', icon: <Contact size={20} /> },
  ];

  if (user.role === 'admin') {
    links.push({ name: t('users'), path: '/users', icon: <Users size={20} /> });
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-xl flex flex-col h-full border-r border-gray-100
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo */}
      <div className="p-5 flex items-center justify-between border-b border-gray-100">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">
          Shop POS
        </h1>
        {/* Close button on mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-1 text-gray-400 hover:text-gray-700 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                }`
              }
            >
              {link.icon}
              <span>{link.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button className="flex items-center space-x-3 px-4 py-3 w-full text-left text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 rounded-xl transition-all duration-200">
            <Settings size={20} />
            <span>{t('settings')}</span>
          </button>
        </div>
    </aside>
  );
};

export default Sidebar;
