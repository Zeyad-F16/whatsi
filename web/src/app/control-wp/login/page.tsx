'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, User, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/control-wp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/control-wp');
      } else {
        setError(data.message || 'خطأ في تسجيل الدخول');
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-tajawal p-6" dir="rtl">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] relative overflow-hidden transition-all duration-500 group p-10 lg:p-14">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-[#00cc50]/10 flex items-center justify-center mx-auto mb-6 text-[#00cc50] border border-[#00cc50]/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
            Whatsi<span className="text-gray-400 font-medium">Pro</span>
          </h1>
          <p className="text-sm font-medium text-gray-500">
            قم بتسجيل الدخول للوصول إلى لوحة التحكم
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 border border-red-100 rounded-xl flex items-start gap-3 text-sm font-bold">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              اسم المستخدم
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                <User className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-12 pl-4 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all font-medium text-gray-900"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input 
                type="password" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-12 pl-4 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 focus:bg-white transition-all font-medium text-gray-900 text-left" dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-bold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                دخول للوحة التحكم
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
