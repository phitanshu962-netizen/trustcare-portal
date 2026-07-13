"use client";

import React, { useState, useEffect } from "react";
import {
  seedDefaultUsers,
  loginUser,
  logoutUser,
  subscribeToAuth,
  UserProfile,
  loginWithGoogle
} from "../lib/services/authService";
import { InquiryData } from "../lib/services/inquiryService";
import { Lock, User, Loader2, LogOut, Menu, X, ReceiptIndianRupee, FileText, UserPlus, GraduationCap, TrendingUp, BarChart3, Clock, Award } from "lucide-react";
import { CircleIndianRupee } from "../components/CircleIndianRupee";

// UI Components
import Sidebar from "../components/Sidebar";
import InquiryView from "../components/InquiryView";
import AdmissionView from "../components/AdmissionView";
import PaymentView from "../components/PaymentView";
import ExamReceiptView from "../components/ExamReceiptView";
import AnalyticsView from "../components/AnalyticsView";
import CourseManagementView from "../components/CourseManagementView";
import ProfileSettings from "../components/ProfileSettings";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Dashboard routing states
  const [activeTab, setActiveTab] = useState("inquiry");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Flow/Context states
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryData | null>(null);

  const [paymentContext, setPaymentContext] = useState<{
    enrollmentId: string | null;
    studentName: string | null;
    courseName: string | null;
    totalFees: number | null;
    receiptNo: string | null;
    courseDuration: string | null;
    guardianName: string | null;
    guardianRelation: string | null;
  }>({
    enrollmentId: null,
    studentName: null,
    courseName: null,
    totalFees: null,
    receiptNo: null,
    courseDuration: null,
    guardianName: null,
    guardianRelation: null
  });

  // Login form inputs
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Listen to auth changes on mount
  useEffect(() => {
    async function init() {
      // Seed users in background (Commented out as database is already seeded and secure rules require authentication)
      // await seedDefaultUsers();

      // Subscribe to Firebase auth updates
      const unsubscribe = subscribeToAuth((user, profile) => {
        setUserProfile(profile);
        setAuthLoading(false);
      });

      return () => unsubscribe();
    }
    init();
  }, []);

  // Handle Sign In submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput) {
      setLoginError("Please enter both username and password.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");
    try {
      const profile = await loginUser(usernameInput.trim(), passwordInput);
      setUserProfile(profile);
      setShowLogin(false);
      setUsernameInput("");
      setPasswordInput("");
      setActiveTab("inquiry"); // Default starting tab
    } catch (error: any) {
      console.error("Login failure:", error);
      setLoginError(error.message || "Invalid username or password.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setLoginError("");
    try {
      const profile = await loginWithGoogle();
      setUserProfile(profile);
      setActiveTab("inquiry"); // Default starting tab
    } catch (error: any) {
      console.error("Google login failure:", error);
      setLoginError(error.message || "Failed to sign in with Google. Make sure it is enabled in your Firebase console.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUserProfile(null);
      setSelectedInquiry(null);
      setPaymentContext({
        enrollmentId: null,
        studentName: null,
        courseName: null,
        totalFees: null,
        receiptNo: null,
        courseDuration: null,
        guardianName: null,
        guardianRelation: null
      });
    } catch (error) {
      console.error("Logout failure:", error);
    }
  };

  // Navigations between tabs mapping dataflow
  const handleTakeAdmission = (inquiry: InquiryData) => {
    setSelectedInquiry(inquiry);
    setActiveTab("admission");
  };

  const handleAdmissionComplete = (
    enrollmentId: string,
    studentName: string,
    courseName: string,
    totalFees: number,
    branch: string,
    receiptNo: string,
    courseDuration?: string,
    guardianName?: string,
    guardianRelation?: string
  ) => {
    setPaymentContext({
      enrollmentId,
      studentName,
      courseName,
      totalFees,
      receiptNo,
      courseDuration: courseDuration ?? null,
      guardianName: guardianName ?? null,
      guardianRelation: guardianRelation ?? null
    });
    setActiveTab("payment");
  };

  const handleCoursePaymentRedirect = (
    enrollmentId: string,
    studentName: string,
    courseName: string,
    totalFees: number,
    branch: string,
    receiptNo?: string,
    courseDuration?: string,
    guardianName?: string,
    guardianRelation?: string
  ) => {
    setPaymentContext({
      enrollmentId,
      studentName,
      courseName,
      totalFees,
      receiptNo: receiptNo || "",
      courseDuration: courseDuration ?? null,
      guardianName: guardianName ?? null,
      guardianRelation: guardianRelation ?? null
    });
    setActiveTab("payment");
  };

  const handleGoBackFromAdmission = () => {
    setSelectedInquiry(null);
    setActiveTab("inquiry");
  };

  const handleGoBackFromPayment = () => {
    setPaymentContext({
      enrollmentId: null,
      studentName: null,
      courseName: null,
      totalFees: null,
      receiptNo: null,
      courseDuration: null,
      guardianName: null,
      guardianRelation: null
    });
    setActiveTab("admission");
  };

  const handleProceedToReceipt = (receiptNo: string, enrollmentId: string) => {
    // Navigate student back to inquiry form/dash after completion
    alert(`Payment configuration logged successfully! Student ID: ${enrollmentId}`);
    setActiveTab("inquiry");
  };

  const handleSearchStudentId = (id: string) => {
    setPaymentContext({
      enrollmentId: id,
      studentName: "",
      courseName: "",
      totalFees: null,
      receiptNo: "",
      courseDuration: null,
      guardianName: null,
      guardianRelation: null
    });
    setActiveTab("payment");
  };

  // Sidebar elements definition for mobile fallback renderer
  const navItems = [
    { id: "inquiry", label: "New Inquiry", icon: FileText },
    { id: "admission", label: "New Admission", icon: UserPlus },
    { id: "payment", label: "Course Payment", icon: CircleIndianRupee },
    { id: "exam-receipt", label: "Exam Receipt", icon: ReceiptIndianRupee }
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

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading TrustCare Portal...</span>
      </div>
    );
  }

  // DASHBOARD VIEW (Logged In)
  if (userProfile) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-x-hidden">

        {/* Sidebar Container */}
        <Sidebar
          userProfile={userProfile}
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }}
          onLogout={handleLogout}
          onSearchStudentId={handleSearchStudentId}
        />

        {/* Dashboard Main Workspace */}
        <div className="md:ml-64 flex flex-col min-h-screen w-auto max-w-full">

          {/* Mobile responsive navigation header */}
          <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-900 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white overflow-hidden shrink-0">
                <img
                  src="/TrustCareLogo.png"
                  alt="TrustCare Logo"
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-xs tracking-tight text-slate-100">TRUSTCARE</span>
                <span className="text-[8px] text-slate-500 tracking-wider font-semibold">INSTITUTE OF HEALTH & SCIENCE</span>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-slate-100 p-2 rounded-lg border border-slate-900 bg-slate-900/30 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </header>

          {/* Mobile Navigation Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-slate-950/95 border-b border-slate-900 py-4 px-6 flex flex-col gap-2 sticky top-[65px] z-20 backdrop-blur-md animate-slide-up">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Navigation</p>
              {navItems.map(item => {
                const MobileIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer ${activeTab === item.id
                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                      : "text-slate-400 hover:bg-slate-900/50"
                      }`}
                  >
                    <MobileIcon className="h-4.5 w-4.5 text-teal-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {userProfile.role === "admin" && (
                <>
                  <div className="border-t border-slate-900 my-2 pt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analytics Dashboard</div>
                  {analyticsItems.map(item => {
                    const MobileIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer ${activeTab === item.id
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          : "text-slate-400 hover:bg-slate-900/50"
                          }`}
                      >
                        <MobileIcon className="h-4.5 w-4.5 text-teal-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  <div className="border-t border-slate-900 my-2 pt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tools</div>
                  <a
                    href="/admin/certificate-builder"
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer text-slate-400 hover:bg-slate-900/50"
                  >
                    <Award className="h-4.5 w-4.5 text-teal-400" />
                    <span>Certificate Builder</span>
                  </a>
                </>
              )}

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2.5 border-t border-slate-900/60 mt-2 pt-3"
              >
                <i className="fas fa-sign-out-alt text-sm"></i>
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Tab Views Panel */}
          <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-full min-w-0 overflow-x-hidden">
            {activeTab === "inquiry" && (
              <InquiryView
                userProfile={userProfile}
                onTakeAdmission={handleTakeAdmission}
              />
            )}

            {activeTab === "admission" && (
              <AdmissionView
                userProfile={userProfile}
                inquiryData={selectedInquiry}
                onGoBack={handleGoBackFromAdmission}
                onAdmissionComplete={handleAdmissionComplete}
              />
            )}

            {activeTab === "payment" && (
              <PaymentView
                userProfile={userProfile}
                initialEnrollmentId={paymentContext.enrollmentId}
                initialStudentName={paymentContext.studentName}
                initialCourseName={paymentContext.courseName}
                initialTotalFees={paymentContext.totalFees}
                initialReceiptNo={paymentContext.receiptNo}
                initialCourseDuration={paymentContext.courseDuration ?? undefined}
                initialGuardianName={paymentContext.guardianName ?? undefined}
                initialGuardianRelation={paymentContext.guardianRelation ?? undefined}
                onGoBack={handleGoBackFromPayment}
                onProceedToReceipt={handleProceedToReceipt}
              />
            )}

            {activeTab === "exam-receipt" && (
              <ExamReceiptView
                userProfile={userProfile}
                onGoBack={() => setActiveTab("inquiry")}
              />
            )}

            {/* Admin Course Management */}
            {activeTab === "course-management" && userProfile.role === "admin" && (
              <CourseManagementView
                userProfile={userProfile}
              />
            )}

            {/* Profile Settings */}
            {activeTab === "profile-settings" && userProfile.role === "admin" && (
              <ProfileSettings
                userProfile={userProfile}
                onProfileUpdated={(updated) => setUserProfile(updated)}
              />
            )}

            {/* Admin Analytics Tab routers */}
            {["fee-structure", "admission-analytics", "inquiry-analytics", "due-fees"].includes(activeTab) && (
              <AnalyticsView
                userProfile={userProfile}
                activeTab={activeTab}
                onTakeAdmission={handleTakeAdmission}
                onCoursePayment={handleCoursePaymentRedirect}
              />
            )}
          </main>

        </div>
      </div>
    );
  }

  // PUBLIC DIRECT SIGN IN PAGE (Logged Out)
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-4">

      {/* Glow Backdrops */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden glass-panel animate-card-fade-in transition-all hover:shadow-teal-500/5">

        {/* Background blobs for card */}
        <div className="absolute top-0 right-0 -z-10 h-24 w-24 bg-teal-500/5 blur-xl rounded-full" />
        <div className="absolute bottom-0 left-0 -z-10 h-24 w-24 bg-indigo-500/5 blur-xl rounded-full" />

        {/* Logo and Titles */}
        <div className="text-center pb-4 mb-6 border-b border-slate-800/60">
          <div className="flex justify-center mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg overflow-hidden">
              <img
                src="/TrustCareLogo.png"
                alt="TrustCare Logo"
                className="h-14 w-14 object-contain"
              />
            </div>
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-100 leading-tight">
            TRUSTCARE INSTITUTE OF<br />HEALTH & SCIENCE
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">TrustCare Portal Access</p>
        </div>

        {loginError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-2.5">
            <svg className="h-4 w-4 shrink-0 text-rose-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <input
                type="text"
                id="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. admin or staff"
                className="w-full bg-slate-950/80 border border-slate-850 focus:border-teal-500/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors"
                required
              />
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pass" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type="password"
                id="pass"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter account password"
                className="w-full bg-slate-950/80 border border-slate-850 focus:border-teal-500/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors"
                required
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading || googleLoading}
            className="w-full mt-2 py-3 btn-primary text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl cursor-pointer"
          >
            {loginLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800/80"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
            <span className="bg-slate-950 px-3 text-slate-500">Or authenticate via</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loginLoading || googleLoading}
          className="w-full py-2.5 btn-google text-xs rounded-xl flex items-center justify-center gap-2.5 cursor-pointer"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
          )}
          <span>Sign In with Google</span>
        </button>

      </div>


    </div>
  );
}