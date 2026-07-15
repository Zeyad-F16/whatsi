'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Save, Key, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  // Assuming initial username might be needed, we can just let them type the new one.
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'كلمة المرور الجديدة غير متطابقة' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/control-wp/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'تم تغيير البيانات بنجاح. يرجى تسجيل الدخول مجدداً.' });
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/control-wp/login');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <header>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">إعدادات الحساب</h1>
        <p className="text-gray-500 font-medium">قم بتعديل بيانات الدخول الخاصة بك كمسؤول.</p>
      </header>

      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden p-8 lg:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        <form onSubmit={handleSave} className="space-y-8 max-w-xl">
          
          {message.text && (
            <div className={`p-4 rounded-xl font-bold text-sm ${message.type === 'error' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-[#00cc50]/10 text-[#00cc50] border border-[#00cc50]/20'}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4">
              <User className="w-5 h-5 text-gray-400" />
              بيانات المستخدم
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">اسم المستخدم الجديد</label>
              <input 
                type="text" 
                required 
                value={formData.newUsername} 
                onChange={e => setFormData({...formData, newUsername: e.target.value})} 
                placeholder="أدخل اسم المستخدم الجديد"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:bg-white focus:ring-4 focus:ring-gray-900/5 font-medium transition-all" 
              />
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4">
              <Key className="w-5 h-5 text-gray-400" />
              تغيير كلمة المرور
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">كلمة المرور الحالية *</label>
              <input 
                type="password" 
                required 
                value={formData.currentPassword} 
                onChange={e => setFormData({...formData, currentPassword: e.target.value})} 
                placeholder="تأكيد هويتك مطلوب لتغيير البيانات"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:bg-white focus:ring-4 focus:ring-gray-900/5 font-medium transition-all text-left" dir="ltr"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">كلمة المرور الجديدة (اختياري)</label>
                <input 
                  type="password" 
                  value={formData.newPassword} 
                  onChange={e => setFormData({...formData, newPassword: e.target.value})} 
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:bg-white focus:ring-4 focus:ring-gray-900/5 font-medium transition-all text-left" dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">تأكيد كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  value={formData.confirmPassword} 
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                  placeholder="أعد إدخال كلمة المرور"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 focus:bg-white focus:ring-4 focus:ring-gray-900/5 font-medium transition-all text-left" dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold transition-all shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" /> حفظ الإعدادات
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
