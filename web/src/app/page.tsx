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
  CheckCheck,
  Send,
  Search,
  Sparkles,
  Phone,
  MoreVertical,
  Fingerprint,
  Server,
  Laptop,
  Lock,
  MousePointerClick,
  ChevronRight,
  Database,
  Smartphone,
  Star
} from "lucide-react";
import { AnimatedGradient } from "@/components/ui/animated-gradient";

// Clean Bento Box Base Class
const bentoBoxClass = "bg-white border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)] rounded-[2.5rem] cursor-pointer relative overflow-hidden group/box transition-all duration-500";

export default function Home() {
  const [activeTab, setActiveTab] = React.useState('Home');
  const [activeUseCase, setActiveUseCase] = React.useState(0);
  const hoverSpring = { type: "spring" as const, stiffness: 400, damping: 25 };

  // Interactive Support Mockup State
  const [activeSupportChat, setActiveSupportChat] = React.useState(0);
  const [supportInput, setSupportInput] = React.useState('');
  
  // Anti-Ban Tabs State
  const [activeBanTab, setActiveBanTab] = React.useState(0);

  // Pricing State
  const [isYearly, setIsYearly] = React.useState(false);

  const [supportChats, setSupportChats] = React.useState([
    {
      id: 0,
      name: "VIP Customer",
      status: "Online",
      messages: [
        { text: "My order #4092 hasn't arrived yet!", isAgent: false },
        { text: "Let me check that for you right now. Give me a second!", isAgent: true }
      ]
    },
    {
      id: 1,
      name: "Ahmed Tech Ltd",
      status: "Waiting (2m)",
      messages: [
        { text: "Do you have the Enterprise plan?", isAgent: false }
      ]
    },
    {
      id: 2,
      name: "Global Retail",
      status: "Typing...",
      messages: [
        { text: "Can we integrate with our custom CRM?", isAgent: false },
        { text: "Yes, we have an open API for that. I can send you the docs.", isAgent: true }
      ]
    }
  ]);

  const handleSupportSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim()) return;
    const newChats = [...supportChats];
    newChats[activeSupportChat].messages.push({ text: supportInput, isAgent: true });
    setSupportChats(newChats);
    setSupportInput('');
  };

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

      {/* CORE FEATURE SECTION (Data Flow Node) */}
      <section id="core-feature" className="relative w-full p-6 lg:p-8 pt-24 lg:pt-32 pb-64 z-10">
        
        {/* Subtle Premium Background for the Section */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(0,229,89,0.03)_0%,transparent_70%)]"></div>
           <div className="absolute bottom-[20%] left-[10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(0,204,80,0.03)_0%,transparent_70%)]"></div>
           {/* Very light dot pattern */}
           <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(#00E559 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 relative items-start z-10">
          
          {/* Left: Sticky Abstract Data Flow Node */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 self-start flex flex-col justify-center items-center lg:items-start text-center lg:text-left mb-16 lg:mb-0">
             <span className="inline-block px-4 py-2 rounded-full bg-[#00E559]/10 text-[#00993b] text-xs font-black tracking-widest uppercase mb-6 border border-[#00E559]/20">The Core Engine</span>
             <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6">Unlimited Scale.<br/><span className="text-[#00cc50]">Absolute Control.</span></h2>
             <p className="text-gray-500 font-medium text-base lg:text-lg max-w-md mb-10">Manage thousands of conversations across unlimited employee accounts simultaneously without dropping a single message.</p>
             
             {/* The Data Flow Node (Abstract SVG) */}
             <div className="relative w-full max-w-[350px] lg:max-w-[450px] aspect-square flex items-center justify-center mt-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,229,89,0.1)_0%,transparent_70%)] rounded-full pointer-events-none"></div>
                
                {/* Central Core */}
                <motion.div animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 20px rgba(0,229,89,0.2)", "0 0 40px rgba(0,229,89,0.4)", "0 0 20px rgba(0,229,89,0.2)"] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="absolute z-20 w-20 h-20 lg:w-28 lg:h-28 bg-white rounded-full border-4 border-[#00cc50] flex items-center justify-center">
                   <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#00cc50] rounded-full flex items-center justify-center shadow-inner">
                      <Zap className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                   </div>
                </motion.div>

                {/* SVG Connections - Optimized Scale (6 Nodes) + Data Packets */}
                <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full z-10 overflow-visible pointer-events-none">
                  {[
                    { path: "M200,200 Q100,50 50,100", cx: 50, cy: 100, r: 18, delay: 0, dur: 2 },
                    { path: "M200,200 Q350,100 320,50", cx: 320, cy: 50, r: 24, delay: 0.5, dur: 2.5, iconClass: "text-[#00cc50]", isMain: true },
                    { path: "M200,200 Q300,350 350,280", cx: 350, cy: 280, r: 20, delay: 1.2, dur: 1.8 },
                    { path: "M200,200 Q50,300 80,350", cx: 80, cy: 350, r: 16, delay: 0.8, dur: 2.2 },
                    { path: "M200,200 Q120,30 180,40", cx: 180, cy: 40, r: 14, delay: 1.5, dur: 2 },
                    { path: "M200,200 Q150,380 200,350", cx: 200, cy: 350, r: 22, delay: 0.7, dur: 2.1, iconClass: "text-[#00cc50]" }
                  ].map((node, i) => (
                    <g key={i}>
                      {/* Faint static path */}
                      <path d={node.path} fill="none" stroke="#00cc50" strokeWidth="1.5" strokeOpacity="0.15" strokeDasharray="4 4" />
                      {/* Green glowing line filling up */}
                      <motion.path d={node.path} fill="none" stroke="#00E559" strokeWidth="2.5" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: node.dur, delay: node.delay, ease: "linear" }} />
                      {/* Animated Data Packets (Moving dots along the path) */}
                      <motion.path d={node.path} fill="none" stroke="#00cc50" strokeWidth="4" strokeDasharray="1 40" strokeDashoffset="40" animate={{ strokeDashoffset: 0 }} transition={{ repeat: Infinity, duration: node.dur * 0.8, delay: node.delay, ease: "linear" }} strokeLinecap="round" />
                      
                      <circle cx={node.cx} cy={node.cy} r={node.r} fill="white" stroke="#00cc50" strokeWidth="2" className={node.isMain ? "shadow-sm" : ""} />
                      <foreignObject x={node.cx - (node.r * 0.7)} y={node.cy - (node.r * 0.7)} width={node.r * 1.4} height={node.r * 1.4}>
                         <User className={`w-full h-full ${node.iconClass || "text-gray-400"}`} />
                      </foreignObject>
                    </g>
                  ))}
                </svg>
             </div>
          </div>

          {/* Right: Scrolling Bento Boxes */}
          <div className="lg:col-span-7 flex flex-col gap-6 lg:gap-8 pb-10">
             
             {/* Feature Box 1 */}
             <motion.div initial={{ opacity: 0, y: 100 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7 }} className={`${bentoBoxClass} p-8 lg:p-14`}>
               {/* Idea A: Holographic Rings (Optimized SVG) */}
               <div className="absolute top-0 right-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-700">
                  <svg viewBox="0 0 400 400" className="absolute -right-20 -top-20 w-96 h-96 opacity-50">
                     <motion.circle cx="200" cy="200" r="180" fill="none" stroke="#00E559" strokeWidth="2" strokeDasharray="20 10" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 30, ease: "linear" }} className="origin-center" />
                     <motion.circle cx="200" cy="200" r="140" fill="none" stroke="#00cc50" strokeWidth="4" strokeDasharray="30 20" animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="origin-center" />
                     <motion.circle cx="200" cy="200" r="100" fill="none" stroke="#00E559" strokeWidth="1" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 15, ease: "linear" }} className="origin-center" />
                  </svg>
               </div>

               <div className="relative z-10">
                 <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-6 text-blue-500 border border-blue-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                   <Globe className="w-6 h-6" />
                 </div>
                 <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Unlimited Numbers</h3>
                 <p className="text-base lg:text-lg text-gray-500 font-medium leading-relaxed mb-10">Connect as many WhatsApp accounts as your team needs. There are no limits to how many employees you can monitor from your master dashboard.</p>
                 
                 {/* Network Hub Mockup (Optimized & Cleaned) */}
                 <div className="w-full h-48 bg-white rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex items-center justify-center overflow-hidden relative">
                   <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
                     <path d="M100,100 L30,40" stroke="#00cc50" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                     <path d="M100,100 L170,40" stroke="#00cc50" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                     <path d="M100,100 L50,160" stroke="#00cc50" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                     <path d="M100,100 L150,160" stroke="#00cc50" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                   </svg>
                   <div className="relative z-10 w-16 h-16 bg-[#00E559] rounded-full shadow-[0_0_20px_rgba(0,229,89,0.3)] flex items-center justify-center text-white border-4 border-white">
                      <Zap className="w-8 h-8" />
                   </div>
                   <motion.div animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-[15%] left-[15%] w-12 h-12 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center"><User className="w-6 h-6 text-gray-400" /></motion.div>
                   <motion.div animate={{ y: [3, -3, 3] }} transition={{ repeat: Infinity, duration: 3.5 }} className="absolute top-[15%] right-[15%] w-14 h-14 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center"><User className="w-7 h-7 text-[#00cc50]" /></motion.div>
                   <motion.div animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 4.5 }} className="absolute bottom-[15%] left-[25%] w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></motion.div>
                   <motion.div animate={{ y: [3, -3, 3] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute bottom-[15%] right-[25%] w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></motion.div>
                 </div>
               </div>
             </motion.div>

             {/* Feature Box 2 */}
             <motion.div initial={{ opacity: 0, y: 100 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7 }} className={`${bentoBoxClass} p-8 lg:p-14`}>
               {/* Idea B: Clean Glowing Orbs (Optimized Background) */}
               <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
                  <div className="absolute right-0 top-10 w-64 h-64 bg-[radial-gradient(circle,rgba(0,229,89,0.15)_0%,transparent_70%)]"></div>
                  <div className="absolute -left-10 bottom-10 w-80 h-80 bg-[radial-gradient(circle,rgba(0,204,80,0.1)_0%,transparent_70%)]"></div>
               </div>

               <div className="relative z-10">
                 <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mb-6 text-purple-500 border border-purple-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                   <CheckCheck className="w-6 h-6" />
                 </div>
                 <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Real-Time Sync</h3>
                 <p className="text-base lg:text-lg text-gray-500 font-medium leading-relaxed mb-10">Messages, media, and statuses are synced instantly across all connected devices. Never miss a single interaction.</p>
                 
                 {/* Radial Gauge Mockup (Optimized & Fixed 100%) */}
                 <div className="w-full h-48 bg-white rounded-2xl border border-gray-100 pt-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col items-center justify-end relative overflow-hidden">
                   
                   <div className="relative w-[200px] h-[100px] mt-auto flex justify-center">
                      <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                        {/* Background Track */}
                        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f3f4f6" strokeWidth="8" strokeLinecap="round" />
                        {/* Active Track */}
                        <motion.path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#00cc50" strokeWidth="8" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} />
                      </svg>
                      {/* Text in center */}
                      <div className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-end pb-1">
                        <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">100%</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Synced</span>
                      </div>
                   </div>
                   
                   {/* Floating Checkmarks */}
                   <motion.div animate={{ y: [-4, 4, -4], rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-6 left-6 w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center"><CheckCheck className="w-5 h-5 text-[#00cc50]" /></motion.div>
                   <motion.div animate={{ y: [4, -4, 4], rotate: [5, -5, 5] }} transition={{ repeat: Infinity, duration: 3.5 }} className="absolute top-10 right-8 w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center"><Zap className="w-5 h-5 text-purple-500" /></motion.div>
                 </div>
               </div>
             </motion.div>

             {/* Feature Box 3 */}
             <motion.div initial={{ opacity: 0, y: 100 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7 }} className={`${bentoBoxClass} p-8 lg:p-14`}>
               {/* Idea C: Glowing Geometric Network (Optimized Background) */}
               <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-700">
                  <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] border border-[#00E559]/20 rounded-full"></div>
                  <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] border border-[#00E559]/10 rounded-full"></div>
                  <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(0,229,89,0.1)_0%,transparent_70%)]"></div>
               </div>

               <div className="relative z-10">
                 <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6 text-orange-500 border border-orange-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                   <Activity className="w-6 h-6" />
                 </div>
                 <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Centralized Insights</h3>
                 <p className="text-base lg:text-lg text-gray-500 font-medium leading-relaxed mb-10">Generate powerful reports on employee performance, average response times, and total message volumes across all branches.</p>
                 
                 {/* Employee Performance Mockup */}
                 <div className="w-full h-auto min-h-[14rem] bg-white rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] relative overflow-hidden flex flex-col p-4 lg:p-6">
                   
                   {/* Header */}
                   <div className="flex items-center justify-between mb-5 relative z-10">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-[#00E559]/10 flex items-center justify-center text-[#00cc50]">
                         <TrendingUp className="w-5 h-5" />
                       </div>
                       <div>
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Team Efficiency</div>
                         <div className="text-lg font-black text-gray-900 leading-none">+42.5%</div>
                       </div>
                     </div>
                     <div className="text-[10px] font-bold text-[#00cc50] bg-[#00E559]/10 px-2 py-1 rounded-md border border-[#00E559]/20 hidden sm:block">Last 30 Days</div>
                   </div>

                   {/* Background Decor */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle,rgba(0,229,89,0.05)_0%,transparent_70%)] pointer-events-none"></div>

                   {/* Employee List */}
                   <div className="flex flex-col gap-4 relative z-10">
                     {[
                       { name: "Ahmed Y.", role: "Sales Rep", before: 40, after: 95 },
                       { name: "Sarah M.", role: "Support", before: 60, after: 100 },
                       { name: "Omar K.", role: "Marketing", before: 30, after: 85 },
                     ].map((emp, i) => (
                       <div key={i} className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden group/emp">
                            <User className="w-4 h-4 text-gray-400 group-hover/emp:scale-110 transition-transform" />
                         </div>
                         <div className="flex-1">
                           <div className="flex justify-between items-end mb-1.5">
                             <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-gray-900">{emp.name}</span>
                                <span className="text-[10px] font-bold text-gray-400 hidden sm:inline">{emp.role}</span>
                             </div>
                             <span className="text-xs font-bold text-[#00cc50]">{emp.after}%</span>
                           </div>
                           {/* Progress Bar Container */}
                           <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden relative">
                              {/* Before indicator (grey/transparent) */}
                              <div className="absolute top-0 left-0 h-full bg-gray-200" style={{ width: `${emp.before}%` }}></div>
                              {/* After indicator (green animated) */}
                              <motion.div initial={{ width: `${emp.before}%` }} whileInView={{ width: `${emp.after}%` }} transition={{ duration: 1.5, delay: 0.2 + (i * 0.15), ease: "easeOut" }} className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00cc50] to-[#00E559] relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-full animate-[shimmer_2s_infinite]"></div>
                              </motion.div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>

                 </div>
               </div>
             </motion.div>

          </div>
        </div>
      </section>

      {/* TARGET AUDIENCE SECTION (For Who - Sticky Stacking) */}
      <section id="for-who" className="relative w-full pb-32 z-10">
         <div className="w-full mx-auto flex flex-col pt-24 lg:pt-32 px-6 lg:px-12 xl:px-20 relative">
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8 }}
               className="text-center mb-16 lg:mb-24 relative"
            >
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-[radial-gradient(circle,rgba(0,229,89,0.1)_0%,transparent_60%)] pointer-events-none blur-3xl"></div>
               <span className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00E559]/10 text-[#00993b] text-xs font-black tracking-widest uppercase mb-6 border border-[#00E559]/20 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E559] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00cc50]"></span>
                  </span>
                  Who is Whatsi for?
                  <Sparkles className="w-3 h-3 ml-1 text-[#00cc50]" />
               </span>
               <h2 className="relative text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">Built for teams that <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00cc50] to-[#00E559]">demand more.</span></h2>
               <p className="relative text-gray-500 font-medium text-base lg:text-lg max-w-2xl mx-auto">Whether you are closing deals, resolving tickets, or managing franchises, Whatsi adapts to your exact workflow.</p>
            </motion.div>

            {/* Stacking Cards Container */}
            <div className="relative w-full flex flex-col pb-32">
               
               {/* Card 1: Sales */}
               <div className="sticky top-24 w-full min-h-[65vh] bg-white rounded-[3rem] p-8 lg:p-16 border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row gap-12 lg:gap-20 overflow-hidden z-10 mb-8 transition-shadow duration-500 hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)]" style={{ top: '100px' }}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(0,229,89,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                  
                  {/* Content */}
                  <div className="w-full lg:w-1/3 flex flex-col justify-center relative z-10">
                     <div className="w-14 h-14 rounded-2xl bg-[#00E559]/10 border border-[#00E559]/20 flex items-center justify-center text-[#00cc50] mb-8 shadow-sm">
                        <TrendingUp className="w-7 h-7" />
                     </div>
                     <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Sales Teams</h3>
                     <p className="text-gray-500 font-medium text-lg mb-8 leading-relaxed">Turn every conversation into a closed deal. Track pipeline value, monitor agent performance, and never miss a follow-up.</p>
                     <ul className="space-y-4">
                        {['Shared Team Inbox', 'Live Pipeline Value', 'Agent Analytics'].map((item, i) => (
                           <li key={i} className="flex items-center gap-3 text-gray-700 font-bold text-sm"><div className="w-5 h-5 rounded-full bg-[#00cc50] flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div> {item}</li>
                        ))}
                     </ul>
                  </div>

                  {/* Mockup */}
                  <div className="w-full lg:w-2/3 bg-gray-50/50 rounded-[2rem] border border-gray-100 p-8 lg:p-10 flex flex-col lg:flex-row gap-6 lg:gap-8 relative z-10 shadow-inner overflow-hidden">
                     <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                           <div className="flex justify-between items-end mb-4">
                              <div><h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Pipeline Revenue</h4><div className="text-3xl font-black text-gray-900">$2.4M</div></div>
                              <span className="flex items-center gap-1 text-sm font-bold text-[#00cc50] bg-[#00E559]/10 px-2 py-1 rounded-md"><ArrowUpRight className="w-4 h-4"/> 14%</span>
                           </div>
                           <div className="flex items-end gap-2 h-24">
                              {[30, 45, 25, 60, 40, 80, 65].map((h, i) => (
                                 <div key={i} className="flex-1 bg-gray-100 rounded-t-md relative group"><div className="absolute bottom-0 left-0 w-full bg-[#00cc50] rounded-t-md transition-all duration-700 group-hover:bg-[#00993b]" style={{ height: `${h}%` }}></div></div>
                              ))}
                           </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1">
                           <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Active Deals</h4>
                           <div className="space-y-3">
                              {[{name: "TechVision Inc.", val: "$14k"}, {name: "Global Retail", val: "$8k"}].map((deal, i) => (
                                 <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-gray-50 hover:bg-[#00E559]/5 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><User className="w-4 h-4" /></div><span className="font-bold text-gray-900">{deal.name}</span></div>
                                    <span className="font-black text-[#00cc50]">{deal.val}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                     <div className="w-full lg:w-1/3 flex flex-col gap-4">
                        <div className="bg-gradient-to-br from-[#00cc50] to-[#00E559] p-5 rounded-2xl shadow-md text-white">
                           <TrendingUp className="w-6 h-6 mb-3 text-white/80" />
                           <div className="text-4xl font-black mb-1">92%</div>
                           <div className="text-xs font-bold text-white/80 uppercase tracking-widest">Close Rate</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1 flex items-center justify-center relative overflow-hidden">
                           <div className="absolute w-full h-full border-[15px] border-[#00E559]/10 rounded-full scale-150"></div>
                           <div className="absolute w-full h-full border-[15px] border-[#00cc50] rounded-full scale-150 border-l-transparent border-t-transparent rotate-45"></div>
                           <div className="text-center relative z-10">
                              <div className="text-3xl font-black text-gray-900">4.2h</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Avg Response</div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Card 2: Customer Support */}
               <div className="sticky top-24 w-full min-h-[65vh] bg-white rounded-[3rem] p-8 lg:p-16 border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row gap-12 lg:gap-20 overflow-hidden z-20 mb-8 transition-shadow duration-500 hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)]" style={{ top: '140px' }}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                  
                  {/* Content */}
                  <div className="w-full lg:w-1/3 flex flex-col justify-center relative z-10">
                     <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 mb-8 shadow-sm">
                        <MessageCircle className="w-7 h-7" />
                     </div>
                     <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Customer Support</h3>
                     <p className="text-gray-500 font-medium text-lg mb-8 leading-relaxed">Resolve tickets instantly. Route chats to the right agent, use quick replies, and keep customers happy without device drops.</p>
                     <ul className="space-y-4">
                        {['Smart Chat Routing', 'Quick Reply Templates', 'Customer Context'].map((item, i) => (
                           <li key={i} className="flex items-center gap-3 text-gray-700 font-bold text-sm"><div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div> {item}</li>
                        ))}
                     </ul>
                  </div>

                  {/* Mockup */}
                  <div className="w-full lg:w-2/3 bg-gray-50/50 rounded-[2rem] border border-gray-100 flex overflow-hidden shadow-inner relative z-10 h-[450px]">
                     {/* Left Sidebar */}
                     <div className="w-1/3 bg-white border-r border-gray-100 flex flex-col">
                        <div className="p-4 border-b border-gray-50">
                           <div className="bg-gray-100 rounded-full h-8 w-full flex items-center px-3 gap-2">
                              <Search className="w-4 h-4 text-gray-400" />
                              <input type="text" placeholder="Search chats..." className="bg-transparent border-none outline-none text-xs w-full text-gray-700" />
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                           {supportChats.map((chat, i) => (
                              <div key={chat.id} onClick={() => setActiveSupportChat(i)} className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${activeSupportChat === i ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                                 <div className="w-10 h-10 rounded-full bg-blue-100 shrink-0 relative flex items-center justify-center text-blue-500 font-bold text-sm">
                                    {chat.name.charAt(0)}
                                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${i === 0 ? 'bg-[#00cc50]' : i === 1 ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                                 </div>
                                 <div className="flex-1 overflow-hidden">
                                    <div className="font-bold text-gray-900 text-sm truncate">{chat.name}</div>
                                    <div className={`text-xs truncate ${activeSupportChat === i ? 'text-blue-600' : 'text-gray-500'}`}>{chat.messages[chat.messages.length - 1]?.text || '...'}</div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                     {/* Chat Area */}
                     <div className="flex-1 bg-[#f8fcf9] flex flex-col relative">
                        <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold text-xs">{supportChats[activeSupportChat].name.charAt(0)}</div>
                              <div>
                                 <div className="font-bold text-gray-900 text-sm">{supportChats[activeSupportChat].name}</div>
                                 <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">{supportChats[activeSupportChat].status}</div>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-center text-gray-400"><Phone className="w-4 h-4"/></div>
                              <div className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-center text-gray-400"><MoreVertical className="w-4 h-4"/></div>
                           </div>
                        </div>
                        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                           {supportChats[activeSupportChat].messages.map((msg, idx) => (
                              <div key={idx} className={`max-w-[80%] ${msg.isAgent ? 'self-end bg-blue-500 text-white rounded-2xl rounded-br-none shadow-sm' : 'self-start bg-white border border-gray-200 text-gray-700 rounded-2xl rounded-bl-none shadow-sm'} p-3 text-sm font-medium`}>
                                 {msg.text}
                              </div>
                           ))}
                           {supportChats[activeSupportChat].status === 'Typing...' && (
                              <div className="self-start bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                                 <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full"></motion.div>
                                 <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full"></motion.div>
                                 <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full"></motion.div>
                              </div>
                           )}
                        </div>
                        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                           <form onSubmit={handleSupportSend} className="w-full bg-gray-50 rounded-xl border border-gray-200 flex items-center px-3 py-2">
                              <input 
                                 type="text" 
                                 value={supportInput}
                                 onChange={(e) => setSupportInput(e.target.value)}
                                 placeholder="Type a message..." 
                                 className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700"
                              />
                              <button type="submit" disabled={!supportInput.trim()} className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center disabled:opacity-50 transition-opacity ml-2 hover:bg-blue-600">
                                 <Send className="w-4 h-4" />
                              </button>
                           </form>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Card 3: Marketing & Outreach */}
               <div className="sticky top-24 w-full min-h-[65vh] bg-white rounded-[3rem] p-8 lg:p-16 border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row gap-12 lg:gap-20 overflow-hidden z-30 mb-8 transition-shadow duration-500 hover:shadow-[0_20px_80px_rgba(0,0,0,0.08)]" style={{ top: '180px' }}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(236,72,153,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                  
                  {/* Content */}
                  <div className="w-full lg:w-1/3 flex flex-col justify-center relative z-10">
                     <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 mb-8 shadow-sm">
                        <Globe className="w-7 h-7" />
                     </div>
                     <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Marketing & Outreach</h3>
                     <p className="text-gray-500 font-medium text-lg mb-8 leading-relaxed">Broadcast campaigns to thousands effortlessly. Target specific segments and analyze open rates in real-time.</p>
                     <ul className="space-y-4">
                        {['Bulk Broadcasting', 'Smart Segmentation', 'Real-time Analytics'].map((item, i) => (
                           <li key={i} className="flex items-center gap-3 text-gray-700 font-bold text-sm"><div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div> {item}</li>
                        ))}
                     </ul>
                  </div>

                  {/* Mockup */}
                  <div className="w-full lg:w-2/3 bg-gray-50/50 rounded-[2rem] border border-gray-100 p-10 lg:p-14 flex flex-col relative z-10 shadow-inner overflow-hidden justify-center">
                     
                     {/* Top Stat row */}
                     <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center"><div className="text-2xl font-black text-gray-900">45k</div><div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Target Audience</div></div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center"><div className="text-2xl font-black text-pink-500">82%</div><div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Open Rate</div></div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center"><div className="text-2xl font-black text-gray-900">14%</div><div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Click Rate</div></div>
                     </div>

                     {/* Main Progress Area */}
                     <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle,rgba(236,72,153,0.1)_0%,transparent_70%)] pointer-events-none"></div>
                        <div className="flex justify-between items-end mb-4 relative z-10">
                           <div>
                              <h4 className="font-extrabold text-lg text-gray-900">Black Friday Promo</h4>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Status: Sending...</p>
                           </div>
                           <div className="text-3xl font-black text-pink-500">75%</div>
                        </div>
                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden relative z-10 mb-6">
                           <motion.div initial={{ width: 0 }} whileInView={{ width: '75%' }} transition={{ duration: 2 }} className="h-full bg-gradient-to-r from-pink-400 to-pink-500 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-full animate-[shimmer_2s_infinite]"></div>
                           </motion.div>
                        </div>

                        {/* Audience Tags */}
                        <div className="flex flex-wrap gap-2 relative z-10">
                           <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">VIP Customers</span>
                           <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">Abandoned Cart</span>
                           <span className="px-3 py-1.5 bg-pink-50 text-pink-600 border border-pink-100 rounded-lg text-xs font-bold flex items-center gap-1"><Zap className="w-3 h-3"/> High Intent</span>
                        </div>
                     </div>

                  </div>
               </div>

               {/* Card 4: Enterprise */}
               <div className="sticky top-24 w-full min-h-[65vh] bg-white rounded-[3rem] p-8 lg:p-16 border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] flex flex-col lg:flex-row gap-12 lg:gap-20 overflow-hidden z-40" style={{ top: '220px' }}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(168,85,247,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                  
                  {/* Content */}
                  <div className="w-full lg:w-1/3 flex flex-col justify-center relative z-10">
                     <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500 mb-8 shadow-sm">
                        <Activity className="w-7 h-7" />
                     </div>
                     <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Enterprises & Franchises</h3>
                     <p className="text-gray-500 font-medium text-lg mb-8 leading-relaxed">A central command center for multi-branch operations. Monitor everything from one dashboard with zero delays.</p>
                     <ul className="space-y-4">
                        {['Global HQ Dashboard', 'Multi-Branch Sync', 'Unlimited Scaling'].map((item, i) => (
                           <li key={i} className="flex items-center gap-3 text-gray-700 font-bold text-sm"><div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white"><CheckCircle2 className="w-3 h-3" /></div> {item}</li>
                        ))}
                     </ul>
                  </div>

                  {/* Mockup */}
                  <div className="w-full lg:w-2/3 bg-gray-50/50 rounded-[2rem] border border-gray-100 p-10 lg:p-14 flex flex-col relative z-10 shadow-inner overflow-hidden justify-center items-center">
                     
                     <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-6 relative">
                        <div className="flex items-center justify-between mb-8">
                           <div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">HQ Command Center</div>
                              <h3 className="font-extrabold text-xl text-gray-900">Network Health</h3>
                           </div>
                           <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center">
                              <Globe className="w-5 h-5 text-purple-500" />
                           </div>
                        </div>

                        <div className="space-y-5">
                           {[
                              { city: "New York Hub", status: "Active", load: 88, color: "#a855f7" },
                              { city: "London Hub", status: "Active", load: 65, color: "#a855f7" },
                              { city: "Tokyo Hub", status: "Syncing", load: 40, color: "#fbbf24" }
                           ].map((branch, i) => (
                              <div key={i} className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <span className="relative flex h-3 w-3">
                                      {branch.status === 'Active' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>}
                                      <span className={`relative inline-flex rounded-full h-3 w-3 ${branch.status === 'Active' ? 'bg-purple-500' : 'bg-yellow-400'}`}></span>
                                    </span>
                                    <span className="font-bold text-gray-700 text-sm">{branch.city}</span>
                                 </div>
                                 <div className="flex items-center gap-3 w-1/2">
                                    <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                       <motion.div initial={{ width: 0 }} whileInView={{ width: `${branch.load}%` }} transition={{ duration: 1, delay: i * 0.2 }} className="h-full" style={{ backgroundColor: branch.color }}></motion.div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 w-8">{branch.load}%</span>
                                 </div>
                              </div>
                           ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                           <div>
                              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Connections</div>
                              <div className="text-2xl font-black text-gray-900">14,290</div>
                           </div>
                           <div>
                              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">System Uptime</div>
                              <div className="text-2xl font-black text-[#00cc50]">99.99%</div>
                           </div>
                        </div>

                     </div>

                  </div>
               </div>

            </div>

         </div>
      </section>

      {/* ANTI-BAN SECTION */}
      <section className="relative w-full min-h-screen py-24 flex items-center overflow-hidden z-10 border-t border-gray-100">
         
         <div className="w-full mx-auto px-6 lg:px-12 xl:px-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[800px]">
            
            {/* --- LEFT SIDE (5 COLUMNS) --- */}
            <div className="lg:col-span-5 flex flex-col gap-6 h-full">
               
               {/* Box 1: Heading Box */}
               <div className={`p-8 lg:p-10 ${bentoBoxClass} flex flex-col justify-center`}>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-gray-600 text-xs font-black tracking-widest uppercase mb-4 border border-gray-200 shadow-sm w-max">
                     <ShieldCheck className="w-4 h-4 text-[#00cc50]" />
                     100% Ban Protection
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                     Engineered to be <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00cc50] to-[#00E559]">Undetectable.</span>
                  </h2>
               </div>

               {/* Box 2: Interactive Tabs Box */}
               <div className={`p-8 lg:p-10 flex-1 ${bentoBoxClass} flex flex-col justify-center`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00cc50] uppercase tracking-widest mb-6 animate-pulse">
                     <MousePointerClick className="w-4 h-4" />
                     Click any feature to explore
                  </div>
                  <div className="flex flex-col gap-4">
                     {[
                        {
                           title: "Complete Isolation",
                           desc: "Every WhatsApp account runs in its own private, isolated space. It's like buying a brand new phone for every number.",
                           icon: <Server className="w-6 h-6" />
                        },
                        {
                           title: "Device Disguise",
                           desc: "We disguise every session to look like a completely different device. WhatsApp never sees that they are all coming from one place.",
                           icon: <Fingerprint className="w-6 h-6" />
                        },
                        {
                           title: "Human-Like Sending",
                           desc: "No robotic sending. We add smart, random delays and 'typing' indicators so it looks exactly like a real person operating the phone.",
                           icon: <User className="w-6 h-6" />
                        },
                        {
                           title: "Safe Connection",
                           desc: "We never use hacked or risky third-party tools. We connect your numbers using standard, safe methods that WhatsApp trusts.",
                           icon: <Laptop className="w-6 h-6" />
                        }
                     ].map((tab, idx) => (
                        <div 
                           key={idx} 
                           onClick={() => setActiveBanTab(idx)}
                           className={`group/tab flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${activeBanTab === idx ? 'bg-[#00E559]/5 border-[#00E559]/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50'}`}
                        >
                           <div className="flex gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${activeBanTab === idx ? 'bg-white text-[#00cc50] shadow-sm border border-gray-100' : 'bg-gray-50 text-gray-400 border border-transparent group-hover/tab:text-gray-600'}`}>
                                 {tab.icon}
                              </div>
                              <div className="flex flex-col justify-center">
                                 <h4 className={`text-base font-bold mb-0.5 transition-colors ${activeBanTab === idx ? 'text-[#00cc50]' : 'text-gray-900'}`}>{tab.title}</h4>
                                 {activeBanTab === idx && (
                                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-gray-500 text-sm font-medium leading-relaxed max-w-[280px] mt-1">
                                       {tab.desc}
                                    </motion.p>
                                 )}
                              </div>
                           </div>
                           <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${activeBanTab === idx ? 'text-[#00cc50] translate-x-1' : 'text-gray-300 group-hover/tab:translate-x-1'}`} />
                        </div>
                     ))}
                  </div>
               </div>
               
            </div>

            {/* --- RIGHT SIDE (7 COLUMNS) --- */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 lg:grid-rows-2 gap-6 h-full">
               
               {/* Box 3: Dynamic Mockup Box (Tall) */}
               <div className={`md:col-span-2 lg:col-span-4 lg:row-span-2 p-10 overflow-hidden bg-gray-50/50 flex flex-col justify-center items-center ${bentoBoxClass}`}>
                  <div className="relative w-full h-full min-h-[500px] flex items-center justify-center perspective-[2000px] transform-style-3d">
                     {/* Tab 0 Visual: Isolation (Massive Servers) */}
                     {activeBanTab === 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center justify-center gap-4 w-full max-w-md">
                           {[1, 2, 3].map((server) => (
                              <div key={server} className={`relative w-full p-6 bg-white rounded-3xl border border-gray-200 shadow-xl flex items-center gap-6 ${server !== 2 ? 'opacity-80 scale-95' : 'z-10'}`}>
                                 {server === 2 && <div className="absolute -top-3 -right-3 bg-green-100 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200 animate-pulse">Running</div>}
                                 <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                    <Database className={`w-8 h-8 ${server === 2 ? 'text-[#00cc50]' : 'text-gray-400'}`} />
                                 </div>
                                 <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                       <div className="text-lg font-bold text-gray-900">Isolated Instance {server}</div>
                                       <span className={`w-2 h-2 rounded-full ${server === 2 ? 'bg-[#00cc50] animate-ping' : 'bg-gray-300'}`}></span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                                       <motion.div className={`h-full ${server === 2 ? 'bg-[#00cc50]' : 'bg-gray-300'}`} initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2 + server, repeat: Infinity }} />
                                    </div>
                                    <div className="flex justify-between items-center">
                                       <div className="text-[10px] text-gray-400 font-mono">192.168.1.{server}0</div>
                                       <div className="text-[10px] text-gray-400 font-mono">Clean IP</div>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </motion.div>
                     )}

                     {/* Tab 1 Visual: Device Disguise */}
                     {activeBanTab === 1 && (
                        <motion.div initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ type: "spring", stiffness: 100 }} className="flex flex-col items-center justify-center w-full max-w-md">
                           <div className="relative w-64 h-64 mb-8">
                              <motion.div animate={{ opacity: [1, 0, 1], scale: [1, 0.9, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 bg-white rounded-full border border-gray-200 shadow-2xl flex items-center justify-center z-20">
                                 <Laptop className="w-24 h-24 text-gray-800" />
                              </motion.div>
                              <motion.div animate={{ opacity: [0, 1, 0], scale: [0.9, 1, 0.9] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute inset-0 bg-[#00cc50] rounded-full border border-green-400 shadow-2xl flex items-center justify-center z-10">
                                 <Smartphone className="w-24 h-24 text-white" />
                              </motion.div>
                           </div>
                           <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg w-full relative">
                              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Active Spoofed Fingerprint</div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <div className="text-[10px] text-gray-400 mb-1">Operating System</div>
                                    <div className="relative h-6">
                                       <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 text-sm font-mono font-bold text-gray-900">macOS 14.2</motion.div>
                                       <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }} className="absolute inset-0 text-sm font-mono font-bold text-[#00cc50]">iOS 17.1</motion.div>
                                    </div>
                                 </div>
                                 <div>
                                    <div className="text-[10px] text-gray-400 mb-1">Browser Engine</div>
                                    <div className="relative h-6">
                                       <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 text-sm font-mono font-bold text-gray-900">Chrome v120</motion.div>
                                       <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }} className="absolute inset-0 text-sm font-mono font-bold text-[#00cc50]">Safari WebKit</motion.div>
                                    </div>
                                 </div>
                                 <div>
                                    <div className="text-[10px] text-gray-400 mb-1">Screen Resolution</div>
                                    <div className="relative h-6">
                                       <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 text-sm font-mono font-bold text-gray-900">2560x1600</motion.div>
                                       <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }} className="absolute inset-0 text-sm font-mono font-bold text-[#00cc50]">430x932</motion.div>
                                    </div>
                                 </div>
                                 <div>
                                    <div className="text-[10px] text-gray-400 mb-1">Canvas Hash</div>
                                    <div className="relative h-6">
                                       <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 text-sm font-mono font-bold text-gray-900">A8F92B1C</motion.div>
                                       <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }} className="absolute inset-0 text-sm font-mono font-bold text-[#00cc50]">D3E10F4A</motion.div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </motion.div>
                     )}

                     {/* Tab 2 Visual: Human-Like Sending */}
                     {activeBanTab === 2 && (
                        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col w-full h-[500px] max-w-[320px] bg-white rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative">
                           {/* Phone Header */}
                           <div className="bg-gray-50 p-4 pt-8 border-b border-gray-200 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-5 h-5 text-gray-500"/></div>
                              <div>
                                 <div className="font-bold text-gray-900">John Doe</div>
                                 <div className="text-[10px] text-[#00cc50] font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#00cc50]"></span> Online
                                 </div>
                              </div>
                           </div>
                           
                           {/* Chat Body */}
                           <div className="flex-1 p-4 flex flex-col gap-4 bg-[#efeae2]">
                              <div className="bg-white p-3 rounded-2xl rounded-tl-none self-start max-w-[85%] text-gray-800 text-sm shadow-sm">
                                 Hi there! Do you have any offers today?
                                 <div className="text-[9px] text-gray-400 mt-1 text-right">10:41 AM</div>
                              </div>
                              <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none self-end max-w-[85%] text-gray-800 text-sm shadow-sm relative">
                                 Hello John! Yes we do. Let me send you our latest catalog.
                                 <div className="text-[9px] text-gray-500 mt-1 text-right flex items-center justify-end gap-1">
                                    10:42 AM <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                                 </div>
                              </div>
                              
                              <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none self-end flex items-center gap-1.5 shadow-sm mt-4">
                                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                 <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                              </div>
                           </div>

                           {/* Human Delay Overlay */}
                           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white/90 backdrop-blur p-4 rounded-3xl shadow-2xl border border-[#00cc50]/20 flex flex-col items-center">
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Human Delay Engine Active</div>
                              <div className="text-xl font-mono font-black text-[#00cc50] mb-3">2.4<span className="text-sm">s</span></div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                 <motion.div className="h-full bg-[#00cc50]" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2.4, repeat: Infinity }} />
                              </div>
                           </div>
                        </motion.div>
                     )}

                     {/* Tab 3 Visual: Safe Connection */}
                     {activeBanTab === 3 && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center relative w-full h-full">
                           <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,229,89,0.1)_0%,transparent_70%)] animate-pulse rounded-full blur-3xl"></div>
                           
                           <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
                              
                              <div className="flex items-center justify-between w-full">
                                 <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl border border-gray-200 flex items-center justify-center mb-2 relative">
                                       <Server className="w-10 h-10 text-gray-800" />
                                       <span className="absolute -top-2 -right-2 flex h-4 w-4">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                                       </span>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500">Your CRM</div>
                                 </div>

                                 <div className="flex-1 flex items-center justify-center relative h-20">
                                    <div className="absolute w-full h-1 bg-gray-200 rounded-full"></div>
                                    <motion.div className="absolute h-2 bg-[#00cc50] rounded-full" initial={{ width: "0%", left: 0 }} animate={{ width: ["0%", "100%", "0%"], left: ["0%", "0%", "100%"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                                    <div className="absolute bg-white px-3 py-1 rounded-full border border-[#00cc50] text-[10px] font-bold text-[#00cc50] shadow-sm">Encrypted</div>
                                 </div>

                                 <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl border border-gray-200 flex items-center justify-center mb-2 relative">
                                       <MessageCircle className="w-10 h-10 text-[#00cc50]" />
                                       <span className="absolute -bottom-2 -left-2 flex h-4 w-4">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                                       </span>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500">WhatsApp Network</div>
                                 </div>
                              </div>

                              <div className="bg-white p-6 rounded-3xl shadow-2xl border-2 border-[#00cc50] flex flex-col items-center text-center w-full relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00cc50] to-transparent"></div>
                                 <ShieldCheck className="w-16 h-16 text-[#00cc50] mb-4" />
                                 <div className="text-xl font-black text-gray-900 mb-1">Official Web Socket</div>
                                 <div className="text-sm text-gray-500 font-medium">Bypassing unofficial APIs entirely.</div>
                              </div>

                           </div>
                        </motion.div>
                     )}
                  </div>
               </div>

               {/* Box 4: "Zero Risk" Stat Box (Square) */}
               <div className={`md:col-span-1 lg:col-span-3 lg:row-span-1 p-8 flex flex-col items-center justify-center text-center ${bentoBoxClass}`}>
                  <div className="relative w-36 h-36 mb-6 flex items-center justify-center group-hover/box:scale-105 transition-transform duration-500">
                     <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                        <motion.circle cx="50" cy="50" r="45" fill="none" stroke="#00cc50" strokeWidth="6" strokeDasharray="283" initial={{ strokeDashoffset: 283 }} whileInView={{ strokeDashoffset: 0 }} transition={{ duration: 2, ease: "easeOut" }} viewport={{ once: true }} strokeLinecap="round" />
                     </svg>
                     <span className="text-5xl font-black text-gray-900">0<span className="text-2xl text-gray-400">%</span></span>
                  </div>
                  <h4 className="text-xl font-black text-gray-900 mb-2">Account Ban Rate</h4>
                  <div className="flex gap-1 mb-2">
                     {[1,2,3,4,5].map(i => <div key={i} className="w-8 h-2 rounded-full bg-[#00cc50]"></div>)}
                  </div>
                  <p className="text-sm text-gray-500 font-medium">100% clean track record across all our instances.</p>
               </div>

               {/* Box 5: "Native Web" Box (Square) */}
               <div className={`md:col-span-1 lg:col-span-3 lg:row-span-1 p-8 flex flex-col justify-center bg-gradient-to-br from-white to-[#00cc50]/5 ${bentoBoxClass}`}>
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-16 h-16 rounded-2xl bg-white border border-green-100 shadow-[0_10px_30px_rgba(0,229,89,0.15)] flex items-center justify-center relative group-hover/box:rotate-12 transition-transform duration-500 shrink-0">
                        <Lock className="w-8 h-8 text-[#00cc50]" />
                        <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
                        </span>
                     </div>
                     <div>
                        <h4 className="text-lg font-black text-gray-900 leading-tight">Official<br/>Architecture</h4>
                     </div>
                  </div>
                  <ul className="space-y-3">
                     <li className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <CheckCircle2 className="w-5 h-5 text-[#00cc50]" /> Verified Webhooks
                     </li>
                     <li className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <CheckCircle2 className="w-5 h-5 text-[#00cc50]" /> Real Browser Engine
                     </li>
                     <li className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <CheckCircle2 className="w-5 h-5 text-[#00cc50]" /> E2E Encrypted
                     </li>
                  </ul>
               </div>
               
            </div>

         </div>
      </section>

      {/* REVIEWS SECTION (Sticky Background + Glassy Cards) */}
      <section className="relative w-full bg-transparent">
         {/* The Sticky Background Layer */}
         <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden">
               <h2 className="text-[18vw] font-black text-[#00cc50]/40 tracking-tighter" style={{ textShadow: '0 0 100px rgba(0, 204, 80, 0.4)' }}>
                  Reviews
               </h2>
            </div>
         </div>

         {/* The Scrolling Glassy Cards Layer */}
         <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-32 flex flex-col gap-40 md:gap-56 overflow-visible">
            
            {/* Spacer so cards start below the fold when you first reach the section */}
            <div className="w-full h-[60vh]"></div>

            {/* Review 1 */}
            <div className="w-full flex justify-start">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 -rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "We've been using WhatsiPro for our 5 sales agents for 3 months now. Before this, we got banned twice using unofficial APIs. Since switching, zero bans and the connection is flawless."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        MA
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Mahmoud Adel</div>
                        <div className="text-sm text-gray-600">E-commerce Store Owner</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 2 */}
            <div className="w-full flex justify-end">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "The multi-agent feature saved our customer support. We had 10 people sharing one phone which was a nightmare. Now everyone logs in from their own laptop and handles chats efficiently."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        SR
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Sarah Radwan</div>
                        <div className="text-sm text-gray-600">Customer Support Manager</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 3 */}
            <div className="w-full flex justify-start pl-[5%]">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 -rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "I was skeptical about the 0% ban rate claim, but looking at their architecture, they literally orchestrate real browser instances for each number. It's brilliant and incredibly stable."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        AH
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Ahmed Hassan</div>
                        <div className="text-sm text-gray-600">Technical Lead</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 4 */}
            <div className="w-full flex justify-end pr-[10%]">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "Integrating the API was a breeze. We connected our own custom CRM in less than a day. The webhooks are fast and reliable. Highly recommended for developers."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        KO
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Kareem Osama</div>
                        <div className="text-sm text-gray-600">Software Engineer</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 5 */}
            <div className="w-full flex justify-start pl-[15%]">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 rotate-1 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "WhatsiPro's support team is out of this world. Whenever we had a question about scaling our message limits, they replied in minutes with perfect guidance."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        NM
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Nour Mostafa</div>
                        <div className="text-sm text-gray-600">Operations Director</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 6 */}
            <div className="w-full flex justify-end">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 -rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "The best unofficial-official WhatsApp solution ever. It gives us the safety of official APIs but the freedom and lack of restrictions of the native web app."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        YF
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Youssef Fathy</div>
                        <div className="text-sm text-gray-600">Marketing Head</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 7 */}
            <div className="w-full flex justify-start">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 -rotate-1 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "I can't believe how easy the setup was. We were up and running in less than an hour. The dashboard is intuitive and gives us all the metrics we need."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        OA
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Omar Ali</div>
                        <div className="text-sm text-gray-600">Startup Founder</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 8 */}
            <div className="w-full flex justify-end pr-[5%]">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "Our team's productivity skyrocketed. Being able to assign chats and add internal notes without the customer knowing is an absolute game-changer for our sales pipeline."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        DK
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Dina Kamel</div>
                        <div className="text-sm text-gray-600">Sales Director</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 9 */}
            <div className="w-full flex justify-start pl-[12%]">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 rotate-1 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "WhatsiPro completely transformed how we handle booking inquiries. No more missed messages, and the webhook integration with our booking system is flawless."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        HS
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Hany Samir</div>
                        <div className="text-sm text-gray-600">Travel Agency CEO</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review 10 */}
            <div className="w-full flex justify-end">
               <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-lg hover:bg-white/60 -rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-500 shadow-xl">
                  <div className="flex gap-1 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-6">
                     "Finally a service that delivers exactly what it promises. We process over 10k messages daily through WhatsiPro and it hasn't skipped a beat once."
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-white/80 border border-white overflow-hidden flex items-center justify-center font-bold text-gray-700">
                        MN
                     </div>
                     <div>
                        <div className="font-bold text-gray-900">Mona Nabil</div>
                        <div className="text-sm text-gray-600">Customer Success Lead</div>
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </section>

      {/* PRICING SECTION */}
      <section className="relative w-full py-32 bg-transparent overflow-hidden">
         {/* Minimal Floating Background Icons (Only 3) */}
         <div className="absolute inset-0 pointer-events-none">
            <Star className="absolute top-[15%] right-[10%] w-16 h-16 text-[#00cc50]/10 rotate-12" />
            <Zap className="absolute bottom-[25%] left-[8%] w-24 h-24 text-[#00cc50]/10 -rotate-12" />
            <Globe className="absolute top-[50%] right-[5%] w-12 h-12 text-[#00cc50]/10 -rotate-[20deg]" />
         </div>

         <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
               <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
                  Simple, transparent pricing
               </h2>
               <p className="text-gray-500 text-lg font-medium mb-10">
                  Choose the perfect plan for your business needs. No hidden fees.
               </p>
               
               {/* Modern Billing Switcher */}
               <div className="flex justify-center mb-8">
                  <div className="relative flex items-center bg-gray-100 p-1.5 rounded-full border border-gray-200/60 shadow-inner">
                     {/* Sliding background */}
                     <div 
                        className="absolute top-1.5 bottom-1.5 w-[140px] bg-white rounded-full shadow-sm border border-gray-200/50 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)"
                        style={{ left: isYearly ? '146px' : '6px' }}
                     />
                     <button 
                        onClick={() => setIsYearly(false)}
                        className={`relative z-10 w-[140px] h-11 text-sm font-bold rounded-full transition-colors duration-300 ${!isYearly ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                     >
                        Monthly
                     </button>
                     <button 
                        onClick={() => setIsYearly(true)}
                        className={`relative z-10 w-[140px] h-11 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-colors duration-300 ${isYearly ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                     >
                        Yearly <span className="bg-[#00cc50]/15 text-[#00cc50] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Save 20%</span>
                     </button>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
               
               {/* Free Plan */}
               <div className="group relative h-full rounded-[2rem] overflow-hidden p-[3px] shadow-sm hover:shadow-2xl transition-all duration-500">
                  {/* Default static border */}
                  <div className="absolute inset-0 bg-gray-200 group-hover:opacity-0 transition-opacity duration-500" />
                  {/* Spinning gradient */}
                  <div className="absolute -inset-[150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#00cc50_50%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Inner Content */}
                  <div className="relative z-10 h-full flex flex-col bg-white rounded-[calc(2rem-3px)] p-10">
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
                     <p className="text-gray-500 text-sm font-medium mb-8 min-h-[56px]">
                        Perfect for individuals and early-stage projects.
                     </p>
                     <div className="mb-10 flex items-end gap-1">
                        <span className="text-6xl font-black text-gray-900 tracking-tighter">$0</span>
                        <span className="text-gray-500 text-sm font-bold mb-2 uppercase tracking-wide">/ mo</span>
                     </div>
                     <button className="w-full bg-white text-gray-900 border-2 border-gray-200 font-bold py-4 rounded-full mb-12 hover:border-[#00cc50] hover:text-[#00cc50] hover:shadow-[0_8px_20px_rgba(0,204,80,0.12)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300">
                        Get started
                     </button>
                     <ul className="flex flex-col gap-4 mt-auto">
                        {[
                           "1 WhatsApp Number",
                           "100 Messages per day",
                           "Basic Webhook integration",
                           "Community Support",
                           "WhatsiPro watermark included"
                        ].map((feature, i) => (
                           <li key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-[#00cc50]/80 flex-shrink-0 mt-0.5" />
                              {feature}
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>

               {/* Premium Plan */}
               <div className="group relative h-full rounded-[2.5rem] overflow-hidden p-[3px] md:-mt-8 md:-mb-8 z-10 shadow-xl hover:shadow-[0_30px_80px_rgba(0,204,80,0.2)] transition-all duration-500">
                  {/* Default static border */}
                  <div className="absolute inset-0 bg-[#00cc50] group-hover:opacity-0 transition-opacity duration-500" />
                  {/* Spinning gradient */}
                  <div className="absolute -inset-[150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#33ff77_50%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Inner Content */}
                  <div className="relative z-10 h-full flex flex-col bg-white rounded-[calc(2.5rem-3px)] p-12">
                     <div className="absolute top-8 right-8 bg-[#00cc50]/10 text-[#00cc50] px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-[#00cc50]/20">
                        Popular
                     </div>
                     <h3 className="text-xl font-bold text-[#00cc50] mb-2">Premium</h3>
                     <p className="text-gray-500 text-sm font-medium mb-8 min-h-[56px] pr-12">
                        Best for teams that need branding, collaboration, and flexibility.
                     </p>
                     <div className="mb-10 flex items-end gap-1">
                        <span className="text-6xl font-black text-gray-900 tracking-tighter">${isYearly ? '9' : '12'}</span>
                        <span className="text-gray-500 text-sm font-bold mb-2 uppercase tracking-wide">/ mo</span>
                     </div>
                     <button className="w-full bg-[#00cc50] text-white font-bold py-4 rounded-full mb-12 shadow-md hover:bg-[#00b347] hover:shadow-[0_15px_30px_-5px_rgba(0,204,80,0.4)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300">
                        Upgrade to premium
                     </button>
                     <ul className="flex flex-col gap-4 mt-auto">
                        {[
                           "5 WhatsApp Numbers",
                           "Unlimited Messages",
                           "Advanced API & Webhooks",
                           "Multi-agent Dashboard",
                           "Priority Support"
                        ].map((feature, i) => (
                           <li key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-[#00cc50] flex-shrink-0 mt-0.5" />
                              <span className="text-gray-800 font-semibold">{feature}</span>
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>

               {/* Enterprise Plan */}
               <div className="group relative h-full rounded-[2rem] overflow-hidden p-[3px] shadow-sm hover:shadow-2xl transition-all duration-500">
                  {/* Default static border */}
                  <div className="absolute inset-0 bg-gray-200 group-hover:opacity-0 transition-opacity duration-500" />
                  {/* Spinning gradient */}
                  <div className="absolute -inset-[150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#00cc50_50%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Inner Content */}
                  <div className="relative z-10 h-full flex flex-col bg-white rounded-[calc(2rem-3px)] p-10">
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
                     <p className="text-gray-500 text-sm font-medium mb-8 min-h-[56px]">
                        For client-facing teams, agencies, and advanced reporting needs.
                     </p>
                     <div className="mb-10 flex items-end gap-1">
                        <span className="text-6xl font-black text-gray-900 tracking-tighter">${isYearly ? '29' : '39'}</span>
                        <span className="text-gray-500 text-sm font-bold mb-2 uppercase tracking-wide">/ mo</span>
                     </div>
                     <button className="w-full bg-white text-gray-900 border-2 border-gray-200 font-bold py-4 rounded-full mb-12 hover:border-[#00cc50] hover:text-[#00cc50] hover:shadow-[0_8px_20px_rgba(0,204,80,0.12)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300">
                        Upgrade to enterprise
                     </button>
                     <ul className="flex flex-col gap-4 mt-auto">
                        {[
                           "Everything in Premium, plus:",
                           "Unlimited WhatsApp Numbers",
                           "Dedicated Server IP",
                           "SAML SSO & Role Permissions",
                           "White-label Dashboard",
                           "24/7 Dedicated Account Manager"
                        ].map((feature, i) => (
                           <li key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-[#00cc50]/80 flex-shrink-0 mt-0.5" />
                              <span className={i === 0 ? "font-bold text-gray-900" : ""}>{feature}</span>
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>

            </div>
         </div>
      </section>

    </main>
  );
}
