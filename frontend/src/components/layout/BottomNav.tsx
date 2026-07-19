import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Droplets, ClipboardList, Clock, User } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useAppStore } from '../../store';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { unreadNotifications } = useAppStore();

  const tabs = [
    {
      path: '/home',
      icon: Home,
      label: t('nav.home'),
      matchPaths: ['/home'],
    },
    ...(user?.is_donor ? [{
      path: '/donate',
      icon: Droplets,
      label: t('nav.donate'),
      matchPaths: ['/donate', '/notifications'],
      badge: unreadNotifications > 0 ? unreadNotifications : null,
    }] : []),
    {
      path: '/requests',
      icon: ClipboardList,
      label: t('nav.requests'),
      matchPaths: ['/requests', '/request-blood'],
    },
    {
      path: '/history',
      icon: Clock,
      label: t('nav.history'),
      matchPaths: ['/history'],
    },
    {
      path: '/profile',
      icon: User,
      label: t('nav.profile'),
      matchPaths: ['/profile'],
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-50"
         style={{ paddingBottom: 'var(--safe-bottom)', boxShadow: '0 -4px 20px rgba(0,0,0,.06)' }}>
      <div className="flex items-stretch">
        {tabs.map(({ path, icon: Icon, label, matchPaths, badge }) => {
          const isActive = matchPaths.some(p => location.pathname.startsWith(p));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center pt-3 pb-2 gap-1 relative min-h-[60px]',
                'transition-all duration-150 active:scale-95',
                isActive ? 'text-blood' : 'text-gray-400 hover:text-gray-600'
              )}
              aria-label={label}
            >
              <div className="relative">
                <Icon className={clsx('w-6 h-6 transition-transform', isActive && 'scale-110')} />
                {badge && (
                  <span className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] bg-blood text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className={clsx(
                'text-[10px] font-semibold transition-all',
                isActive ? 'opacity-100' : 'opacity-60'
              )}>
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 inset-x-4 h-0.5 bg-blood rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
