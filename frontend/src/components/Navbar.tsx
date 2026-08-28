
import { useTranslation } from 'react-i18next';
import { LogOut, Globe, Menu, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './Theme';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'my' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { username: 'User' };

  return (
    <header className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0 border-b border-gray-100">
      <div className="flex items-center space-x-3">
        {/* Hamburger menu — visible on mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Menu size={22} />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 hidden sm:block">
          {t('dashboard')}
        </h2>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <button
          onClick={toggle}
          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={toggleLanguage}
          className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm"
        >
          <Globe size={17} />
          <span className="font-medium">{i18n.language === 'en' ? 'EN' : 'MY'}</span>
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-700 dark:text-gray-200 hidden sm:block text-sm">{user.username}</span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors ml-1"
            title={t('logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
