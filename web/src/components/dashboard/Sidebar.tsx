'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  KeyRound, 
  CreditCard, 
  Settings, 
  LogOut,
  ChevronRight
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
  { icon: KeyRound, label: 'My Codes', href: '/dashboard/codes' },
  { icon: CreditCard, label: 'Billing', href: '/dashboard/billing' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

export default function UserSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex flex-col z-40">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-8 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-[#00cc50] font-black text-sm">W</span>
          </div>
          <span className="font-bold text-lg text-gray-900 tracking-tight group-hover:text-[#00cc50] transition-colors">WhatsiPro</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 px-4 flex flex-col gap-2 overflow-y-auto">
        <div className="px-4 mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main Menu</p>
        </div>
        
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? 'bg-green-50 text-[#00cc50] font-bold' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 top-2 bottom-2 w-1 bg-[#00cc50] rounded-r-full"
                  />
                )}
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#00cc50]' : 'text-gray-400'}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Logout Area */}
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 font-medium transition-all duration-300 group"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
