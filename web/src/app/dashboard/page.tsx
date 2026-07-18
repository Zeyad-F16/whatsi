'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  KeyRound, 
  CreditCard, 
  Activity,
  ArrowRight,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
  const [user, setUser] = useState<{name: string, email: string} | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        }
      });
  }, []);

  const bentoBoxClass = "bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] relative overflow-hidden transition-all duration-500 group";

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
          Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
        </h1>
        <p className="text-gray-500 font-medium">Here's an overview of your WhatsiPro account.</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Active Codes Stat */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className={`${bentoBoxClass} p-8 lg:p-10 flex flex-col justify-between`}
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-6 text-[#00cc50] border border-green-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">0</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Codes</p>
          </div>
        </motion.div>

        {/* Total Spent Stat */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`${bentoBoxClass} p-8 lg:p-10 flex flex-col justify-between`}
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-6 text-blue-500 border border-blue-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">0 <span className="text-xl text-gray-400">EGP</span></h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Spent</p>
          </div>
        </motion.div>

        {/* Status Stat */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`${bentoBoxClass} p-8 lg:p-10 flex flex-col justify-between`}
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6 text-orange-500 border border-orange-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-xl lg:text-2xl font-extrabold text-gray-900 tracking-tight mb-1">No Active Plans</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-2">Account Status</p>
          </div>
        </motion.div>

        {/* Quick Action: Buy Code */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={`lg:col-span-2 ${bentoBoxClass} bg-[#00cc50] p-8 lg:p-10 flex flex-col justify-center text-white`}
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#00b346]/50 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-2">Get your first WhatsiPro code</h2>
              <p className="text-green-50 font-medium max-w-md">Start automating your WhatsApp sales today with a monthly or yearly license code.</p>
            </div>
            
            <Link href="/dashboard/billing">
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="group/btn relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white text-[#00cc50] font-bold text-base shadow-lg overflow-hidden"
              >
                <span className="relative z-10">Buy Now</span>
                <div className="relative z-10 w-6 h-6 rounded-full bg-green-50 flex items-center justify-center transform group-hover/btn:rotate-90 transition-transform duration-300">
                  <Plus className="w-4 h-4" />
                </div>
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Recent Activity placeholder */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className={`lg:col-span-1 ${bentoBoxClass} p-8 flex flex-col`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
            <Link href="/dashboard/codes" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#00cc50] group-hover:text-white transition-colors duration-300">
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
              <Activity className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No recent activity yet.</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
