'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Key, Copy, RefreshCw, X, CheckCircle, XCircle, UserPlus, FileText, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Client {
  id: number;
  name: string;
  phone: string;
  plan_type: string;
  amount_paid: number;
  activation_code: string;
  code_used: number;
  machine_id: string;
  start_date: string;
  expiry_date: string;
  is_active: number;
  notes: string;
  is_expired: number;
  days_remaining: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [activeCode, setActiveCode] = useState('');
  const [activeClientId, setActiveClientId] = useState<number | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive?: boolean }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    plan_type: 'monthly',
    amount_paid: '',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    is_active: 1,
    notes: '',
  });

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/control-wp/clients');
      if (res.status === 401) {
        router.push('/control-wp/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
        setFiltered(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(clients);
    } else {
      const lower = search.toLowerCase();
      setFiltered(clients.filter(c => 
        c.name.toLowerCase().includes(lower) || 
        (c.phone && c.phone.includes(lower)) ||
        c.activation_code.toLowerCase().includes(lower)
      ));
    }
  }, [search, clients]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingClient ? `/api/control-wp/clients/${editingClient.id}` : '/api/control-wp/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        setIsClientModalOpen(false);
        fetchClients();
        if (!editingClient && data.activation_code) {
          showCode(data.activation_code, data.client_id);
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('حدث خطأ');
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف العميل',
      message: 'هل أنت متأكد من حذف هذا العميل نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/control-wp/clients/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) fetchClients();
        } catch (err) {
          console.error(err);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showCode = (code: string, id: number) => {
    setActiveCode(code);
    setActiveClientId(id);
    setIsCodeModalOpen(true);
  };

  const regenerateCode = async () => {
    if (!activeClientId) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'إعادة إنشاء الكود',
      message: 'سيتم إبطال الكود القديم فوراً ولن يتمكن العميل من استخدامه مجدداً. هل أنت متأكد؟',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/control-wp/clients/${activeClientId}/regenerate-code`, {
            method: 'POST'
          });
          const data = await res.json();
          if (data.success) {
            setActiveCode(data.new_code);
            fetchClients();
          }
        } catch (err) {
          console.error(err);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(activeCode);
    alert('تم نسخ الكود!');
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({
      name: '', phone: '', plan_type: 'monthly', amount_paid: '',
      start_date: new Date().toISOString().split('T')[0],
      expiry_date: '', is_active: 1, notes: ''
    });
    setIsClientModalOpen(true);
  };

  const openEditModal = (c: Client) => {
    setEditingClient(c);
    setFormData({
      name: c.name, phone: c.phone || '', plan_type: c.plan_type,
      amount_paid: c.amount_paid.toString(),
      start_date: c.start_date, expiry_date: c.expiry_date,
      is_active: c.is_active, notes: c.notes || ''
    });
    setIsClientModalOpen(true);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">إدارة العملاء</h1>
          <p className="text-gray-500 font-medium">عرض وإدارة بيانات التراخيص وعملائك بسهولة.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          <span>إضافة عميل جديد</span>
        </button>
      </header>

      {/* Search */}
      <div className="relative max-w-2xl">
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input 
          type="text" 
          placeholder="ابحث بالاسم، الهاتف أو كود التفعيل..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl py-4 pr-12 pl-4 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                <th className="px-8 py-6">العميل</th>
                <th className="px-8 py-6">الاشتراك</th>
                <th className="px-8 py-6">المبلغ</th>
                <th className="px-8 py-6">كود التفعيل</th>
                <th className="px-8 py-6">الانتهاء</th>
                <th className="px-8 py-6">الحالة</th>
                <th className="px-8 py-6">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-400 font-bold">جارٍ التحميل...</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center">
                    <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <div className="text-gray-400 font-bold text-sm">لا يوجد عملاء يطابقون بحثك.</div>
                  </td>
                </tr>
              ) : (
                filtered.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-extrabold text-gray-900 text-base">{client.name}</div>
                      <div className="text-sm font-bold text-gray-400 mt-1">{client.phone || '-'}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold border border-gray-100">
                        {client.plan_type === 'yearly' ? 'سنوي' : 'شهري'}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-bold text-gray-900">{client.amount_paid} ج</td>
                    <td className="px-8 py-5">
                      <button 
                        onClick={() => showCode(client.activation_code, client.id)}
                        className="flex items-center gap-2 text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>عرض الكود</span>
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <div className="font-bold text-gray-900 text-sm" dir="ltr">{client.expiry_date}</div>
                      <div className={`text-xs font-bold mt-1 ${client.is_expired ? 'text-red-500' : 'text-gray-400'}`}>
                        {client.is_expired ? 'منتهي' : `متبقي ${client.days_remaining} يوم`}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {client.is_active ? (
                         <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                           <CheckCircle className="w-4 h-4" /> نشط
                         </div>
                      ) : (
                         <div className="flex items-center gap-1.5 text-red-600 font-bold text-sm">
                           <XCircle className="w-4 h-4" /> معطل
                         </div>
                      )}
                    </td>
                    <td className="px-8 py-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(client)} className="w-9 h-9 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200 flex items-center justify-center transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(client.id)} className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Code Modal */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4 m-0! mt-0!">
          <div className="bg-white rounded-[2rem] p-10 w-full max-w-md shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsCodeModalOpen(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-extrabold tracking-tight mb-8 text-gray-900">كود التفعيل</h3>
            
            <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 mb-6">
              <div className="text-2xl font-mono font-bold text-gray-900 tracking-wider mb-6" dir="ltr">{activeCode}</div>
              <button onClick={copyCode} className="bg-white border border-gray-200 text-gray-700 font-bold flex items-center gap-2 justify-center mx-auto hover:bg-gray-50 hover:border-gray-300 px-5 py-2.5 rounded-xl transition-all shadow-sm">
                <Copy className="w-4 h-4" /> نسخ الكود
              </button>
            </div>

            <button onClick={regenerateCode} className="w-full text-red-500 hover:bg-red-50 px-5 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm">
              <RefreshCw className="w-4 h-4" /> إعادة إنشاء كود وإبطال القديم
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal (Redesigned & Minimal) */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4 m-0! mt-0!">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-10 w-full max-w-2xl shadow-xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsClientModalOpen(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-10">
              <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2">
                {editingClient ? 'تعديل بيانات العميل' : 'عميل جديد'}
              </h3>
              <p className="text-gray-500 text-sm font-medium">
                {editingClient ? 'قم بتحديث بيانات الاشتراك أو تفاصيل العميل.' : 'أدخل بيانات العميل الجديد لإنشاء ترخيص.'}
              </p>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                
                {/* Inputs with cleaner design */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">اسم العميل *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">رقم الهاتف</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">نوع الاشتراك *</label>
                  <select required value={formData.plan_type} onChange={e => setFormData({...formData, plan_type: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all">
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">المبلغ المدفوع (ج)</label>
                  <input type="number" step="0.01" value={formData.amount_paid} onChange={e => setFormData({...formData, amount_paid: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">تاريخ البداية *</label>
                  <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all text-left" dir="ltr" />
                </div>

                {editingClient && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">تاريخ الانتهاء</label>
                      <input type="date" required value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all text-left" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">الحالة</label>
                      <select value={formData.is_active} onChange={e => setFormData({...formData, is_active: parseInt(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all">
                        <option value={1}>نشط</option>
                        <option value={0}>معطل</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ملاحظات إضافية</label>
                  <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 font-medium transition-all resize-none"></textarea>
                </div>
              </div>

              <div className="pt-8 mt-4 border-t border-gray-100 flex gap-4">
                <button type="submit" className="flex-1 bg-gray-900 hover:bg-black text-white px-5 py-4 rounded-xl font-bold transition-all shadow-sm">
                  {editingClient ? 'حفظ التعديلات' : 'إضافة وإنشاء ترخيص'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-[60] flex items-center justify-center p-4 m-0! mt-0!">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-10 w-full max-w-sm shadow-xl relative animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${confirmModal.isDestructive ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-900'}`}>
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold tracking-tight text-gray-900 mb-3">{confirmModal.title}</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">{confirmModal.message}</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-5 py-3.5 rounded-xl font-bold transition-all text-sm"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmModal.onConfirm} 
                className={`flex-1 px-5 py-3.5 rounded-xl font-bold transition-all text-sm text-white ${confirmModal.isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-sm' : 'bg-gray-900 hover:bg-black shadow-sm'}`}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
