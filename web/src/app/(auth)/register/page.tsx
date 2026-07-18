'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2, Phone, Eye, EyeOff, CheckCircle2, XCircle, ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';
import { countries, defaultCountry } from '@/lib/countries';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom Dropdown State
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  // Handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.dialCode.includes(countrySearch)
  );

  // Validations
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const pwdLength = formData.password.length >= 8;
  const pwdUpper = /[A-Z]/.test(formData.password);
  const pwdLower = /[a-z]/.test(formData.password);
  const pwdSpecial = /[\W_0-9]/.test(formData.password);
  const isPasswordValid = pwdLength && pwdUpper && pwdLower && pwdSpecial;
  
  // Phone Validation
  // formData.phone holds the national part without formatting
  const fullPhoneForValidation = `${selectedCountry.dialCode}${formData.phone}`;
  const phoneNumberObj = parsePhoneNumberFromString(fullPhoneForValidation);
  const isPhoneValid = phoneNumberObj ? phoneNumberObj.isValid() : false;

  const isFormValid = isEmailValid && isPasswordValid && isPhoneValid && formData.name.trim().length > 0;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');

    // 1. Strip leading zero (except for specific countries like Italy that require it)
    const keepLeadingZero = ['IT', 'SM', 'VA'].includes(selectedCountry.code);
    if (!keepLeadingZero && val.startsWith('0')) {
      val = val.replace(/^0+/, '');
    }

    // 2. Prevent exceeding max length
    const oldFullPhone = `${selectedCountry.dialCode}${formData.phone}`;
    const oldParsed = parsePhoneNumberFromString(oldFullPhone);
    
    if (oldParsed?.isValid() && val.length > formData.phone.length) {
      const newFullPhone = `${selectedCountry.dialCode}${val}`;
      const newParsed = parsePhoneNumberFromString(newFullPhone);
      if (!newParsed?.isValid()) {
        return; // Block typing more digits if it's already max length
      }
    }

    setFormData({ ...formData, phone: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setError('');

    try {
      const fullPhone = `${selectedCountry.dialCode}${formData.phone}`;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: fullPhone,
          password: formData.password
        }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('verify_email', formData.email);
        router.push('/verify');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || 'Failed to initialize Google Login');
      }
    } catch (err) {
      setError('Connection error occurred while initializing Google Login');
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] p-6 lg:p-8 relative overflow-hidden transition-all duration-500 group/box" dir="ltr">
      {/* Dynamic Glow background on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00cc50]/0 to-[#00cc50]/0 group-hover/box:from-[#00cc50]/5 group-hover/box:to-transparent transition-all duration-700 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-5">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-1.5 tracking-tight">Create an Account</h1>
          <p className="text-gray-500 text-xs lg:text-sm font-medium">Join us and start automating your sales process today.</p>
        </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold mb-6 border border-red-100 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              required
              autoFocus
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:border-[#00cc50] transition-all font-medium"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 flex justify-between items-center">
            <span>Phone Number</span>
            {formData.phone && (
              <span className={`text-xs flex items-center gap-1 ${isPhoneValid ? 'text-[#00cc50]' : 'text-red-500'}`}>
                {isPhoneValid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {isPhoneValid ? 'Valid number' : 'Invalid number'}
              </span>
            )}
          </label>
          <div className="flex gap-2 relative">
            <div className="relative w-[110px] shrink-0" ref={dropdownRef}>
              <button 
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="w-full h-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl py-2.5 px-3 flex items-center justify-between focus:outline-none focus:border-[#00cc50] font-bold transition-all"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl leading-none">{selectedCountry.flag}</span>
                  <span className="text-sm">{selectedCountry.dialCode}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Dropdown Menu */}
              {isCountryDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 max-h-[300px] bg-white border border-gray-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search country or code..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#00cc50] transition-colors"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((country, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(country);
                            setIsCountryDropdownOpen(false);
                            setCountrySearch('');
                            setFormData(prev => ({ ...prev, phone: '' }));
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${selectedCountry.code === country.code ? 'bg-[#00cc50]/10 text-[#00cc50] font-bold' : 'hover:bg-gray-50 text-gray-700 font-medium'}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-xl">{country.flag}</span>
                            <span className="text-left truncate max-w-[120px]">{country.name}</span>
                          </span>
                          <span className="text-gray-500">{country.dialCode}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">No countries found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                <Phone className={`w-5 h-5 ${formData.phone && isPhoneValid ? 'text-[#00cc50]' : ''} transition-colors`} />
              </div>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`w-full bg-white border-2 text-gray-900 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none transition-all font-medium ${formData.phone && !isPhoneValid ? 'border-red-200 focus:border-red-500' : 'border-gray-200 focus:border-[#00cc50]'}`}
                placeholder="100 123 4567"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 flex justify-between items-center">
            <span>Email</span>
            {formData.email && (
              <span className={`text-xs flex items-center gap-1 ${isEmailValid ? 'text-[#00cc50]' : 'text-red-500'}`}>
                {isEmailValid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {isEmailValid ? 'Valid format' : 'Invalid format'}
              </span>
            )}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
              <Mail className={`w-5 h-5 ${formData.email && isEmailValid ? 'text-[#00cc50]' : ''} transition-colors`} />
            </div>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full bg-white border-2 text-gray-900 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none transition-all font-medium ${formData.email && !isEmailValid ? 'border-red-200 focus:border-red-500' : 'border-gray-200 focus:border-[#00cc50]'}`}
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 flex justify-between items-center">
            <span>Password</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
              <Lock className={`w-5 h-5 ${formData.password && isPasswordValid ? 'text-[#00cc50]' : ''} transition-colors`} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full bg-white border-2 text-gray-900 rounded-xl py-2.5 pl-12 pr-12 focus:outline-none transition-all font-medium ${formData.password && !isPasswordValid ? 'border-red-200 focus:border-red-500' : 'border-gray-200 focus:border-[#00cc50]'}`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Password Validation Checklist */}
          {formData.password && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-medium">
              <div className={`flex items-center gap-1.5 transition-colors ${pwdLength ? 'text-[#00cc50]' : 'text-gray-400'}`}>
                {pwdLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                8+ characters
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${pwdUpper ? 'text-[#00cc50]' : 'text-gray-400'}`}>
                {pwdUpper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                Uppercase letter
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${pwdLower ? 'text-[#00cc50]' : 'text-gray-400'}`}>
                {pwdLower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                Lowercase letter
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${pwdSpecial ? 'text-[#00cc50]' : 'text-gray-400'}`}>
                {pwdSpecial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                Number / Symbol
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="w-full bg-[#00cc50] hover:bg-[#00b346] text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,204,80,0.25)] mt-5"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>Sign Up</span>
          )}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-gray-400 text-[10px] font-bold uppercase">OR</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      <div className="mt-5 space-y-4">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 py-3 rounded-xl font-bold flex justify-center items-center gap-3 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      <p className="mt-5 text-center text-xs text-gray-500 font-medium">
        Already have an Account?{' '}
        <Link href="/login" className="text-[#00cc50] hover:text-[#00b346] font-bold transition-colors">
          Sign In
        </Link>
      </p>
      </div>
    </div>
  );
}
