'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/control-wp/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-tajawal" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 lg:mr-72 transition-all min-h-screen">
        {children}
      </main>
    </div>
  );
}
