import React from "react";
import { UserProfile } from "../lib/services/authService";
import {
  FileText,
  UserPlus,
  CircleDollarSign,
  Receipt,
  GraduationCap,
  TrendingUp,
  BarChart3,
  Clock,
  LogOut,
  Search,
  ShieldCheck,
  Award
} from "lucide-react";

interface SidebarProps {
  userProfile: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSearchStudentId?: (id: string) => void;
}

export default function Sidebar({
  userProfile,
  activeTab,
  setActiveTab,
  onLogout,
  onSearchStudentId
}: SidebarProps) {
  const [searchId, setSearchId] = React.useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchStudentId && searchId.trim()) {
      onSearchStudentId(searchId.trim());
    }
  };

  const navItems = [
    { id: "inquiry", label: "New Inquiry", icon: FileText },
    { id: "exam-receipt", label: "Exam Receipt", icon: Receipt }
  ];

  const adminItems = [
    { id: "course-management", label: "Course Management", icon: "fa-graduation-cap" },
    { id: "profile-settings", label: "Profile Settings", icon: "fa-cog" }
  ];

  const analyticsItems = [
    { id: "fee-structure", label: "Fees Structure", icon: GraduationCap },
    { id: "admission-analytics", label: "Admission Structure", icon: TrendingUp },
    { id: "inquiry-analytics", label: "Inquiry Structure", icon: BarChart3 },
    { id: "due-fees", label: "Due Fees", icon: Clock }
  ];

  return (
    <aside className="fixed top-0 left-0 bg-slate-950 text-slate-100 w-64 hidden md:flex flex-col h-screen z-30 border-r border-slate-900 shadow-xl backdrop-blur-md glass-panel-dark gpu-accelerated">
      {/* Header */}
      <div className="px-6 py-6 border-b border-slate-900 bg-slate-950/20 flex flex-col items-center justify-center">
        <div className="mb-3 flex items-center justify-center">
          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
            <img src="/TrustCareLogo.avif" alt="TrustCare Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="text-center leading-tight">
          <span className="text-lg font-black tracking-tight text-slate-100 block">
            TRUSTCARE
          </span>
          <span className="text-xs text-slate-400 tracking-wider font-semibold block mt-0.5">
            INSTITUTE OF HEALTH SCIENCE
          </span>
        </div>
        <div className="mt-3 flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            {userProfile?.username || "Guest User"}
          </p>
          <div className="flex gap-1.5 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 capitalize">
              {userProfile?.role || ""}
            </span>

          </div>
        </div>
      </div>

      {/* Student ID Search */}
      {onSearchStudentId && (
        <div className="px-4 py-3 border-b border-slate-900">
          <form onSubmit={handleSearchSubmit} className="relative">
            <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Search Enrollment ID</label>
            <div className="relative">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl pl-3 pr-9 py-2 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                placeholder="e.g. TCHS001"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors">
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Main</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 focus:outline-none hover-lift border ${activeTab === item.id
                  ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border-teal-500/25"
                  : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border-transparent"
                  }`}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Admin Section */}
        {userProfile?.role === "admin" && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Admin</p>
            {adminItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none ${activeTab === item.id
                  ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border border-teal-500/20"
                  : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent"
                  }`}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <i className={`fas ${item.icon} text-sm`}></i>
                </div>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Analytics Section */}
        {userProfile?.role === "admin" && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Analytics (Admin)</p>
            {analyticsItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 focus:outline-none hover-lift border ${activeTab === item.id
                    ? "bg-gradient-to-r from-teal-500/10 to-indigo-500/5 text-teal-400 border-teal-500/25"
                    : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border-transparent"
                    }`}
                >
                  <div className="flex items-center justify-center w-5 h-5">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2">
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Tools (Admin)</p>
              <a
                href="/admin/certificate-builder"
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 focus:outline-none hover-lift border text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border-transparent`}
              >
                <div className="flex items-center justify-center w-5 h-5">
                  <Award className="h-4.5 w-4.5" />
                </div>
                <span>Builder</span>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-900/80 bg-slate-950/20">
        <button
          onClick={onLogout}
          className="group w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-rose-450 rounded-xl hover:bg-rose-500/10 hover:text-rose-350 transition-all duration-200 focus:outline-none border border-transparent hover:border-rose-500/10"
        >
          <div className="flex items-center justify-center w-5 h-5">
            <LogOut className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}