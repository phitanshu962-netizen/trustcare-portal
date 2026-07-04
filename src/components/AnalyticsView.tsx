import React, { useState, useEffect, useMemo } from "react";
import { UserProfile } from "../lib/services/authService";
import { getFeeStructureData } from "../lib/services/paymentService";
import { getAdmissionAnalytics, AdmissionData, deleteAdmission } from "../lib/services/admissionService";
import { getInquiryAnalytics, InquiryData, deleteInquiry } from "../lib/services/inquiryService";
import { 
  GraduationCap, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  List, 
  IndianRupee, 
  CheckCircle2, 
  UserCheck, 
  Calendar, 
  CalendarDays, 
  CalendarRange, 
  Copy, 
  FileSpreadsheet, 
  Plus, 
  CircleDollarSign, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  Trash2
} from "lucide-react";

interface AnalyticsViewProps {
  userProfile: UserProfile | null;
  activeTab: string; // "fee-structure" | "admission-analytics" | "inquiry-analytics" | "due-fees"
  onTakeAdmission: (inquiry: InquiryData) => void;
  onCoursePayment: (enrollmentId: string, studentName: string, courseName: string, totalFees: number, branch: string) => void;
}

export default function AnalyticsView({
  userProfile,
  activeTab,
  onTakeAdmission,
  onCoursePayment
}: AnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionData[]>([]);
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  
  // Common Filter / Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("");
  const [timePeriodFilter, setTimePeriodFilter] = useState(""); // For admissions
  const [dateFrom, setDateFrom] = useState(""); // For inquiries
  const [dateTo, setDateTo] = useState(""); // For inquiries
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Sorting
  const [sortColumn, setSortColumn] = useState("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Load data based on tab selection
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setCurrentPage(1);
      setSearchQuery("");
      setBranchFilter("");
      setCourseFilter("");
      setPaymentModeFilter("");
      setTimePeriodFilter("");
      setDateFrom("");
      setDateTo("");
      
      try {
        if (activeTab === "fee-structure" || activeTab === "due-fees") {
          const res = await getFeeStructureData();
          setFeeStructures(res.data || []);
        } else if (activeTab === "admission-analytics") {
          const res = await getAdmissionAnalytics();
          setAdmissions(res.data || []);
        } else if (activeTab === "inquiry-analytics") {
          const res = await getInquiryAnalytics();
          setInquiries(res.data || []);
        }
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTab]);

  // List of unique branches for filters
  const uniqueBranches = useMemo(() => {
    if (activeTab === "fee-structure" || activeTab === "due-fees") {
      return Array.from(new Set(feeStructures.map(f => f.branch).filter(Boolean)));
    } else if (activeTab === "admission-analytics") {
      return Array.from(new Set(admissions.map(a => a.branch).filter(Boolean)));
    } else if (activeTab === "inquiry-analytics") {
      return Array.from(new Set(inquiries.map(i => i.branch).filter(Boolean)));
    }
    return [];
  }, [activeTab, feeStructures, admissions, inquiries]);

  // List of unique courses for filters
  const uniqueCourses = useMemo(() => {
    if (activeTab === "fee-structure" || activeTab === "due-fees") {
      return Array.from(new Set(feeStructures.map(f => f.courseName).filter(Boolean)));
    } else if (activeTab === "admission-analytics") {
      return Array.from(new Set(admissions.map(a => a.courseName).filter(Boolean)));
    } else if (activeTab === "inquiry-analytics") {
      return Array.from(new Set(inquiries.map(i => i.interestedCourse).filter(Boolean)));
    }
    return [];
  }, [activeTab, feeStructures, admissions, inquiries]);

  // Sort helper
  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnName);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // Filtered & Sorted datasets
  const processedData = useMemo(() => {
    if (activeTab === "fee-structure") {
      let filtered = [...feeStructures];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(f => 
          (f.name || "").toLowerCase().includes(q) || 
          (f.enrollmentId || "").toLowerCase().includes(q)
        );
      }
      if (branchFilter) filtered = filtered.filter(f => f.branch === branchFilter);
      if (courseFilter) filtered = filtered.filter(f => f.courseName === courseFilter);
      if (paymentModeFilter) filtered = filtered.filter(f => f.paymentMode === paymentModeFilter);
      
      // Sort
      filtered.sort((a, b) => {
        let valA = a[sortColumn] || "";
        let valB = b[sortColumn] || "";
        if (typeof valA === "object" && valA.seconds) valA = valA.seconds;
        if (typeof valB === "object" && valB.seconds) valB = valB.seconds;
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
      return filtered;
    }
    
    if (activeTab === "due-fees") {
      // Show fee structures where totalAmountDue > 0
      let filtered = feeStructures.filter(f => (f.totalAmountDue || 0) > 0);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(f => 
          (f.name || "").toLowerCase().includes(q) || 
          (f.enrollmentId || "").toLowerCase().includes(q)
        );
      }
      if (branchFilter) filtered = filtered.filter(f => f.branch === branchFilter);
      if (courseFilter) filtered = filtered.filter(f => f.courseName === courseFilter);
      
      // Sort
      filtered.sort((a, b) => {
        const valA = a[sortColumn] ?? 0;
        const valB = b[sortColumn] ?? 0;
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
      return filtered;
    }
    
    if (activeTab === "admission-analytics") {
      let filtered = [...admissions];
      
      // Course filter
      if (courseFilter) filtered = filtered.filter(a => a.courseName === courseFilter);
      
      // Time Period
      if (timePeriodFilter) {
        const now = new Date();
        
        filtered = filtered.filter(a => {
          if (!a.date) return false;
          const recDate = new Date(a.date);
          if (isNaN(recDate.getTime())) return false;
          
          if (timePeriodFilter === "today") {
            return recDate.toDateString() === new Date().toDateString();
          }
          if (timePeriodFilter === "thisWeek") {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return recDate >= oneWeekAgo;
          }
          if (timePeriodFilter === "thisMonth") {
            return recDate.getMonth() === new Date().getMonth() && recDate.getFullYear() === new Date().getFullYear();
          }
          return true;
        });
      }
      
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(a => 
          (a.studentName || "").toLowerCase().includes(q) || 
          (a.enrollmentId || "").toLowerCase().includes(q) ||
          (a.receiptNumber || "").toLowerCase().includes(q)
        );
      }
      if (branchFilter) filtered = filtered.filter(a => a.branch === branchFilter);
      
      // Sort
      filtered.sort((a, b) => {
        let valA = (a as any)[sortColumn] || "";
        let valB = (b as any)[sortColumn] || "";
        if (typeof valA === "object" && valA.seconds) valA = valA.seconds;
        if (typeof valB === "object" && valB.seconds) valB = valB.seconds;
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
      return filtered;
    }
    
    if (activeTab === "inquiry-analytics") {
      let filtered = [...inquiries];
      
      // Course
      if (courseFilter) filtered = filtered.filter(i => i.interestedCourse === courseFilter);
      
      // Phone/Aadhaar/Name Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(i => 
          (i.fullName || "").toLowerCase().includes(q) || 
          (i.phoneNo || "").includes(q) || 
          (i.aadharNumber || "").includes(q)
        );
      }
      
      // Branch
      if (branchFilter) filtered = filtered.filter(i => i.branch === branchFilter);
      
      // Date from
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filtered = filtered.filter(i => {
          if (!i.date) return false;
          return new Date(i.date) >= fromDate;
        });
      }
      // Date to
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1); // inclusive
        filtered = filtered.filter(i => {
          if (!i.date) return false;
          return new Date(i.date) < toDate;
        });
      }
      
      // Sort
      filtered.sort((a, b) => {
        let valA = (a as any)[sortColumn] || "";
        let valB = (b as any)[sortColumn] || "";
        if (typeof valA === "object" && valA.seconds) valA = valA.seconds;
        if (typeof valB === "object" && valB.seconds) valB = valB.seconds;
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
      return filtered;
    }
    
    return [];
  }, [activeTab, feeStructures, admissions, inquiries, searchQuery, branchFilter, courseFilter, paymentModeFilter, timePeriodFilter, dateFrom, dateTo, sortColumn, sortDirection]);

  // Aggregate metrics summaries based on tab
  const summaries = useMemo(() => {
    const data = processedData;
    if (activeTab === "fee-structure") {
      const totalRecords = data.length;
      let totalFeesCollected = 0;
      let totalDue = 0;
      data.forEach(item => {
        const admissionPaid = (item.admissionFee || 0) - (item.admissionFeeDue || 0);
        const coursePaid = (item.courseFee || 0) - (item.courseFeeDue || 0);
        const examPaid = (item.examFee || 0) - (item.examFeeDue || 0);
        totalFeesCollected += Math.max(0, admissionPaid) + Math.max(0, coursePaid) + Math.max(0, examPaid);
        totalDue += (item.totalAmountDue || 0);
      });
      return {
        cards: [
          { label: "Total Records", value: totalRecords.toLocaleString(), icon: List, color: "text-blue-400 bg-blue-500/10 border-blue-500/10" },
          { label: "Total Fees Collected", value: "₹" + totalFeesCollected.toLocaleString(), icon: IndianRupee, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/10" },
          { label: "Due Total Fees", value: "₹" + totalDue.toLocaleString(), icon: Clock, color: "text-rose-450 bg-rose-500/10 border-rose-500/10" }
        ]
      };
    }
    
    if (activeTab === "due-fees") {
      let totalFees = 0;
      let totalDue = 0;
      feeStructures.forEach(item => {
        totalFees += (item.admissionFee || 0) + (item.courseFee || 0) + (item.examFee || 0);
        totalDue += (item.totalAmountDue || 0);
      });
      const totalPaid = totalFees - totalDue;
      const fullyPaidCount = feeStructures.filter(f => (f.totalAmountDue || 0) === 0).length;
      return {
        cards: [
          { label: "Total Fees Setup", value: "₹" + totalFees.toLocaleString(), icon: GraduationCap, color: "text-blue-400 bg-blue-500/10 border-blue-500/10" },
          { label: "Total Paid", value: "₹" + totalPaid.toLocaleString(), icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/10" },
          { label: "Total Outstanding Due", value: "₹" + totalDue.toLocaleString(), icon: AlertCircle, color: "text-rose-450 bg-rose-500/10 border-rose-500/10" },
          { label: "Fully Paid Students", value: fullyPaidCount.toString(), icon: UserCheck, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/10" }
        ]
      };
    }
    
    if (activeTab === "admission-analytics" || activeTab === "inquiry-analytics") {
      const now = new Date();
      const todayStr = now.toDateString();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const records = activeTab === "admission-analytics" ? admissions : inquiries;
      
      let todayCount = 0;
      let weekCount = 0;
      let monthCount = 0;
      
      records.forEach((r: any) => {
        if (!r.date) return;
        const d = new Date(r.date);
        if (isNaN(d.getTime())) return;
        
        if (d.toDateString() === todayStr) todayCount++;
        if (d >= oneWeekAgo) weekCount++;
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) monthCount++;
      });
      
      return {
        cards: [
          { label: "Admissions This Month", labelInq: "Inquiries This Month", value: monthCount.toString(), icon: Calendar, color: "text-blue-400 bg-blue-500/10 border-blue-500/10" },
          { label: "Admissions This Week", labelInq: "Inquiries This Week", value: weekCount.toString(), icon: CalendarDays, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/10" },
          { label: "Admissions Today", labelInq: "Inquiries Today", value: todayCount.toString(), icon: CalendarRange, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/10" }
        ]
      };
    }
    
    return { cards: [] };
  }, [activeTab, processedData, feeStructures, admissions, inquiries]);

  // Pagination bounds
  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Export CSV helper
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    const filename = `${activeTab}_export_${Date.now()}.csv`;
    
    if (activeTab === "fee-structure") {
      headers = ["Enrollment ID", "Name", "Course Name", "Payment Mode", "Admission Fee", "Admission Due", "Course Fee", "Course Due", "Exam Fee", "Exam Due", "Total Due", "Branch", "User Name"];
      rows = processedData.map(f => [
        f.enrollmentId || "",
        f.name || "",
        f.courseName || "",
        f.paymentMode || "",
        f.admissionFee || 0,
        f.admissionFeeDue || 0,
        f.courseFee || 0,
        f.courseFeeDue || 0,
        f.examFee || 0,
        f.examFeeDue || 0,
        f.totalAmountDue || 0,
        f.branch || "",
        f.userName || ""
      ]);
    } else if (activeTab === "due-fees") {
      headers = ["Enrollment ID", "Name", "Course Name", "Branch", "Total Due"];
      rows = processedData.map(f => [
        f.enrollmentId || "",
        f.name || "",
        f.courseName || "",
        f.branch || "",
        f.totalAmountDue || 0
      ]);
    } else if (activeTab === "admission-analytics") {
      headers = ["Timestamp", "Receipt Number", "Enrollment ID", "Student Name", "Course Name", "Duration", "Total Fees", "Admission Fee", "Branch", "User"];
      rows = processedData.map(a => [
        a.date || "",
        a.receiptNumber || "",
        a.enrollmentId || "",
        a.studentName || "",
        a.courseName || "",
        a.courseDuration || "",
        a.totalCourseFees || 0,
        a.admissionFee || 0,
        a.branch || "",
        a.user || ""
      ]);
    } else if (activeTab === "inquiry-analytics") {
      headers = ["Date", "Aadhaar", "Full Name", "Qualification", "Phone", "WhatsApp", "Parents Number", "Course", "Branch", "Taken By", "Admission Status"];
      rows = processedData.map(i => [
        i.date || "",
        i.aadharNumber || "",
        i.fullName || "",
        i.qualification || "",
        i.phoneNo || "",
        i.whatsappNo || "",
        i.parentsNo || "",
        i.interestedCourse || "",
        i.branch || "",
        i.inquiryTakenBy || "",
        i.admissionStatus || "Not Admitted"
      ]);
    }
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyClipboard = () => {
    let text = "";
    if (activeTab === "fee-structure") {
      text = feeStructures.map(f => `${f.enrollmentId}\t${f.name}\t${f.courseName}\t${f.totalAmountDue}\t${f.branch}`).join("\n");
    } else if (activeTab === "due-fees") {
      text = processedData.map(f => `${f.enrollmentId}\t${f.name}\t${f.courseName}\t${f.totalAmountDue}\t${f.branch}`).join("\n");
    } else if (activeTab === "admission-analytics") {
      text = admissions.map(a => `${a.enrollmentId}\t${a.studentName}\t${a.courseName}\t${a.branch}`).join("\n");
    } else if (activeTab === "inquiry-analytics") {
      text = inquiries.map(i => `${i.fullName}\t${i.phoneNo}\t${i.interestedCourse}\t${i.branch}`).join("\n");
    }
    navigator.clipboard.writeText(text);
    alert("Data copied to clipboard (tab-separated format)!");
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setBranchFilter("");
    setCourseFilter("");
    setPaymentModeFilter("");
    setTimePeriodFilter("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const ActiveHeaderIcon = 
    activeTab === "fee-structure" ? GraduationCap :
    activeTab === "due-fees" ? Clock :
    activeTab === "admission-analytics" ? TrendingUp :
    BarChart3;

  return (
    <div className="relative w-full bg-slate-900/40 border border-slate-900/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4 glass-panel gpu-accelerated">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

      {/* Header */}
      <div className="border-b border-slate-900 pb-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <ActiveHeaderIcon className="h-7 w-7 text-teal-400" />
            {activeTab === "fee-structure" && "FEES STRUCTURE MASTER"}
            {activeTab === "due-fees" && "OUTSTANDING DUE FEES"}
            {activeTab === "admission-analytics" && "ADMISSION ANALYTICS"}
            {activeTab === "inquiry-analytics" && "INQUIRY ANALYTICS"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            {activeTab === "fee-structure" && "Track and manage student enrollment and fee balance collections"}
            {activeTab === "due-fees" && "List students with remaining balances on accounts"}
            {activeTab === "admission-analytics" && "Inspect admissions logs, trace branch allocations, and trigger course payments"}
            {activeTab === "inquiry-analytics" && "Review trainee registrations and take admissions directly"}
          </p>
        </div>
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-350 hover:text-slate-100 rounded-xl border border-slate-805 transition-colors text-xs font-semibold cursor-pointer hover-lift"
        >
          Reset Filters
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {summaries.cards.map((c, i) => {
          const CardIcon = c.icon;
          return (
            <div key={i} className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 flex items-center gap-4 hover-lift border-slate-900">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.color}`}>
                <CardIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                  {activeTab === "inquiry-analytics" && (c as any).labelInq ? (c as any).labelInq : c.label}
                </p>
                <h3 className="text-xl font-black text-slate-200 mt-0.5">{c.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Options */}
      <div className="bg-slate-900/20 border border-slate-900/60 rounded-2xl p-4 sm:p-5 mb-6 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase">Search & Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          {/* General Search */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {activeTab === "inquiry-analytics" ? "Search Phone / Aadhaar / Name" : "Search Name / ID"}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Type keyword..."
              className="w-full bg-slate-950/80 border border-slate-900 focus:border-teal-500/50 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-700 focus:outline-none transition-colors"
            />
          </div>

          {/* Branch Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950/80 border border-slate-900 focus:border-teal-500/50 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">All Branches</option>
              {uniqueBranches.map(b => (
                <option key={b} value={b} className="capitalize">{b}</option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Course</label>
            <select
              value={courseFilter}
              onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950/80 border border-slate-900 focus:border-teal-500/50 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">All Courses</option>
              {uniqueCourses.map(c => (
                <option key={c} value={c}>{(c || "").replace(/_/g, " ").toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Payment Mode Filter (For Fees Structure) */}
          {activeTab === "fee-structure" && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Mode</label>
              <select
                value={paymentModeFilter}
                onChange={(e) => { setPaymentModeFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950/80 border border-slate-900 focus:border-teal-500/50 rounded-xl px-3 py-2 text-xs text-slate-355 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">All Payment Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          )}

          {/* Time Period Filter (For Admissions) */}
          {activeTab === "admission-analytics" && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time Period</label>
              <select
                value={timePeriodFilter}
                onChange={(e) => { setTimePeriodFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950/80 border border-slate-900 focus:border-teal-500/50 rounded-xl px-3 py-2 text-xs text-slate-355 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
              </select>
            </div>
          )}

          {/* Date range filters (For Inquiry) */}
          {activeTab === "inquiry-analytics" && (
            <>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-950/80 border border-slate-900 focus:border-teal-500/50 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-950/80 border border-slate-900 focus:border-teal-500/50 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none transition-colors"
                />
              </div>
            </>
          )}

        </div>
      </div>

      {/* Grid Controls (Export / Page Size) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer font-semibold"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="font-semibold">entries per page</span>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyClipboard}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-900/60 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover-lift shadow-md"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Data
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-900/60 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover-lift shadow-md"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto border border-slate-900 bg-slate-950/40 rounded-2xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Loading records from Firestore...</span>
          </div>
        ) : processedData.length === 0 ? (
          <div className="py-16 text-center text-slate-600 font-semibold text-xs flex flex-col items-center justify-center gap-2">
            <Info className="h-5 w-5 text-slate-650" />
            No records match the active criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-900/10 text-slate-450 uppercase tracking-wider text-[10px] font-bold">
                
                {/* 1. FEE STRUCTURE COLUMNS */}
                {activeTab === "fee-structure" && (
                  <>
                    <th onClick={() => handleSort("timestamp")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Timestamp <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("enrollmentId")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Enrollment ID <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("name")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("courseName")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Course <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("paymentMode")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Mode <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("admissionFee")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Adm. Fee</th>
                    <th onClick={() => handleSort("admissionFeeDue")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Adm. Due</th>
                    <th onClick={() => handleSort("courseFee")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Course Fee</th>
                    <th onClick={() => handleSort("courseFeeDue")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Course Due</th>
                    <th onClick={() => handleSort("examFee")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Exam Fee</th>
                    <th onClick={() => handleSort("examFeeDue")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Exam Due</th>
                    <th onClick={() => handleSort("totalAmountDue")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Total Due</th>
                    <th onClick={() => handleSort("branch")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Branch <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("userName")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">User <ArrowUpDown className="h-3 w-3" /></span></th>
                  </>
                )}

                {/* 2. DUE FEES COLUMNS */}
                {activeTab === "due-fees" && (
                  <>
                    <th onClick={() => handleSort("enrollmentId")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Enrollment ID <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("name")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Student Name <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("courseName")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Course <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("totalAmountDue")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Amount Due</th>
                    <th onClick={() => handleSort("branch")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Branch <ArrowUpDown className="h-3 w-3" /></span></th>
                  </>
                )}

                {/* 3. ADMISSION COLUMNS */}
                {activeTab === "admission-analytics" && (
                  <>
                    <th className="px-4 py-3">Action</th>
                    <th onClick={() => handleSort("date")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("receiptNumber")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Receipt No <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("enrollmentId")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Enrollment ID <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("studentName")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Student Name <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("courseName")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Course <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("totalCourseFees")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none text-right">Course Fee</th>
                    <th className="px-4 py-3">Guardian Name</th>
                    <th onClick={() => handleSort("branch")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Branch <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="px-4 py-3">Created By</th>
                  </>
                )}

                {/* 4. INQUIRY COLUMNS */}
                {activeTab === "inquiry-analytics" && (
                  <>
                    <th className="px-4 py-3">Action</th>
                    <th onClick={() => handleSort("date")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("aadharNumber")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Aadhaar <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("fullName")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Full Name <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("phoneNo")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Phone <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="px-4 py-3">Parents No</th>
                    <th onClick={() => handleSort("interestedCourse")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Course <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th onClick={() => handleSort("branch")} className="px-4 py-3 cursor-pointer hover:bg-slate-900/25 select-none"><span className="flex items-center gap-1">Branch <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Admission</th>
                  </>
                )}

              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/20">
              {paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/20 text-slate-350 transition-colors">
                  
                  {/* FEE STRUCTURE ROWS */}
                  {activeTab === "fee-structure" && (
                    <>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {row.timestamp?.seconds ? new Date(row.timestamp.seconds * 1000).toLocaleDateString("en-GB") : row.timestamp || ""}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-400">{row.enrollmentId}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">{row.name}</td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{String(row.courseName).replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-slate-450 font-medium">{row.paymentMode}</td>
                      <td className="px-4 py-3 text-right">₹{(row.admissionFee || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-500 font-semibold">₹{(row.admissionFeeDue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{(row.courseFee || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-500 font-semibold">₹{(row.courseFeeDue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">₹{(row.examFee || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-500 font-semibold">₹{(row.examFeeDue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-teal-400">₹{(row.totalAmountDue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 capitalize text-slate-400 font-medium">{row.branch}</td>
                      <td className="px-4 py-3 text-slate-550 text-[10px]">{row.userName}</td>
                    </>
                  )}

                  {/* DUE FEES ROWS */}
                  {activeTab === "due-fees" && (
                    <>
                      <td className="px-4 py-3 font-semibold text-slate-400">{row.enrollmentId}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">{row.name}</td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{String(row.courseName).replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-rose-450">₹{(row.totalAmountDue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 capitalize text-slate-450 font-medium">{row.branch}</td>
                    </>
                  )}

                  {/* ADMISSION ROWS */}
                  {activeTab === "admission-analytics" && (
                    <>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => onCoursePayment(row.enrollmentId, row.studentName, row.courseName, row.totalCourseFees, row.branch)}
                          className="px-2.5 py-1 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/25 text-teal-400 hover:opacity-90 active:scale-95 transition-all rounded-lg font-bold text-[10px] flex items-center gap-1.5 cursor-pointer hover-lift"
                        >
                          <CircleDollarSign className="h-3.5 w-3.5 text-teal-450" /> Course Pay
                        </button>
                        {userProfile?.role === "admin" && (
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this admission record?")) {
                                const res = await deleteAdmission(row.id || "");
                                if (res.success) {
                                  setAdmissions(prev => prev.filter(a => a.id !== row.id));
                                } else {
                                  alert(res.message);
                                }
                              }
                            }}
                            className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:opacity-90 active:scale-95 transition-all rounded-lg flex items-center justify-center cursor-pointer hover-lift"
                            title="Delete Admission"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-450" />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{row.date}</td>
                      <td className="px-4 py-3 text-slate-450 font-medium">{row.receiptNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-400">{row.enrollmentId}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">{row.studentName}</td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{String(row.courseName).replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-right text-slate-100 font-bold">₹{(row.totalCourseFees || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-450">{row.guardianName || "-"}</td>
                      <td className="px-4 py-3 capitalize text-slate-450 font-medium">{row.branch}</td>
                      <td className="px-4 py-3 text-slate-550 text-[10px]">{row.user}</td>
                    </>
                  )}

                  {/* INQUIRY ROWS */}
                  {activeTab === "inquiry-analytics" && (
                    <>
                      <td className="px-4 py-3 flex gap-2 items-center">
                        {row.admissionStatus === "Admitted" ? (
                          <span className="px-2.5 py-1 bg-slate-950 text-slate-600 rounded-lg text-[9px] font-bold border border-slate-900 h-full flex items-center">
                            Admitted
                          </span>
                        ) : (
                          <button
                            onClick={() => onTakeAdmission(row)}
                            className="px-2.5 py-1 bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-950 hover:opacity-90 active:scale-95 transition-all rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-md shadow-teal-400/5 cursor-pointer hover-lift"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-slate-950" /> Take Admission
                          </button>
                        )}
                        {userProfile?.role === "admin" && (
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this inquiry record?")) {
                                const res = await deleteInquiry(row.id || "");
                                if (res.success) {
                                  setInquiries(prev => prev.filter(i => i.id !== row.id));
                                } else {
                                  alert(res.message);
                                }
                              }
                            }}
                            className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:opacity-90 active:scale-95 transition-all rounded-lg flex items-center justify-center cursor-pointer hover-lift h-full"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-450" />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{row.date}</td>
                      <td className="px-4 py-3 text-slate-450 tracking-wider font-semibold">{row.aadharNumber}</td>
                      <td className="px-4 py-3 text-slate-100 font-semibold">{row.fullName}</td>
                      <td className="px-4 py-3 text-slate-400 font-medium">{row.phoneNo}</td>
                      <td className="px-4 py-3 text-slate-400 font-medium">{row.parentsNo || "-"}</td>
                      <td className="px-4 py-3 text-slate-400 capitalize font-medium">{String(row.interestedCourse).replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 capitalize text-slate-400 font-semibold">{row.branch}</td>
                      <td className="px-4 py-3 text-slate-550 font-medium">{row.status}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${
                          row.admissionStatus === "Admitted" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {row.admissionStatus || "Not Admitted"}
                        </span>
                      </td>
                    </>
                  )}

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-slate-900/60 gap-4">
          <span className="text-xs text-slate-500 font-semibold">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} entries
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="text-xs font-bold text-slate-350 px-3">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
