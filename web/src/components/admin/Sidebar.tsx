'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Activity, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/control-wp/logout', { method: 'POST' });
    router.push('/control-wp/login');
  };

  const menu = [
    { name: 'لوحة القيادة', path: '/control-wp', icon: LayoutDashboard },
    { name: 'العملاء والتراخيص', path: '/control-wp/clients', icon: Users },
    { name: 'سجلات النشاط', path: '/control-wp/logs', icon: Activity },
    { name: 'إعدادات الحساب', path: '/control-wp/settings', icon: Settings },
  ];

  return (
    <aside className="fixed right-0 top-0 w-72 h-screen bg-white border-l border-gray-100 flex flex-col z-10">
      <div className="p-10 flex items-center gap-3">
        <div className="w-2.5 h-2.5 bg-[#00cc50] rounded-full animate-pulse"></div>
        <div className="font-extrabold text-2xl tracking-tight text-gray-900">
          Whatsi<span className="text-gray-400 font-medium">Pro</span>
        </div>
      </div>

      <div className="px-8 text-xs font-bold text-gray-400 tracking-wider mb-4 uppercase">
        القائمة الرئيسية
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menu.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/control-wp' && pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 ${
                isActive 
                  ? 'bg-gray-50 text-gray-900' 
                  : 'text-gray-400 hover:bg-gray-50/50 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#00cc50]' : ''}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 w-full transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
