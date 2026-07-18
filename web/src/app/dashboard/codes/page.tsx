'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Copy, CheckCircle2, Laptop, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Code {
  id: number;
  name: string;
  plan_type: string;
  activation_code: string;
  code_used: number;
  machine_id: string | null;
  start_date: string;
  expiry_date: string;
  is_active: number;
}

export default function MyCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/codes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCodes(data.codes);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const bentoBoxClass = "bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] relative overflow-hidden transition-all duration-500 group";

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-[#00cc50] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
            My Codes
          </h1>
          <p className="text-gray-500 font-medium">Manage your purchased WhatsApp activation licenses.</p>
        </div>
        <Link href="/dashboard/billing">
          <button className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-[#00cc50] transition-colors shadow-lg flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Buy New Code
          </button>
        </Link>
      </div>

      {codes.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No active codes found</h3>
          <p className="text-gray-500 mb-6 max-w-md">You haven't purchased any activation codes yet. Get your first code to start automating your WhatsApp sales.</p>
          <Link href="/dashboard/billing">
            <button className="bg-[#00cc50] text-white font-bold px-8 py-3 rounded-full hover:bg-[#00b346] transition-colors shadow-[0_8px_20px_rgba(0,204,80,0.3)]">
              View Plans
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {codes.map((code) => {
            const isExpired = new Date(code.expiry_date) < new Date();
            const isActive = code.is_active === 1 && !isExpired;

            return (
              <motion.div 
                key={code.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className={`${bentoBoxClass} p-8 flex flex-col`}
              >
                {/* Status Badge */}
                <div className="absolute top-8 right-8">
                  {isActive ? (
                    <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full uppercase tracking-wider border border-green-100 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full uppercase tracking-wider border border-red-100 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> {isExpired ? 'Expired' : 'Disabled'}
                    </span>
                  )}
                </div>

                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-6 text-gray-900 border border-gray-100 shadow-sm">
                  <KeyRound className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-extrabold text-gray-900 mb-1">{code.name}</h3>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">{code.plan_type} Plan</p>

                {/* Code display */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between mb-6 group/code">
                  <code className="text-gray-900 font-mono font-bold tracking-wider">
                    {code.activation_code.substring(0, 4)}-****-****-{code.activation_code.slice(-4)}
                  </code>
                  <button 
                    onClick={() => handleCopy(code.id, code.activation_code)}
                    className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500 hover:text-[#00cc50] hover:border-[#00cc50] transition-colors shadow-sm"
                    title="Copy full code"
                  >
                    {copiedId === code.id ? <CheckCircle2 className="w-4 h-4 text-[#00cc50]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mt-auto pt-6 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Laptop className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Device Status</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {code.machine_id ? 'Linked to PC' : 'Unused'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Expires On</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(code.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
