'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Lock, Phone } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: ''
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setFormData(prev => ({
            ...prev,
            name: data.user.name || '',
            phone: data.user.phone || ''
          }));
        }
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('Profile updated successfully!');
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const bentoBoxClass = "bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[2.5rem] relative overflow-hidden";

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
          Account Settings
        </h1>
        <p className="text-gray-500 font-medium">Manage your personal information and security.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        className={`${bentoBoxClass} max-w-3xl`}
      >
        <div className="p-8 lg:p-10 border-b border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 border border-gray-100 shadow-sm">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Profile & Security</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Update your details or change your password.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 lg:p-10 flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm font-bold border border-green-100">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Full Name
              </label>
              <input 
                type="text" name="name" value={formData.name} onChange={handleChange} required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00cc50]/20 focus:border-[#00cc50] transition-all font-medium text-gray-900 placeholder-gray-400"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" /> Phone Number
              </label>
              <input 
                type="tel" name="phone" value={formData.phone} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00cc50]/20 focus:border-[#00cc50] transition-all font-medium text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 my-2 pt-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" /> Current Password
                </label>
                <input 
                  type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange}
                  placeholder="Leave empty to keep same"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00cc50]/20 focus:border-[#00cc50] transition-all font-medium text-gray-900 placeholder-gray-400"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" /> New Password
                </label>
                <input 
                  type="password" name="newPassword" value={formData.newPassword} onChange={handleChange}
                  placeholder="Leave empty to keep same"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00cc50]/20 focus:border-[#00cc50] transition-all font-medium text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button 
              type="submit" disabled={loading}
              className="bg-[#00cc50] text-white font-bold px-8 py-3.5 rounded-xl hover:bg-[#00b346] transition-colors shadow-[0_8px_20px_rgba(0,204,80,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
