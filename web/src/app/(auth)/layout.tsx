export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full flex bg-[#f8fcf9] text-gray-900 selection:bg-[#00cc50]/30 selection:text-[#00cc50] overflow-hidden relative" dir="ltr" style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}>
      
      {/* Left Side - Form Container */}
      <div className="w-full lg:w-[45%] h-full flex flex-col relative overflow-y-auto overflow-x-hidden no-scrollbar z-10">
        
        {/* Grid Background specifically for the left side */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%2300cc50' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px' }}></div>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0, 229, 89, 0.05) 0%, transparent 50%)' }} />
        </div>

        {/* Header/Logo */}
        <div className="p-6 lg:p-8 flex items-center shrink-0">
          <a href="/" className="flex items-center gap-3 cursor-pointer group/logo">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center transition-transform hover:scale-105 hover:-rotate-6 shadow-md">
              <span className="text-[#00cc50] font-black text-xl">W</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900">Whatsi<span className="text-[#00cc50]">Pro</span></span>
          </a>
        </div>
        
        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-20 w-full max-w-xl mx-auto py-4">
          {children}
        </div>
      </div>

      {/* Right Side - Visual/Testimonial Panel */}
      <div className="hidden lg:flex w-[55%] h-full bg-[#00cc50] relative flex-col justify-center p-16 overflow-hidden">
        {/* Background glow & gradient */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/10 rounded-full blur-[120px] pointer-events-none z-0 transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black/10 rounded-full blur-[100px] pointer-events-none z-0 transform -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 max-w-2xl">
          <h2 className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-10 tracking-tight">
            Turn WhatsApp into an<br/>Automated <span className="text-black">Sales</span> Machine
          </h2>

          {/* Testimonial */}
          <div className="relative mb-16">
            <div className="text-black text-7xl font-serif absolute -top-8 -left-6 opacity-20">"</div>
            <p className="text-xl text-white/90 leading-relaxed font-bold pl-6">
              WhatsiPro completely transformed our testing process. It's reliable, efficient, and ensures our leads are always captured and replied to instantly.
            </p>
            <div className="mt-6 flex items-center gap-4 pl-6">
              <div className="w-12 h-12 rounded-full bg-white overflow-hidden border-2 border-white/20 shrink-0 shadow-sm">
                <img src="https://i.pravatar.cc/150?img=11" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="text-white font-bold text-base">Ahmed Mahmoud</h4>
                <p className="text-white/70 text-sm font-medium">Sales Manager at TechStore</p>
              </div>
            </div>
          </div>

          {/* Logos */}
          <div className="border-t border-white/20 pt-8" dir="ltr">
            <p className="text-[10px] text-white/60 font-bold tracking-[0.2em] uppercase mb-6 text-left">JOIN 1K+ TEAMS</p>
            <div className="flex items-center gap-8 opacity-80 hover:opacity-100 transition-all duration-500">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                <span className="text-white font-bold text-lg">Discord</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white rounded flex items-center justify-center"><span className="text-[#00cc50] font-black text-sm">S</span></div>
                <span className="text-white font-bold text-lg">Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/></svg>
                <span className="text-white font-bold text-lg">Google</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
