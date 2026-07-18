'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, ShieldCheck, Zap } from 'lucide-react';

export default function BillingPage() {
  const bentoBoxClass = "bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] relative overflow-hidden transition-all duration-500 group";

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
          Billing & Store
        </h1>
        <p className="text-gray-500 font-medium">Purchase new activation codes and view your payment history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        
        {/* Monthly Plan */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className={`${bentoBoxClass} p-8 lg:p-10 flex flex-col hover:border-[#00cc50]/30`}
        >
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 border border-gray-100 shadow-sm group-hover:scale-110 group-hover:bg-[#00cc50] group-hover:text-white group-hover:border-[#00cc50] transition-all duration-300">
              <Zap className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wider border border-gray-100">
              Standard
            </span>
          </div>

          <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Monthly License</h3>
          <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2">Perfect for getting started with WhatsiPro automation on a single device.</p>
          
          <div className="mb-8">
            <span className="text-4xl font-black text-gray-900 tracking-tight">99</span>
            <span className="text-lg font-bold text-gray-400 ml-1">EGP <span className="text-sm font-medium">/ month</span></span>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            {['1 PC Activation Code', 'Unlimited Messages', 'Unlimited Contacts', '24/7 Support', 'Ban Protection System'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#00cc50]" />
                </div>
                <span className="text-sm font-semibold text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          <button className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-[#00cc50] transition-colors shadow-lg shadow-gray-200 group-hover:shadow-[0_8px_25px_rgba(0,204,80,0.2)]">
            Buy with Paymob
          </button>
        </motion.div>

        {/* Yearly Plan (Popular) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`${bentoBoxClass} p-8 lg:p-10 flex flex-col border-[#00cc50]/50 shadow-[0_10px_40px_rgba(0,204,80,0.1)] hover:shadow-[0_20px_80px_rgba(0,204,80,0.15)]`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#00E559]/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#00cc50] border border-green-100 shadow-sm group-hover:scale-110 group-hover:bg-[#00cc50] group-hover:text-white transition-all duration-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 bg-[#00cc50] text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
              Most Popular
            </span>
          </div>

          <h3 className="relative z-10 text-2xl font-extrabold text-gray-900 mb-2">Yearly License</h3>
          <p className="relative z-10 text-sm text-gray-500 font-medium mb-6 line-clamp-2">Save 15% when you pay annually. Best for established sales teams.</p>
          
          <div className="relative z-10 mb-8 flex flex-col">
            <div className="flex items-baseline">
              <span className="text-4xl font-black text-gray-900 tracking-tight">999</span>
              <span className="text-lg font-bold text-gray-400 ml-1">EGP <span className="text-sm font-medium">/ year</span></span>
            </div>
            <span className="text-xs font-bold text-[#00cc50] uppercase tracking-wider mt-1">Save 189 EGP</span>
          </div>

          <ul className="relative z-10 space-y-4 mb-8 flex-1">
            {['1 PC Activation Code', 'Unlimited Messages', 'Unlimited Contacts', 'Priority 24/7 Support', 'Advanced Ban Protection', 'Early Access to Features'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#00cc50]" />
                </div>
                <span className="text-sm font-semibold text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          <button className="relative z-10 w-full bg-[#00cc50] text-white font-bold py-4 rounded-xl hover:bg-[#00b346] transition-colors shadow-[0_8px_20px_rgba(0,204,80,0.3)]">
            Buy with Paymob
          </button>
        </motion.div>

      </div>

      {/* Payment History Placeholder */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={`${bentoBoxClass} p-8 lg:p-10 mt-4`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
            <CreditCard className="w-5 h-5 text-gray-900" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900">Payment History</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center py-8">
          <p className="text-sm font-medium text-gray-500 mb-4">No payments found. Your transaction history will appear here.</p>
        </div>
      </motion.div>
    </div>
  );
}
