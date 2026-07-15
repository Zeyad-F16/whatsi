'use client';

import { useEffect, useState } from 'react';
import { Users, AlertTriangle, CheckCircle, DollarSign, XCircle, Clock, Zap, UserPlus, Key, Edit, Activity, CheckCircle2, TrendingUp, Calendar, PieChart, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  total_clients: number;
  active_clients: number;
  expired_clients: number;
  expiring_soon: number;
  total_revenue: number;
}

interface Log {
  id: number;
  client_name: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch(`/api/control-wp/dashboard`),
          fetch(`/api/control-wp/logs?limit=6`)
        ]);

        if (statsRes.status === 401) {
          router.push('/control-wp/login');
          return;
        }

        const statsData = await statsRes.json();
        const logsData = await logsRes.json();

        if (statsData.success) setStats(statsData.data);
        if (logsData.success) setLogs(logsData.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const getLogMeta = (action: string) => {
    switch(action) {
      case 'CLIENT_CREATED': return { text: 'إضافة عميل', icon: UserPlus, color: 'text-gray-900', bg: 'bg-gray-100' };
      case 'CLIENT_UPDATED': return { text: 'تحديث عميل', icon: Edit, color: 'text-gray-900', bg: 'bg-gray-100' };
      case 'ACTIVATED': return { text: 'تفعيل ترخيص', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'CODE_REGENERATED': return { text: 'إنشاء كود', icon: Key, color: 'text-gray-900', bg: 'bg-gray-100' };
      case 'ACTIVATE_FAILED_INVALID_CODE': 
      case 'ACTIVATE_FAILED_CODE_USED': return { text: 'محاولة تفعيل فاشلة', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' };
      case 'VERIFY_EXPIRED': return { text: 'انتهاء صلاحية', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'VERIFY_OK': return { text: 'تحقق ناجح', icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-50' };
      default: return { text: action, icon: Activity, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  const activePercent = stats?.total_clients ? Math.round(((stats.active_clients || 0) / stats.total_clients) * 100) : 0;
  const expiredPercent = stats?.total_clients ? Math.round(((stats.expired_clients || 0) / stats.total_clients) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      
      {/* 1. Welcome Banner (Minimal) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-gray-400 font-bold text-sm mb-3">
            <Calendar className="w-4 h-4" />
            <span>{today}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">أهلاً بك، أدمن.</h1>
          <p className="text-gray-500 font-medium">نظرة سريعة على أداء التراخيص وعمليات النظام اليوم.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/control-wp/clients" className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
            <UserPlus className="w-4 h-4" />
            <span>عميل جديد</span>
          </Link>
          <Link href="/control-wp/logs" className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
            <Activity className="w-4 h-4" />
            <span>السجلات</span>
          </Link>
        </div>
      </div>

      {/* 2. Minimal Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card - 2 cols */}
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-[2rem] p-8 flex flex-col justify-between transition-shadow hover:shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>مستقر</span>
            </div>
          </div>
          <div>
            <div className="text-gray-400 font-bold text-sm mb-1">إجمالي الإيرادات</div>
            <div className="text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">{stats?.total_revenue || 0} ج</div>
          </div>
        </div>

        {/* Total Clients */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-8 flex flex-col justify-between transition-shadow hover:shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 mb-6">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 font-bold text-sm mb-1">إجمالي العملاء</div>
            <div className="text-3xl font-extrabold tracking-tight text-gray-900">{stats?.total_clients || 0}</div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-8 flex flex-col justify-between transition-shadow hover:shadow-sm">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mb-6">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-gray-400 font-bold text-sm mb-1">تنتهي قريباً</div>
            <div className="text-3xl font-extrabold tracking-tight text-gray-900">{stats?.expiring_soon || 0}</div>
          </div>
        </div>
      </div>

      {/* 3. Timeline & System Overview (Clean Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Timeline Feed */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2rem] p-8 lg:p-10">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">سجل النشاطات</h2>
            <Link href="/control-wp/logs" className="text-gray-400 text-sm font-bold hover:text-gray-900 transition-colors">
              عرض الكل &larr;
            </Link>
          </div>

          <div className="relative pl-4 rtl:pl-0 rtl:pr-6 border-l rtl:border-l-0 rtl:border-r border-gray-100 space-y-8">
            {logs.length > 0 ? (
              logs.map((log) => {
                const meta = getLogMeta(log.action);
                const LogIcon = meta.icon;
                return (
                  <div key={log.id} className="relative rtl:pr-8 pl-8 group">
                    <div className="absolute top-2 right-[-5px] w-2.5 h-2.5 rounded-full bg-gray-300 group-hover:bg-gray-900 transition-colors z-10"></div>
                    
                    <div>
                      <div className="flex items-start gap-4 mb-2">
                        <div className={`w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center ${meta.color} shrink-0`}>
                          <LogIcon className="w-4 h-4" />
                        </div>
                        <div className="pt-1">
                          <div className="font-bold text-gray-900 flex flex-wrap items-center gap-2">
                            {meta.text}
                            {log.client_name && (
                              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {log.client_name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-gray-400 mt-1" dir="ltr">
                            {new Date(log.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                      
                      {log.details && (
                        <p className="text-gray-500 font-medium text-sm leading-relaxed rtl:pr-14">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <div className="text-gray-400 font-bold text-sm">لا توجد نشاطات</div>
              </div>
            )}
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-8 lg:p-10 flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <PieChart className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">حالة التراخيص</h2>
          </div>

          <div className="flex-1 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-600 text-sm">التراخيص النشطة</span>
                <span className="font-extrabold text-gray-900 text-sm">{activePercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${activePercent}%` }}></div>
              </div>
              <p className="text-xs font-bold text-gray-400 mt-3">{stats?.active_clients || 0} عميل نشط</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-600 text-sm">التراخيص المنتهية</span>
                <span className="font-extrabold text-gray-900 text-sm">{expiredPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-red-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${expiredPercent}%` }}></div>
              </div>
              <p className="text-xs font-bold text-gray-400 mt-3">{stats?.expired_clients || 0} عميل منتهي</p>
            </div>
          </div>
          
          <div className="mt-8 flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
             <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
             <div>
               <div className="text-gray-900 font-bold text-sm mb-1">الخوادم مستقرة</div>
               <div className="text-gray-500 text-xs font-medium leading-relaxed">جميع خدمات التحقق تعمل بشكل طبيعي ولا يوجد أي انقطاع.</div>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
}
