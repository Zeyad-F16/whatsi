import React from 'react';
import UserSidebar from '@/components/dashboard/Sidebar';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check Authentication
  const cookieStore = await cookies();
  const token = cookieStore.get('whatsi_user_token')?.value;
  
  if (!token) {
    redirect('/login');
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
  } catch (err) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#f8fcf9] text-gray-900 font-sans selection:bg-[#00cc50] selection:text-white flex">
      {/* Sidebar */}
      <UserSidebar />
      
      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
