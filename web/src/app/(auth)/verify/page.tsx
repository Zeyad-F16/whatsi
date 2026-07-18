'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Fallback to URL param if needed, but primarily use sessionStorage
  const urlEmail = searchParams.get('email');
  const [email, setEmail] = useState<string | null>(null);

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('verify_email') || urlEmail;
    if (!storedEmail) {
      router.push('/register');
    } else {
      setEmail(storedEmail);
    }
  }, [urlEmail, router]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;

    if (value.length > 1) {
      const pastedData = value.replace(/\D/g, '').slice(0, 6);
      const newCode = [...code];
      for (let i = 0; i < pastedData.length; i++) {
        if (i < 6) newCode[i] = pastedData[i];
      }
      setCode(newCode);
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) newCode[i] = pastedData[i];
    }
    setCode(newCode);
    
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message);
      } else {
        // Show success temporarily in error state or just alert
        setError('Code resent successfully! Please check your email.');
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      setError('Connection error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="w-full bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden transition-all duration-500 group/box" dir="ltr">
      {/* Dynamic Glow background on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00cc50]/0 to-[#00cc50]/0 group-hover/box:from-[#00cc50]/5 group-hover/box:to-transparent transition-all duration-700 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="w-14 h-14 bg-[#00cc50]/10 rounded-2xl flex items-center justify-center mb-8 text-[#00cc50] border border-[#00cc50]/20">
          <ShieldCheck className="w-7 h-7" />
        </div>
        
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Verify your Email</h1>
          <p className="text-gray-500 text-sm font-medium">
            We've sent a 6-digit verification code to<br/>
            <strong className="text-gray-900 mt-1 block">{email}</strong>
          </p>
        </div>

      {error && (
        <div className={`p-4 rounded-xl text-sm font-bold mb-6 border flex items-center gap-2 ${error.includes('successfully') ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${error.includes('successfully') ? 'bg-green-500' : 'bg-red-500'}`} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex justify-center gap-2 sm:gap-3">
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputRefs.current[idx] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-2xl font-black bg-white border-2 border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:border-[#00cc50] transition-all"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || code.join('').length < 6}
          className="w-full bg-[#00cc50] hover:bg-[#00b346] text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,204,80,0.25)]"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>Verify Account</span>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-500 font-medium">
        Didn't receive the code?{' '}
        <button type="button" onClick={handleResend} disabled={loading} className="text-[#00cc50] hover:text-[#00b346] font-bold transition-colors disabled:opacity-50">
          Resend Code
        </button>
      </p>
      </div>
    </div>
  );
}
