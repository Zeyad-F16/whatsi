"use client";
import React from "react";
import { motion } from "framer-motion";
import { 
  ArrowUpRight, 
  Users, 
  Bot, 
  TrendingUp, 
  ShieldCheck, 
  User,
  CheckCircle2,
  Menu,
  Zap,
  Globe,
  ArrowRight,
  AlertTriangle,
  ArrowDown,
  UserPlus,
  QrCode,
  Activity,
  MessageCircle,
  Bell,
  CheckCheck
} from "lucide-react";
import { AnimatedGradient } from "@/components/ui/animated-gradient";

// Clean Bento Box Base Class
const bentoBoxClass = "bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] cursor-pointer relative overflow-hidden group/box transition-all duration-500";

export default function Home() {
  const [activeTab, setActiveTab] = React.useState('Home');
  const hoverSpring = { type: "spring" as const, stiffness: 400, damping: 25 };

  return (
    <main style={{ fontFamily: 'var(--font-jakarta), sans-serif' }} className="relative w-full text-gray-900 selection:bg-[#00E559] selection:text-black" dir="ltr">
      
      {/* Background Layer (Fixed) */}
      <div className="fixed inset-0 bg-[#f8fcf9] pointer-events-none -z-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%2300cc50' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px' }}></div>
      </div>
      <div className="fixed inset-0 pointer-events-none -z-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0, 229, 89, 0.05) 0%, transparent 50%)' }} />

      {/* FIXED HEADER */}
      <header className="fixed top-6 lg:top-8 left-6 lg:left-8 right-6 lg:right-8 z-50 flex justify-between items-center pointer-events-none">
        
        {/* Left Pill */}
        <div className={`pointer-events-auto flex items-center gap-6 xl:gap-8 px-6 py-3 bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-full`}>
          <motion.div whileHover={{ scale: 1.05, rotate: -5 }} className="flex items-center gap-3 cursor-pointer group/logo">
            <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
              <span className="text-[#00E559] font-black text-lg">W</span>
            </div>
          </motion.div>
          
          {/* Navigation with Animated Sliding Pill */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-bold text-gray-500">
            {['Home', 'Features', 'Integrations', 'Pricing', 'Resources'].map((item) => {
              const isActive = activeTab === item;
              return (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent jumping since sections don't exist yet
                    setActiveTab(item);
                  }}
                  className={`relative px-4 py-1.5 rounded-full transition-colors duration-300 ${isActive ? 'text-gray-900' : 'hover:text-gray-900'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-gray-100"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-full hover:bg-gray-100/60 transition-colors duration-300" />
                  )}
                  <span className="relative z-10">{item}</span>
                </a>
              );
            })}
          </nav>

          <button className="md:hidden text-gray-900 hover:text-[#00cc50] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Right Pill */}
        <div className={`pointer-events-auto flex items-center gap-3 px-3 py-2 bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-full`}>
          <div className="flex items-center bg-gray-100/50 rounded-full p-1 cursor-pointer group/lang">
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center justify-center px-4 py-1.5 bg-white rounded-full text-xs font-bold text-gray-900 shadow-sm">
              EN
            </motion.div>
            <div className="flex items-center justify-center px-4 py-1.5 text-xs font-semibold text-gray-500 group-hover/lang:text-gray-900 transition-colors">
              عربي
            </div>
          </div>
          
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 pl-2 cursor-pointer group/user">
            <div className="hidden sm:flex flex-col items-end pr-2">
              <span className="text-sm font-bold text-gray-900 group-hover/user:text-[#00cc50] transition-colors">Login</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 group-hover/user:bg-[#00cc50] transition-all duration-300">
              <User className="w-4 h-4 text-gray-900 group-hover/user:text-white transition-colors duration-300" />
            </div>
          </motion.div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative h-screen w-full overflow-hidden flex flex-col p-6 lg:p-8 pt-24 lg:pt-28 gap-6 lg:gap-8 z-10">

        {/* Floating Elements (Hero) */}
        <motion.div animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} className="absolute top-[20%] left-[5%] z-20 hidden xl:flex items-center justify-center w-12 h-12 bg-white rounded-2xl shadow-xl border border-gray-100">
          <MessageCircle className="w-6 h-6 text-[#00cc50]" />
        </motion.div>
        <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }} className="absolute bottom-[20%] right-[3%] z-20 hidden xl:flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-xl border border-gray-100">
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center"><span className="text-[8px] text-white font-bold">3</span></div>
          <Bell className="w-6 h-6 text-gray-400" />
        </motion.div>

      {/* Main Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pb-2 lg:pb-0 z-10">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8 min-h-0">
          
          {/* BIG HERO BOX */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} 
            whileHover={{ y: -5, scale: 1.01, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.1)" }}
            transition={hoverSpring}
            className={`flex-1 ${bentoBoxClass} bg-white/95 p-8 lg:p-10 flex flex-col justify-center`}
          >
            {/* Dynamic Glow background on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00E559]/0 to-[#00E559]/0 group-hover/box:from-[#00E559]/5 group-hover/box:to-transparent transition-all duration-700 pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-2xl">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-6 text-[#00cc50] border border-green-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Bot className="w-6 h-6" />
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-gray-900">
                Turn WhatsApp into an <br />
                Automated{' '}
                <span className="text-[#00cc50] relative inline-block group/highlight">
                  Sales
                  <motion.svg 
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.5 }}
                    className="absolute -bottom-2 left-0 w-full h-3 text-[#00E559]/30 group-hover/highlight:text-[#00E559]/60 transition-colors duration-300" 
                    viewBox="0 0 100 20" preserveAspectRatio="none"
                  >
                    <path d="M0 10 Q 50 20 100 10" stroke="currentColor" strokeWidth="8" fill="none" />
                  </motion.svg>
                </span> Machine.
              </h1>
              
              <p className="text-base lg:text-lg text-gray-500 mb-8 max-w-lg leading-relaxed font-medium">
                Stop losing leads. Our intelligent CRM replies instantly, prevents bans, and organizes your team effortlessly.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <motion.button 
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="group/btn relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#00cc50] text-white font-bold text-base hover:bg-[#00b346] shadow-[0_8px_20px_rgba(0,204,80,0.3)] overflow-hidden"
                >
                  <span className="relative z-10">Start Free Trial</span>
                  <div className="relative z-10 w-7 h-7 rounded-full bg-black/10 flex items-center justify-center transform group-hover/btn:translate-x-1 group-hover/btn:-rotate-45 transition-transform duration-300">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  {/* Sweep hover effect */}
                  <div className="absolute inset-0 h-full w-0 bg-white/20 transition-all duration-300 ease-out group-hover/btn:w-full"></div>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-gray-50 border-2 border-gray-100 text-gray-900 font-bold text-base shadow-sm"
                >
                  Book Demo
                </motion.button>
              </div>
            </div>

            {/* Abstract visual on the right */}
            <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 pointer-events-none">
              <motion.div 
                animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-72 bg-white rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.06)] border border-gray-100 flex items-start gap-4 transform group-hover/box:rotate-[2deg] group-hover/box:scale-105 transition-transform duration-700 ease-out"
              >
                <div className="w-10 h-10 rounded-full bg-[#00cc50]/10 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-[#00cc50]" />
                </div>
                <div className="w-full">
                  <div className="h-2.5 w-1/3 bg-gray-200 rounded-full mb-3"></div>
                  <div className="h-2.5 w-full bg-gray-100 rounded-full mb-2"></div>
                  <div className="h-2.5 w-4/5 bg-gray-100 rounded-full"></div>
                </div>
              </motion.div>
              
              <motion.div 
                animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="w-72 bg-white rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-between transform translate-x-8 group-hover/box:rotate-[-2deg] group-hover/box:translate-x-4 transition-transform duration-700 ease-out"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#00cc50]" />
                  </div>
                  <div className="font-semibold text-sm text-gray-900">Lead Captured</div>
                </div>
                <div className="text-xs font-bold text-gray-400">Just now</div>
              </motion.div>
            </div>
          </motion.div>

          {/* 3 SMALL BOXES */}
          <div className="grid grid-cols-3 gap-6 lg:gap-8 h-auto lg:h-[180px] shrink-0">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} 
              whileHover={{ y: -8, scale: 1.02 }} transition={hoverSpring}
              className={`${bentoBoxClass} p-6 lg:p-8 flex flex-col justify-between hover:border-gray-200`}
            >
              <div className="flex justify-between items-start">
                <motion.div whileHover={{ rotate: 15, scale: 1.1 }} className="w-12 h-12 rounded-[1.25rem] bg-gray-50 text-gray-900 flex items-center justify-center border border-gray-100">
                  <ShieldCheck className="w-6 h-6" />
                </motion.div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover/box:bg-gray-900 group-hover/box:text-white transition-colors duration-300">
                  <ArrowUpRight className="w-3 h-3 text-inherit group-hover/box:translate-x-0.5 group-hover/box:-translate-y-0.5 transition-transform" />
                </div>
              </div>
              <div className="transform group-hover/box:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">100%</h3>
                <p className="text-[10px] lg:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Ban Protection</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} 
              whileHover={{ y: -8, scale: 1.02 }} transition={hoverSpring}
              className={`${bentoBoxClass} p-6 lg:p-8 flex flex-col justify-between hover:border-gray-200`}
            >
              <div className="flex justify-between items-start">
                <motion.div whileHover={{ rotate: -15, scale: 1.1 }} className="w-12 h-12 rounded-[1.25rem] bg-gray-50 text-gray-900 flex items-center justify-center border border-gray-100">
                  <Users className="w-6 h-6" />
                </motion.div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover/box:bg-gray-900 group-hover/box:text-white transition-colors duration-300">
                  <ArrowUpRight className="w-3 h-3 text-inherit group-hover/box:translate-x-0.5 group-hover/box:-translate-y-0.5 transition-transform" />
                </div>
              </div>
              <div className="transform group-hover/box:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">5m+</h3>
                <p className="text-[10px] lg:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Leads Managed</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} 
              whileHover={{ y: -8, scale: 1.02 }} transition={hoverSpring}
              className={`${bentoBoxClass} p-6 lg:p-8 flex flex-col justify-between hover:border-gray-200`}
            >
              <div className="flex justify-between items-start">
                <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }} className="w-12 h-12 rounded-[1.25rem] bg-gray-50 text-gray-900 flex items-center justify-center border border-gray-100">
                  <TrendingUp className="w-6 h-6" />
                </motion.div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover/box:bg-gray-900 group-hover/box:text-white transition-colors duration-300">
                  <ArrowUpRight className="w-3 h-3 text-inherit group-hover/box:translate-x-0.5 group-hover/box:-translate-y-0.5 transition-transform" />
                </div>
              </div>
              <div className="transform group-hover/box:translate-x-1 transition-transform duration-300">
                <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">3x</h3>
                <p className="text-[10px] lg:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Sales Increase</p>
              </div>
            </motion.div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8 min-h-0">
          
          <motion.div 
            initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} 
            whileHover={{ y: -8, scale: 1.02 }} transition={hoverSpring}
            className={`flex-[1] ${bentoBoxClass} p-6 lg:p-8 flex flex-col justify-between`}
          >
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4 text-[#00cc50] border border-green-100 shadow-sm group-hover/box:scale-110 transition-transform duration-300">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 group-hover/box:text-[#00cc50] transition-colors duration-300">Active Bots</h3>
                <p className="text-xs text-gray-500 mt-1">Running right now</p>
              </div>
              <div className="flex gap-1.5 bg-white p-2 rounded-full shadow-sm border border-gray-100 group-hover/box:scale-110 transition-transform duration-300">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00cc50] animate-pulse"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '400ms' }}></div>
              </div>
            </div>
            
            <div className="mt-auto bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-100 shadow-sm group-hover/box:border-gray-200 transition-colors duration-300">
              <div className="flex -space-x-3 group-hover/box:-space-x-1 transition-all duration-300">
                {[1,2,3].map((i) => (
                  <motion.div whileHover={{ y: -5 }} key={i} className="w-9 h-9 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center cursor-pointer shadow-sm">
                    <User className="w-4 h-4 text-gray-400"/>
                  </motion.div>
                ))}
              </div>
              <div className="text-sm font-bold text-gray-900 group-hover/box:text-[#00cc50] transition-colors">+99 Online</div>
            </div>
          </motion.div>

          {/* Smart Inbox Box - Fixed Text Color */}
          <motion.div 
            initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} 
            whileHover={{ y: -8, scale: 1.02 }} transition={hoverSpring}
            className={`flex-[1.5] ${bentoBoxClass} p-6 lg:p-8 relative flex flex-col justify-between`}
          >
            {/* The background glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-bl from-[#00E559]/0 to-transparent group-hover/box:from-[#00E559]/10 transition-colors duration-500 z-0"></div>

            <div className="relative z-10 flex justify-between items-start">
              <div className="inline-block px-3 py-1 bg-[#e8fcf0] rounded-full text-[10px] font-bold uppercase tracking-wider text-[#00993b] border border-[#bbf7d0]">New Gen</div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer shadow-sm border border-gray-100 group-hover/box:bg-[#00cc50] group-hover/box:text-white transition-all duration-300 group-hover/box:scale-110 group-hover/box:rotate-12">
                <ArrowUpRight className="w-4 h-4 text-gray-900 group-hover/box:text-white" />
              </div>
            </div>
            
            <div className="relative z-10 mt-auto">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4 text-[#00cc50] border border-green-100 shadow-sm group-hover/box:scale-110 transition-transform duration-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight group-hover/box:translate-x-2 transition-transform duration-300">Smart Inbox</h3>
              
              <div className="w-full bg-white border border-gray-100 rounded-2xl p-4 space-y-3 mt-4 shadow-sm group-hover/box:shadow-md transition-shadow duration-300">
                <div className="w-3/4 h-2 bg-gray-100 rounded-full"></div>
                <div className="w-1/2 h-2 bg-[#00E559] rounded-full shadow-[0_0_15px_rgba(0,229,89,0.3)] group-hover/box:w-[85%] transition-all duration-700 ease-out"></div>
                <div className="w-full h-2 bg-gray-100 rounded-full"></div>
              </div>
            </div>
            
            {/* Subtle corner decoration */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#00E559]/20 rounded-full blur-[40px] pointer-events-none group-hover/box:scale-150 transition-transform duration-700"></div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} 
            whileHover={{ y: -8, scale: 1.02 }} transition={hoverSpring}
            className={`flex-[1] ${bentoBoxClass} p-6 lg:p-8 flex flex-col justify-center bg-[#f0fdf4] hover:bg-[#e0fbe8] !border-[#bbf7d0]`}
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-4 text-[#00cc50] border border-green-100 shadow-sm group-hover/box:scale-110 transition-transform duration-300">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 group-hover/box:scale-105 transition-transform">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00cc50] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00cc50]"></span>
                </span>
                <span className="font-bold text-[10px] uppercase tracking-widest text-[#00993b]">24/7 Support</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover/box:text-[#00993b] transition-colors">Always Online</h3>
            <p className="text-sm text-gray-600 font-medium transform group-hover/box:translate-x-1 transition-transform duration-300">Your business never sleeps. Automate responses instantly.</p>
          </motion.div>

        </div>
      </div>
      </section>

      {/* BEFORE / AFTER SECTION */}
      <section id="features" className="relative h-screen min-h-[800px] w-full flex flex-col p-6 lg:p-8 pt-24 lg:pt-28 gap-6 lg:gap-8 z-10 overflow-hidden">
        
        {/* Floating Elements (Features) */}
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 2 }} className="absolute top-[15%] right-[15%] z-20 hidden lg:flex items-center justify-center px-4 py-2 bg-white rounded-xl shadow-xl border border-gray-100 gap-2">
          <CheckCheck className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-bold text-gray-700">Read 10:42 AM</span>
        </motion.div>
        <motion.div animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1.5 }} className="absolute bottom-[25%] left-[8%] z-20 hidden xl:flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-2xl border-4 border-green-50">
          <User className="w-8 h-8 text-[#00cc50]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#00cc50] rounded-full border-2 border-white"></div>
        </motion.div>

        {/* Neon Background Elements (Optimized) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none -z-10 opacity-30" style={{ background: 'radial-gradient(circle, rgba(0, 229, 89, 0.1) 0%, transparent 70%)' }} />

        {/* Main Grid */}
        <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative z-10">
          
          {/* Top Left Heading Box */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className={`lg:col-span-7 ${bentoBoxClass} flex flex-col items-start justify-center text-left p-6 lg:p-8 shrink-0`}
          >
            <span className="inline-block px-3 py-1.5 rounded-full bg-green-50 text-[#00993b] text-[10px] font-bold tracking-widest uppercase mb-4 border border-green-200 shadow-sm">The Problem & Solution</span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
              <span className="text-gray-900">Stop juggling devices.</span><br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00cc50] to-[#00993b]">Start managing.</span>
            </h2>
            <p className="text-sm text-gray-500 font-medium max-w-xl">Managing a sales team shouldn't mean buying a new phone for every agent.</p>
            
            {/* Downward pointing indicator */}
            <div className="mt-8 flex items-center gap-3 bg-[#00cc50]/10 border border-[#00cc50]/20 px-5 py-2.5 rounded-full text-[#00cc50] font-extrabold text-[12px] uppercase tracking-widest cursor-pointer hover:bg-[#00cc50]/20 transition-colors w-fit group/down">
              <span>See the transformation</span>
              <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                <ArrowDown className="w-4 h-4 group-hover/down:scale-110 transition-transform" />
              </motion.div>
            </div>
          </motion.div>

          {/* Top Right CTA Box */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className={`lg:col-span-5 bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] relative overflow-hidden group flex flex-col p-6 lg:p-8 shrink-0 transition-all duration-500`}
          >
            {/* Soft gradient background inside */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00E559]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0"></div>
            
            <div className="relative z-10 flex flex-col h-full w-full justify-center">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-4 text-[#00cc50] border border-green-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-gray-900 mb-2 leading-tight group-hover:text-[#00cc50] transition-colors duration-300">Supercharge your<br/>sales process.</h3>
              <p className="text-gray-500 font-medium mb-6 text-xs lg:text-sm max-w-[280px]">Join 10,000+ top businesses automating their WhatsApp pipelines today.</p>
              
              <div className="mt-auto">
                <button className="w-full bg-gray-900 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:bg-[#00cc50] hover:shadow-[0_8px_25px_rgba(0,204,80,0.3)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                  Start your free trial <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
          
          {/* Bottom Row Subgrid (For Before & After Connection) */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative z-10 group/row">
            
            {/* Powerful Bridge Connector (Desktop Only) */}
            <div className="hidden lg:flex absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 z-40 items-center justify-center pointer-events-none">
              
              {/* Ambient Glow */}
              <div className="absolute w-[250px] h-[80px] bg-gradient-to-r from-red-500/10 via-[#00cc50]/20 to-[#00cc50]/30 blur-[30px] rounded-full pointer-events-none"></div>

              {/* The Bridge Pill */}
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 10 }} whileInView={{ scale: 1, opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, type: "spring" }}
                className="relative bg-white border border-gray-200/80 shadow-[0_20px_60px_rgba(0,0,0,0.06)] rounded-full px-8 py-3.5 flex items-center gap-4 group-hover/row:shadow-[0_20px_80px_rgba(0,204,80,0.2)] group-hover/row:scale-105 group-hover/row:-translate-y-1 transition-all duration-500"
              >
                {/* Left Side: Chaos */}
                <span className="text-[12px] font-black text-gray-400 uppercase tracking-[0.25em] relative z-10">Chaos</span>
                
                {/* Animated Power Arrows */}
                <div className="relative flex items-center justify-center mx-2 text-[#00cc50]">
                  <motion.div animate={{ x: [0, 6, 0], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                    <ArrowRight className="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,204,80,0.8)]" />
                  </motion.div>
                  <motion.div animate={{ x: [0, 6, 0], opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.15 }} className="-ml-3">
                    <ArrowRight className="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,204,80,0.8)]" />
                  </motion.div>
                  <motion.div animate={{ x: [0, 6, 0], opacity: [0.1, 0.5, 0.1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.3 }} className="-ml-3">
                    <ArrowRight className="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,204,80,0.8)]" />
                  </motion.div>
                </div>

                {/* Right Side: Control */}
                <span className="text-[12px] font-black text-[#00cc50] uppercase tracking-[0.25em] relative z-10">Control</span>
              </motion.div>
            </div>

            {/* Before Box (Chaos) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className={`lg:col-span-6 ${bentoBoxClass} group p-6 lg:p-8 pb-0 lg:pb-0 flex flex-col hover:border-red-200 transition-colors duration-500`}
          >
            {/* Text Area (Top) */}
            <div className="flex flex-col items-start text-left w-full z-10 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 border border-red-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="inline-block text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">The Old Way</div>
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-gray-900 mb-2">Device Chaos</h3>
              <p className="text-sm text-gray-500 font-medium max-w-md line-clamp-2">Managing a team with physical phones is a nightmare. Lost chats, missed leads, and zero oversight.</p>
            </div>
            
            {/* CSS Illustration: Phones (Bottom) */}
            <div className="relative w-full flex-1 flex items-end justify-center min-h-[160px] mt-4 z-0">
              <div className="absolute bottom-[-15px] w-full flex justify-center items-end origin-bottom scale-[0.65] lg:scale-[0.75] xl:scale-[0.85] 2xl:scale-100 transition-transform duration-500 group-hover:scale-[0.7] lg:group-hover:scale-[0.8] xl:group-hover:scale-[0.9] 2xl:group-hover:scale-105 pointer-events-none">
                {/* Phone 1 */}
                <motion.div animate={{ rotate: [-12, -15, -12] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute bottom-0 left-1/2 ml-[-120px] w-28 h-[220px] bg-gray-900 rounded-t-[2rem] border-4 border-b-0 border-gray-300 shadow-2xl flex flex-col items-center pt-3 overflow-visible group-hover:rotate-[-25deg] group-hover:-translate-x-6 transition-all duration-500 z-10">
                <div className="w-10 h-1.5 bg-gray-700 rounded-full mb-4"></div>
                <div className="w-full px-3 space-y-3 flex-1">
                  <div className="w-3/4 h-8 bg-gray-800 rounded-xl self-start"></div>
                  <div className="w-2/3 h-8 bg-[#00E559]/20 border border-[#00E559]/30 rounded-xl self-end"></div>
                  <div className="w-full h-8 bg-gray-800 rounded-xl self-start"></div>
                </div>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"><span className="text-[10px] text-white font-bold">1</span></motion.div>
                
                {/* Floating Bubble */}
                <div className="absolute -top-10 -left-6 bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 shadow-lg border border-red-100 whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 delay-100 z-50">Which chat?!</div>
              </motion.div>

              {/* Phone 2 */}
              <motion.div animate={{ rotate: [12, 15, 12] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }} className="absolute bottom-0 left-1/2 ml-[10px] w-28 h-[220px] bg-gray-900 rounded-t-[2rem] border-4 border-b-0 border-gray-300 shadow-2xl flex flex-col items-center pt-3 z-10 overflow-visible group-hover:rotate-[25deg] group-hover:translate-x-6 transition-all duration-500">
                <div className="w-10 h-1.5 bg-gray-700 rounded-full mb-4"></div>
                <div className="w-full px-3 space-y-3 flex-1">
                  <div className="w-2/3 h-8 bg-[#00E559]/20 border border-[#00E559]/30 rounded-xl self-end"></div>
                  <div className="w-full h-8 bg-gray-800 rounded-xl self-start"></div>
                </div>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"><span className="text-[10px] text-white font-bold">2</span></motion.div>
                
                {/* Floating Bubble */}
                <div className="absolute -top-10 -right-6 bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 shadow-lg border border-red-100 whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 delay-200 z-50">Lost lead!</div>
              </motion.div>

              {/* Phone 3 (Center) */}
              <motion.div animate={{ rotate: [-2, 0, -2] }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }} className="absolute bottom-[10px] left-1/2 ml-[-64px] w-32 h-[260px] bg-gray-900 rounded-t-[2rem] border-[5px] border-b-0 border-gray-200 shadow-2xl flex flex-col items-center pt-4 z-20 overflow-visible group-hover:scale-105 transition-all duration-500">
                <div className="w-12 h-1.5 bg-gray-700 rounded-full mb-6"></div>
                <div className="w-full px-4 space-y-4 flex-1">
                  <div className="w-full h-10 bg-gray-800 rounded-xl self-start"></div>
                  <div className="w-4/5 h-10 bg-[#00E559]/30 border border-[#00E559]/40 rounded-xl self-end"></div>
                  <div className="w-full h-10 bg-gray-800 rounded-xl self-start mt-4"></div>
                </div>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.8, delay: 1 }} className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full border-[3px] border-white flex items-center justify-center text-xs text-white font-bold shadow-lg">5</motion.div>
                
                {/* Floating Bubble */}
                <div className="absolute -top-12 right-0 bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 shadow-lg border border-red-100 whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 z-50">Who replied?!</div>
              </motion.div>
            </div>
            </div>
          </motion.div>

          {/* After Box (WhatsiPro) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
            className={`lg:col-span-6 ${bentoBoxClass} group p-6 lg:p-8 pb-0 lg:pb-0 flex flex-col hover:border-[#00cc50]/40 transition-colors duration-500`}
          >
            {/* Text Area (Top) */}
            <div className="flex flex-col items-start text-left w-full z-10 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#00cc50] border border-green-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="inline-block text-[10px] font-bold text-[#00cc50] uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100 z-20">WhatsiPro</div>
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-gray-900 mb-2 relative z-10">The Unified Hub</h3>
              <p className="text-sm text-gray-500 font-medium max-w-md line-clamp-2 relative z-10">Connect infinite numbers to one dashboard. Give your team access without buying a single new phone.</p>
            </div>
            
            {/* CSS Illustration: Dashboard (High Contrast, fixed width, anchored bottom) */}
            <div className="relative w-full flex-1 flex items-end justify-center min-h-[160px] mt-4 z-0">
              <div className="absolute bottom-[-15px] w-full flex justify-center items-end origin-bottom scale-[0.70] lg:scale-[0.80] xl:scale-[0.90] 2xl:scale-100 transition-transform duration-500 pointer-events-none group-hover:scale-[0.75] lg:group-hover:scale-[0.85] xl:group-hover:scale-[0.95] 2xl:group-hover:scale-105">
                
                <div className="relative w-[90%] sm:w-[85%] h-[260px] bg-white rounded-t-2xl border-2 border-b-0 border-gray-200 shadow-2xl flex overflow-hidden group-hover:shadow-[0_0px_60px_rgba(0,204,80,0.15)] transition-all duration-500 z-10 translate-y-4 group-hover:translate-y-0">
                
                {/* Scanner Animations using Framer Motion */}
                <motion.div animate={{ top: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} className="absolute left-0 w-full h-[150%] bg-gradient-to-b from-transparent via-[#00cc50]/10 to-transparent z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></motion.div>
                <motion.div animate={{ top: ['-10%', '110%'] }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} className="absolute left-0 w-full h-0.5 bg-[#00cc50] shadow-[0_0_15px_rgba(0,204,80,0.8)] z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></motion.div>

                {/* Sidebar */}
                <div className="w-[35%] h-full bg-gray-50 border-r border-gray-200 p-3 flex flex-col gap-3">
                  <div className="w-2/3 h-3 bg-gray-300 rounded-full mb-2"></div>
                  {/* Chat items */}
                  {[1,2,3,4].map((i) => (
                    <div key={i} className={`w-full p-2.5 rounded-xl flex items-center gap-2 lg:gap-3 border ${i===2 ? 'bg-white border-[#00cc50] shadow-sm relative z-10' : 'bg-transparent border-transparent'}`}>
                      <div className="w-8 h-8 rounded-full bg-gray-300 shrink-0 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center"><User className="w-4 h-4 text-gray-500" /></div>
                      <div className="flex-1 flex flex-col gap-1.5 hidden sm:flex">
                        <div className="w-full h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2/3 h-1.5 bg-gray-300 rounded-full"></div>
                      </div>
                      {/* Unified notifications */}
                      {i !== 4 && (
                        <div className="w-2.5 h-2.5 bg-[#00cc50] rounded-full shrink-0 shadow-[0_0_8px_rgba(0,204,80,0.5)]"></div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Main Chat Area */}
                <div className="flex-1 h-full bg-[#f8fcf9] p-4 flex flex-col relative overflow-hidden">
                  <div className="w-full bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 mb-5 shadow-sm">
                     <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0 border-2 border-white flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div>
                     <div className="flex-1">
                       <div className="w-1/3 h-2.5 bg-gray-800 rounded-full mb-2"></div>
                       <div className="w-1/4 h-1.5 bg-[#00cc50] rounded-full"></div>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="w-[85%] h-12 bg-white rounded-r-2xl rounded-bl-2xl border border-gray-200 self-start shadow-sm p-3 flex flex-col justify-center">
                       <div className="w-2/3 h-2 bg-gray-300 rounded-full mb-2"></div>
                       <div className="w-full h-2 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="w-3/4 h-12 bg-[#00cc50] rounded-l-2xl rounded-br-2xl self-end text-white flex flex-col justify-center px-4 shadow-[0_8px_20px_rgba(0,204,80,0.3)]">
                      <div className="w-3/4 h-2 bg-white/90 rounded-full mb-2"></div>
                      <div className="w-1/2 h-2 bg-white/60 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Success Badge */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute bottom-10 -right-4 sm:-right-2 bg-white p-3 sm:px-5 sm:py-4 rounded-full shadow-2xl border-2 border-[#00cc50]/20 flex items-center gap-3 z-30 group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-500">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#00cc50] flex items-center justify-center text-white shadow-[0_4px_15px_rgba(0,204,80,0.4)]">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm sm:text-base font-extrabold text-gray-900 leading-none">All synched</span>
                  <span className="text-[10px] sm:text-xs text-[#00cc50] font-bold mt-1 uppercase tracking-wider">Ready to reply</span>
                </div>
              </motion.div>
            </div>
            </div>
            
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#00cc50]/10 to-transparent pointer-events-none z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </motion.div>
          </div>
        </div>
      </section>

      {/* STEPS TO SETUP SECTION */}
      <section id="setup" className="relative min-h-[800px] w-full flex flex-col p-6 lg:p-8 pt-24 lg:pt-28 gap-6 lg:gap-8 z-10 overflow-hidden max-w-[1600px] mx-auto">
        <div className="flex flex-col items-center text-center mb-12 lg:mb-16 relative z-10">
          <span className="inline-block px-4 py-2 rounded-full bg-green-50 text-[#00993b] text-xs font-black tracking-widest uppercase mb-6 border border-green-200 shadow-sm">Fast Onboarding</span>
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight mb-6 text-black leading-[1.1]">
            From zero to <span className="text-[#00cc50]">full control</span><br/> in 3 simple steps.
          </h2>
          <p className="text-base lg:text-lg text-gray-600 font-medium max-w-2xl leading-relaxed">
            No technical knowledge required. Plug your numbers and start selling instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative z-10">
           {/* Connecting Line (Desktop) */}
           <div className="hidden lg:block absolute top-[45%] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#00cc50]/30 to-transparent z-0 pointer-events-none">
              <motion.div animate={{ left: ['-10%', '110%'] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute top-0 w-24 h-full bg-gradient-to-r from-transparent via-[#00cc50] to-transparent shadow-[0_0_10px_rgba(0,204,80,0.5)]"></motion.div>
           </div>

           {/* Step 1 */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
             className={`${bentoBoxClass} p-8 lg:p-10 flex flex-col items-center text-center hover:border-[#00cc50]/40 transition-colors duration-500 relative z-10 bg-white`}
           >
              {/* 3D Abstract Cube */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 group-hover/box:opacity-50 transition-opacity duration-700 pointer-events-none">
                 <motion.svg animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} viewBox="0 0 100 100" className="w-[300px] h-[300px] relative z-10">
                   <defs>
                     <linearGradient id="cubeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                       <stop offset="0%" stopColor="#00E559" />
                       <stop offset="100%" stopColor="#00993b" />
                     </linearGradient>
                   </defs>
                   <polygon points="50,15 90,35 90,75 50,95 10,75 10,35" fill="url(#cubeGrad1)" />
                   <polygon points="50,15 90,35 50,55 10,35" fill="white" fillOpacity="0.3" />
                   <polygon points="50,55 90,35 90,75 50,95" fill="black" fillOpacity="0.15" />
                 </motion.svg>
              </div>

              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-6 text-gray-900 border border-gray-100 shadow-sm group-hover/box:bg-[#00cc50] group-hover/box:text-white transition-all duration-300 relative z-10">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-gray-900 mb-3">Get your workspace</h3>
              <p className="text-sm text-gray-500 font-medium">Subscribe and instantly access your team's unified dashboard. No complex onboarding.</p>
              
              {/* Step 1 Mockup */}
              <div className="relative w-full h-[180px] bg-gray-50/50 rounded-2xl mt-8 flex items-center justify-center overflow-hidden border border-gray-100 group-hover/box:shadow-inner transition-shadow">
                 <div className="absolute font-black text-[120px] text-gray-900/5 select-none -translate-y-4">01</div>
                 {/* Modern Registration Form Abstract */}
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="relative z-10 w-[85%] bg-white rounded-xl shadow-lg border border-gray-100 p-4 flex flex-col gap-3 group-hover/box:-translate-y-2 transition-transform duration-500">
                   <div className="w-full flex gap-2">
                     <div className="flex-1 h-8 bg-gray-50 rounded-md border border-gray-100 flex items-center px-3"><div className="w-12 h-1.5 bg-gray-200 rounded-full"></div></div>
                     <div className="flex-1 h-8 bg-gray-50 rounded-md border border-gray-100 flex items-center px-3"><div className="w-16 h-1.5 bg-gray-200 rounded-full"></div></div>
                   </div>
                   <div className="w-full h-8 bg-gray-50 rounded-md border border-gray-100 flex items-center px-3"><div className="w-24 h-1.5 bg-gray-200 rounded-full"></div></div>
                   <div className="w-full h-9 bg-[#00cc50] rounded-md flex items-center justify-center mt-1 shadow-[0_4px_12px_rgba(0,204,80,0.3)] group-hover/box:shadow-[0_6px_15px_rgba(0,204,80,0.4)] transition-shadow">
                     <span className="text-white text-[10px] font-extrabold uppercase tracking-widest">Create Account</span>
                   </div>
                 </motion.div>
              </div>
           </motion.div>

           {/* Step 2 */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
             className={`${bentoBoxClass} p-8 lg:p-10 flex flex-col items-center text-center hover:border-[#00cc50]/40 transition-colors duration-500 relative z-10 bg-white`}
           >
              {/* 3D Abstract Diamond */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 group-hover/box:opacity-50 transition-opacity duration-700 pointer-events-none">
                 <motion.svg animate={{ y: [10, -10, 10], rotate: [2, -2, 2] }} transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }} viewBox="0 0 100 100" className="w-[280px] h-[280px] relative z-10">
                   <defs>
                     <linearGradient id="cubeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                       <stop offset="0%" stopColor="#00E559" />
                       <stop offset="100%" stopColor="#00993b" />
                     </linearGradient>
                   </defs>
                   <polygon points="50,5 95,50 50,95 5,50" fill="url(#cubeGrad2)" />
                   <polygon points="50,5 95,50 50,50 5,50" fill="white" fillOpacity="0.3" />
                   <polygon points="50,50 95,50 50,95" fill="black" fillOpacity="0.1" />
                 </motion.svg>
              </div>

              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-6 text-gray-900 border border-gray-100 shadow-sm group-hover/box:bg-[#00cc50] group-hover/box:text-white transition-all duration-300 relative z-10">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-gray-900 mb-3">Scan & Connect</h3>
              <p className="text-sm text-gray-500 font-medium">Link your agents' WhatsApp accounts in seconds via a simple QR code scan.</p>
              
              {/* Step 2 Mockup */}
              <div className="relative w-full h-[180px] bg-gray-50/50 rounded-2xl mt-8 flex items-center justify-center overflow-hidden border border-gray-100 group-hover/box:shadow-inner transition-shadow">
                 <div className="absolute font-black text-[120px] text-[#00cc50]/5 select-none -translate-y-4">02</div>
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="relative z-10 w-28 h-28 bg-white rounded-2xl shadow-xl border-2 border-gray-100 flex items-center justify-center overflow-hidden group-hover/box:scale-105 transition-transform duration-500">
                   <QrCode className="w-16 h-16 text-gray-800" />
                   
                   {/* Phone Frame Abstract overlay */}
                   <div className="absolute inset-0 border-[6px] border-gray-900 rounded-2xl opacity-5 scale-110 pointer-events-none"></div>

                   {/* Laser Scanner */}
                   <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} className="absolute left-0 w-full h-[2px] bg-[#00cc50] shadow-[0_0_15px_3px_rgba(0,204,80,0.6)] z-20"></motion.div>
                   <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} className="absolute left-0 w-full h-1/2 bg-gradient-to-b from-transparent to-[#00cc50]/20 z-10 -translate-y-full"></motion.div>
                 </motion.div>
              </div>
           </motion.div>

           {/* Step 3 */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
             className={`${bentoBoxClass} p-8 lg:p-10 flex flex-col items-center text-center hover:border-[#00cc50]/40 transition-colors duration-500 relative z-10 bg-white`}
           >
              {/* 3D Abstract Hexagon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 group-hover/box:opacity-50 transition-opacity duration-700 pointer-events-none">
                 <motion.svg animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} viewBox="0 0 100 100" className="w-[320px] h-[320px] relative z-10">
                   <defs>
                     <linearGradient id="cubeGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                       <stop offset="0%" stopColor="#00E559" />
                       <stop offset="100%" stopColor="#00993b" />
                     </linearGradient>
                   </defs>
                   <polygon points="50,5 89,27.5 89,72.5 50,95 11,72.5 11,27.5" fill="url(#cubeGrad3)" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
                   <polygon points="50,5 89,27.5 50,50 11,27.5" fill="white" fillOpacity="0.25" />
                   <circle cx="50" cy="50" r="15" fill="#00E559" fillOpacity="0.8" className="animate-pulse" />
                 </motion.svg>
              </div>

              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-6 text-gray-900 border border-gray-100 shadow-sm group-hover/box:bg-[#00cc50] group-hover/box:text-white transition-all duration-300 relative z-10">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl lg:text-2xl font-extrabold text-gray-900 mb-3">Take Full Control</h3>
              <p className="text-sm text-gray-500 font-medium">Monitor chats, assign roles, and track performance instantly from one place.</p>
              
              {/* Step 3 Mockup */}
              <div className="relative w-full h-[180px] bg-gray-50/50 rounded-2xl mt-8 flex items-end justify-center overflow-hidden border border-gray-100 group-hover/box:shadow-inner transition-shadow">
                 <div className="absolute font-black text-[120px] text-gray-900/5 select-none -translate-y-4">03</div>
                 
                 {/* Multi-WhatsApp Dashboard Abstract */}
                 <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="relative z-10 w-[90%] h-[140px] bg-white rounded-t-xl shadow-2xl border-2 border-b-0 border-gray-100 flex overflow-hidden group-hover/box:-translate-y-2 transition-transform duration-500">
                   {/* Left Sidebar: Multiple accounts */}
                   <div className="w-[30%] h-full bg-gray-50 border-r border-gray-100 p-2 flex flex-col gap-2">
                     <div className="w-full h-8 bg-white rounded-lg border border-[#00cc50] flex items-center justify-center shadow-sm relative"><div className="w-5 h-5 rounded-full bg-[#00cc50]/20 flex items-center justify-center"><User className="w-3 h-3 text-[#00cc50]" /></div><div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#00cc50] rounded-full"></div></div>
                     <div className="w-full h-8 bg-transparent rounded-lg flex items-center justify-center opacity-60"><div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-3 h-3 text-gray-500" /></div></div>
                     <div className="w-full h-8 bg-transparent rounded-lg flex items-center justify-center opacity-60"><div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-3 h-3 text-gray-500" /></div></div>
                   </div>
                   {/* Right Area: Incoming Chats Flow */}
                   <div className="flex-1 p-2.5 flex flex-col gap-2 relative overflow-hidden bg-[#f8fcf9]">
                     <div className="w-16 h-1.5 bg-gray-200 rounded-full mb-1"></div>
                     <motion.div animate={{ x: [-120, 0], opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 4 }} className="w-full bg-white rounded-md p-2 shadow-sm border border-gray-100 flex items-center gap-2">
                       <div className="w-4 h-4 rounded-full bg-[#00cc50] shrink-0 shadow-[0_0_8px_rgba(0,204,80,0.5)]"></div>
                       <div className="w-full h-1.5 bg-gray-200 rounded-full"></div>
                     </motion.div>
                     <motion.div animate={{ x: [-120, 0], opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 4, delay: 1.5 }} className="w-full bg-white rounded-md p-2 shadow-sm border border-gray-100 flex items-center gap-2">
                       <div className="w-4 h-4 rounded-full bg-[#00cc50]/70 shrink-0"></div>
                       <div className="w-3/4 h-1.5 bg-gray-200 rounded-full"></div>
                     </motion.div>
                     <div className="w-full bg-white rounded-md p-2 shadow-sm border border-gray-100 flex items-center gap-2 opacity-50">
                       <div className="w-4 h-4 rounded-full bg-gray-300 shrink-0"></div>
                       <div className="w-1/2 h-1.5 bg-gray-200 rounded-full"></div>
                     </div>
                   </div>
                 </motion.div>
              </div>
           </motion.div>

        </div>
      </section>

    </main>
  );
}
