import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  getStudentDataByEnrollmentId, 
  saveCoursePayment, 
  saveInstallmentSchedule, 
  loadInstallmentSchedule, 
  getInstallmentPaymentsForStudent,
  saveInstallmentPayment,
  Installment,
  PaymentSchedule
} from "../lib/services/paymentService";
import { 
  CircleDollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  Printer, 
  ArrowLeft, 
  ArrowRight,
  Info,
  Calendar,
  X
} from "lucide-react";

interface PaymentViewProps {
  userProfile: UserProfile | null;
  initialEnrollmentId: string | null;
  initialStudentName: string | null;
  initialCourseName: string | null;
  initialTotalFees: number | null;
  initialReceiptNo: string | null;
  onGoBack: () => void;
  onProceedToReceipt: (receiptNo: string, enrollmentId: string) => void;
}

const getCourseConfig = (branch: string, course: string) => {
  const branchLower = (branch || "kurla").toLowerCase();
  
  const kurlaData: any = {
    anm_nursing: { duration: "1 year", fees: 65000 },
    gnm_nursing: { duration: "3 years", fees: 100000 },
    dmlt: { duration: "1 year", fees: 70000 },
    ot_technician: { duration: "1 year", fees: 30000 },
    general_nursing: { duration: "1 year", fees: 30000 }
  };

  const karadData: any = {
    anm_nursing: { duration: "1 Year", fees: 36000 },
    gnm_nursing: { duration: "3 years", fees: 95000 },
    dmlt: { duration: "1 Year", fees: 24000 },
    ot_technician: { duration: "1 Year", fees: 36000 },
    electrician: { duration: "1 Year", fees: 24000 },
    ac_refrigerator: { duration: "1 Year", fees: 24000 },
    basic_parlour: { duration: "2 Months", fees: 5000 }
  };

  const nalasaporaData: any = {
    anm_nursing: { duration: "1 year", fees: 55000 },
    gnm_nursing: { duration: "3 years", fees: 90000 },
    dmlt: { duration: "1 year", fees: 30000 },
    ot_technician: { duration: "1 year", fees: 30000 },
    general_nursing: { duration: "1 year", fees: 30000 }
  };

  const thaneData: any = {
    anm_nursing: { duration: "1 year", fees: 8500 },
    gnm_nursing: { duration: "3 years", fees: 100000 },
    dmlt: { duration: "1 year", fees: 700 },
    ot_technician: { duration: "1 year", fees: 30000 },
    general_nursing: { duration: "1 year", fees: 30000 }
  };

  let courseInfo = null;
  if (branchLower === "karad") courseInfo = karadData[course];
  else if (branchLower === "nalasapora") courseInfo = nalasaporaData[course];
  else if (branchLower === "thane") courseInfo = thaneData[course];
  else courseInfo = kurlaData[course];

  return courseInfo || { duration: "1 year", fees: 30000 };
};

export default function PaymentView({
  userProfile,
  initialEnrollmentId,
  initialStudentName,
  initialCourseName,
  initialTotalFees,
  initialReceiptNo,
  onGoBack,
  onProceedToReceipt
}: PaymentViewProps) {
  // Student identification state
  const [receiptNo, setReceiptNo] = useState(initialReceiptNo || "");
  const [studentName, setStudentName] = useState(initialStudentName || "");
  const [enrollmentId, setEnrollmentId] = useState(initialEnrollmentId || "");
  const [courseName, setCourseName] = useState(initialCourseName || "");
  const [branch, setBranch] = useState(userProfile?.branch || "kurla");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Course fee details
  const config = getCourseConfig(branch, courseName);
  const years = config.duration.includes("year") || config.duration.includes("Year")
    ? parseInt(config.duration.split(" ")[0]) || 1
    : 1;
  const totalFees = initialTotalFees || (years * config.fees);

  // Payment Options States
  const [paymentType, setPaymentType] = useState<"full" | "partial" | "emi" | "">("");
  const [discountRupees, setDiscountRupees] = useState(0);
  
  // Partial details
  const [partialInitial, setPartialInitial] = useState(0);
  const [partialTenure, setPartialTenure] = useState(6);

  // EMI details
  const [emiDownPayment, setEmiDownPayment] = useState(0);
  const [emiTenure, setEmiTenure] = useState(6);

  // Selection locked
  const [locked, setLocked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");

  // Installment Schedule
  const [schedule, setSchedule] = useState<Installment[]>([]);
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);

  // Printing state
  const [printReceiptData, setPrintReceiptData] = useState<any | null>(null);

  // Load from initial values or Aadhaar blur if needed
  useEffect(() => {
    if (initialEnrollmentId) {
      setEnrollmentId(initialEnrollmentId);
      setStudentName(initialStudentName || "");
      setCourseName(initialCourseName || "");
      setReceiptNo(initialReceiptNo || "");
      
      // Look up existing schedule for this enrollment ID
      checkExistingSchedule(initialEnrollmentId);
    }
  }, [initialEnrollmentId]);

  const checkExistingSchedule = async (id: string) => {
    setLoading(true);
    try {
      const saved = await loadInstallmentSchedule(id);
      if (saved && saved.length > 0) {
        setSchedule(saved);
        setLocked(true);
        setConfirmed(true);
        // Deduce payment type from existing schedule
        const firstDoc = await getStudentDataByEnrollmentId(id);
        if (firstDoc.success) {
          const hist = await getInstallmentPaymentsForStudent(id);
          if (hist) {
            setPaymentMethod(hist.paymentMethod || "Cash");
          }
        }
      }
    } catch (e) {
      console.warn("Failed checking existing schedule:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollmentSearch = async () => {
    if (!enrollmentId.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      const res = await getStudentDataByEnrollmentId(enrollmentId.trim());
      if (res.success && res.studentName) {
        setStudentName(res.studentName);
        setCourseName(res.courseName);
        setReceiptNo(res.receiptNumber || "");
        if (res.branch) setBranch(res.branch);
        
        // Check if schedule exists
        await checkExistingSchedule(enrollmentId.trim());
      } else {
        setErrorMsg("Enrollment ID not found in database.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed search.");
    } finally {
      setLoading(false);
    }
  };

  // Calculations for Full Payment
  const fullDiscountPercent = totalFees > 0 ? ((discountRupees / totalFees) * 100).toFixed(1) : "0";
  const fullTotalPayable = Math.max(0, totalFees - discountRupees);

  // Calculations for Partial Payment
  const partialDiscountedTotal = Math.max(0, totalFees - discountRupees);
  const partialRemaining = Math.max(0, partialDiscountedTotal - partialInitial);
  const partialEMIAmount = partialRemaining > 0 ? Math.floor(partialRemaining / partialTenure) : 0;
  const partialRemainder = partialRemaining > 0 ? partialRemaining % partialTenure : 0;
  const partialTotalPayable = partialInitial + partialRemaining;
  const partialDiscountPercent = totalFees > 0 ? ((discountRupees / totalFees) * 100).toFixed(1) : "0";

  // Calculations for EMI Payment
  const emiDiscountedTotal = Math.max(0, totalFees - discountRupees);
  const emiRemaining = Math.max(0, emiDiscountedTotal - emiDownPayment);
  const emiEMIAmount = emiRemaining > 0 ? Math.floor(emiRemaining / emiTenure) : 0;
  const emiRemainder = emiRemaining > 0 ? emiRemaining % emiTenure : 0;
  const emiTotalPayable = emiDownPayment + emiRemaining;
  const emiDiscountPercent = totalFees > 0 ? ((discountRupees / totalFees) * 100).toFixed(1) : "0";

  // Dynamic Installment Schedule Calculation (Derived State when not locked)
  const calculatedSchedule: Installment[] = React.useMemo(() => {
    if (!paymentType) return [];

    const scheduleArray: Installment[] = [];
    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date();

    if (paymentType === "full") {
      scheduleArray.push({
        installmentNumber: 1,
        amount: fullTotalPayable,
        dueDate: todayStr,
        status: "Pending",
        type: "Full Payment (with discount)"
      });
    } else if (paymentType === "partial") {
      let counter = 1;
      if (partialInitial > 0) {
        scheduleArray.push({
          installmentNumber: counter++,
          amount: partialInitial,
          dueDate: todayStr,
          status: "Pending",
          type: "Installment 1"
        });
      }
      for (let i = 1; i <= partialTenure; i++) {
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + i);
        let amount = 0;
        if (i === partialTenure) {
          const totalSoFar = partialInitial + (partialEMIAmount * (partialTenure - 1)) + partialRemainder;
          amount = partialDiscountedTotal - totalSoFar;
        } else {
          amount = partialEMIAmount + (i <= partialRemainder ? 1 : 0);
        }
        scheduleArray.push({
          installmentNumber: counter++,
          amount,
          dueDate: nextMonth.toISOString().split("T")[0],
          status: "Pending",
          type: `Installment ${counter - 1}`
        });
      }
    } else if (paymentType === "emi") {
      let counter = 1;
      if (emiDownPayment > 0) {
        scheduleArray.push({
          installmentNumber: counter++,
          amount: emiDownPayment,
          dueDate: todayStr,
          status: "Pending",
          type: "Installment 1"
        });
      }
      let remaining = emiDiscountedTotal - emiDownPayment;
      for (let i = 1; i <= emiTenure; i++) {
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + i);
        const amount = i === emiTenure ? remaining : emiEMIAmount;
        remaining -= amount;
        scheduleArray.push({
          installmentNumber: counter++,
          amount,
          dueDate: nextMonth.toISOString().split("T")[0],
          status: "Pending",
          type: `Installment ${counter - 1}`
        });
      }
    }
    return scheduleArray;
  }, [paymentType, fullTotalPayable, partialInitial, partialTenure, partialEMIAmount, partialRemainder, partialDiscountedTotal, emiDownPayment, emiTenure, emiEMIAmount, emiDiscountedTotal]);

  const activeSchedule = locked ? schedule : calculatedSchedule;

  // Confirm plan & save schedule
  const handleConfirmPlan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!paymentType) {
      alert("Please select a payment card options first.");
      e.target.checked = false;
      return;
    }
    if (!paymentMethod) {
      alert("Please select a payment method first.");
      e.target.checked = false;
      return;
    }

    const planLabel = paymentType === "full" ? "Full Payment" : paymentType === "partial" ? "Partial Payment" : "EMI Plan";
    const confirmedBox = window.confirm(
      `Are you sure you want to proceed with ${planLabel}?\n\nThis will lock your payment selection and generate the installment schedule.`
    );

    if (!confirmedBox) {
      e.target.checked = false;
      return;
    }

    setLoading(true);
    setLocked(true);
    setConfirmed(true);
    setSchedule(calculatedSchedule);

    // Write to Firestore collections (feeStructures, installmentSchedules)
    const activePayFees = paymentType === "full" ? fullTotalPayable : paymentType === "partial" ? partialTotalPayable : emiTotalPayable;
    
    try {
      // 1. Save Fee Structure
      await saveCoursePayment({
        enrollmentId,
        studentName,
        courseName,
        paymentMode: paymentMethod,
        totalFees,
        coursePayFees: activePayFees,
        paymentType,
        loggedInUserId: userProfile?.username || "Admin",
        branch
      });

      // 2. Save Installment Schedule
      const scheduleDoc: PaymentSchedule = {
        enrollmentId,
        studentName,
        courseName,
        paymentType,
        totalFee: activePayFees,
        installments: calculatedSchedule,
        loggedInUser: userProfile?.username || "Admin"
      };
      await saveInstallmentSchedule(scheduleDoc);

      setSuccessMsg("Payment plan locked and schedule saved successfully!");
    } catch (err: any) {
      setErrorMsg("Failed to lock plan: " + err.message);
      setLocked(false);
      setConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  // Mark specific installment as Paid
  const handleMarkAsPaid = async (inst: Installment) => {
    const amountStr = `₹${inst.amount.toLocaleString()}`;
    const confirmedPay = window.confirm(
      `Are you sure the payment has been completed?\n\nInstallment: ${inst.installmentNumber}\nAmount: ${amountStr}`
    );

    if (!confirmedPay) return;

    if (!enrollmentId || !enrollmentId.trim()) {
      setErrorMsg("Enrollment ID is missing. Please search for a valid student enrollment first.");
      return;
    }

    setProcessingPayment(inst.installmentNumber);
    setErrorMsg("");

    try {
      const res = await saveInstallmentPayment({
        enrollmentId,
        studentName,
        courseName,
        installmentNumber: inst.installmentNumber,
        installmentAmount: inst.amount,
        paymentMethod,
        paymentDate: new Date().toISOString().split("T")[0],
        loggedInUser: userProfile?.username || "Admin"
      });

      if (res.success) {
        setSuccessMsg(`Installment ${inst.installmentNumber} recorded successfully!`);
        // Refresh schedule from database
        await checkExistingSchedule(enrollmentId);
      } else {
        setErrorMsg(res.message || "Failed to record payment.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving payment.");
    } finally {
      setProcessingPayment(null);
    }
  };

  // Generate PDF receipt using Certificate Builder template
  const handlePrintReceipt = async (inst: Installment) => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "receipt_templates", "fee_receipt"));
      if (docSnap.exists()) {
        const templateData = docSnap.data();
        
        // Calculate cumulative paid amount
        const paidSoFar = schedule
          .filter(s => s.status === "Paid" && s.installmentNumber <= inst.installmentNumber)
          .reduce((acc, s) => acc + s.amount, 0);
          
        const balanceAmt = Math.max(0, totalFees - paidSoFar);

        // Map variables to layout values
        const dataPayload = {
          receiptNo: receiptNo || `IR-${enrollmentId}-${inst.installmentNumber}`,
          date: new Date().toLocaleDateString("en-GB"),
          studentName: studentName,
          courseName: courseName.replace(/_/g, " ").toUpperCase(),
          totalAmount: totalFees.toLocaleString(),
          paidAmount: inst.amount.toLocaleString(),
          balanceAmount: balanceAmt.toLocaleString(),
          receivedBy: userProfile?.username || "Authorized Officer",
          // Checkbox conditions (passed as strings that resolve to true/false in backend)
          isAdmissionFee: inst.installmentNumber === 1 ? 'true' : 'false',
          isCourseFee: inst.installmentNumber > 1 ? 'true' : 'false',
          isExamFee: 'false',
          isCash: paymentMethod === 'Cash' ? 'true' : 'false',
          isOnline: (paymentMethod === 'UPI' || paymentMethod === 'Bank') ? 'true' : 'false',
          isCheque: paymentMethod === 'Cheque' ? 'true' : 'false'
        };

        const response = await fetch('/api/certificates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'preview',
            templateBase64: templateData.templateBase64,
            isPdfTemplate: templateData.isPdfTemplate,
            fields: templateData.fields,
            dimensions: templateData.dimensions,
            data: dataPayload
          }),
        });

        if (!response.ok) throw new Error("Failed to generate receipt PDF");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        // Fallback to local receipt modal if template doesn't exist
        const data = {
          receiptNumber: `IR${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toLocaleDateString("en-GB"),
          studentName,
          courseName: courseName.replace(/_/g, " ").toUpperCase(),
          installmentNumber: inst.installmentNumber,
          amountPaid: inst.amount,
          paymentMode: paymentMethod,
          receivedBy: userProfile?.username || "Authorized Officer",
          branch: branch.toUpperCase()
        };
        setPrintReceiptData(data);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error generating PDF receipt: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-slate-900/40 border border-slate-900/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4 glass-panel gpu-accelerated">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

      {/* Header */}
      <div className="border-b border-slate-900 pb-4 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <CircleDollarSign className="h-7 w-7 text-teal-400" />COURSE PAYMENT
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Configure student payment plan and record installment checks</p>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-450" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {loading && (
        <div className="py-10 flex flex-col items-center justify-center gap-2.5">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Processing collection...</span>
        </div>
      )}

      {/* Student Lookup if not passed */}
      <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-400">Search Enrollment ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)}
              className="flex-1 bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 font-medium"
              placeholder="e.g. ST001"
              disabled={locked}
            />
            {!locked && (
              <button
                type="button"
                onClick={handleEnrollmentSearch}
                className="px-4 py-2 btn-secondary text-xs rounded-xl cursor-pointer"
              >
                Search
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-400">Student Name</label>
          <input
            type="text"
            value={studentName}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-400 cursor-not-allowed font-medium"
            readOnly
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-400">Receipt No</label>
          <input
            type="text"
            value={receiptNo}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-400 cursor-not-allowed font-medium"
            readOnly
          />
        </div>
      </div>

      {/* Course Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Trainee Course</span>
          <span className="text-sm font-bold text-slate-350 capitalize mt-1">
            {courseName ? courseName.replace(/_/g, " ") : "Not selected"}
          </span>
        </div>
        <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tenure / Duration</span>
          <span className="text-sm font-bold text-slate-350 mt-1">{config.duration || "-"}</span>
        </div>
        <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Payable Course Fee</span>
          <span className="text-sm font-extrabold text-teal-400 mt-1">₹{totalFees.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment Options Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest border-l-2 border-teal-500 pl-2">Select Payment Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Full Payment */}
          {(!locked || paymentType === "full") && (
            <div 
              onClick={() => !locked && setPaymentType("full")}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                paymentType === "full"
                  ? "bg-teal-500/5 border-teal-500/40 shadow-lg shadow-teal-500/5"
                  : "bg-slate-950/30 border-slate-900 hover:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <input
                  type="radio"
                  id="full"
                  name="plan"
                  checked={paymentType === "full"}
                  onChange={() => !locked && setPaymentType("full")}
                  disabled={locked}
                  className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 focus:ring-teal-500/20 focus:ring-offset-slate-950 cursor-pointer"
                />
                <label htmlFor="full" className="font-bold text-sm text-slate-200 cursor-pointer">Full Payment</label>
              </div>
              <p className="text-xs text-slate-500">Pay the entire amount upfront</p>
              
              <div className="mt-4 pt-3 border-t border-slate-900 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Standard Fees:</span>
                  <span>₹{totalFees.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Discount (₹):</span>
                  <input
                    type="number"
                    value={discountRupees || ""}
                    onChange={(e) => setDiscountRupees(Math.min(totalFees, Math.max(0, parseInt(e.target.value) || 0)))}
                    disabled={locked}
                    className="w-20 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Discount (%):</span>
                  <span>{fullDiscountPercent}%</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-2 mt-1">
                  <span>Total Payable:</span>
                  <span className="text-teal-400">₹{fullTotalPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Partial Payment */}
          {(!locked || paymentType === "partial") && (
            <div 
              onClick={() => !locked && setPaymentType("partial")}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                paymentType === "partial"
                  ? "bg-teal-500/5 border-teal-500/40 shadow-lg shadow-teal-500/5"
                  : "bg-slate-950/30 border-slate-900 hover:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <input
                  type="radio"
                  id="partial"
                  name="plan"
                  checked={paymentType === "partial"}
                  onChange={() => !locked && setPaymentType("partial")}
                  disabled={locked}
                  className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 focus:ring-teal-500/20 focus:ring-offset-slate-950 cursor-pointer"
                />
                <label htmlFor="partial" className="font-bold text-sm text-slate-200 cursor-pointer">Partial Payment</label>
              </div>
              <p className="text-xs text-slate-500">Pay initial and the rest in installments</p>
              
              <div className="mt-4 pt-3 border-t border-slate-900 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Initial Pay (₹):</span>
                  <input
                    type="number"
                    value={partialInitial || ""}
                    onChange={(e) => setPartialInitial(Math.min(partialDiscountedTotal, Math.max(0, parseInt(e.target.value) || 0)))}
                    disabled={locked}
                    className="w-20 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Discount (₹):</span>
                  <input
                    type="number"
                    value={discountRupees || ""}
                    onChange={(e) => setDiscountRupees(Math.min(totalFees, Math.max(0, parseInt(e.target.value) || 0)))}
                    disabled={locked}
                    className="w-20 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Installments:</span>
                  <select
                    value={partialTenure}
                    onChange={(e) => setPartialTenure(parseInt(e.target.value))}
                    disabled={locked}
                    className="bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>EMI Amount:</span>
                  <span>₹{partialEMIAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-2 mt-1">
                  <span>Total Payable:</span>
                  <span className="text-teal-400">₹{partialTotalPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: EMI Plan */}
          {(!locked || paymentType === "emi") && (
            <div 
              onClick={() => !locked && setPaymentType("emi")}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                paymentType === "emi"
                  ? "bg-teal-500/5 border-teal-500/40 shadow-lg shadow-teal-500/5"
                  : "bg-slate-950/30 border-slate-900 hover:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <input
                  type="radio"
                  id="emi"
                  name="plan"
                  checked={paymentType === "emi"}
                  onChange={() => !locked && setPaymentType("emi")}
                  disabled={locked}
                  className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 focus:ring-teal-500/20 focus:ring-offset-slate-950 cursor-pointer"
                />
                <label htmlFor="emi" className="font-bold text-sm text-slate-200 cursor-pointer">EMI Plan</label>
              </div>
              <p className="text-xs text-slate-500">Pay in easy monthly installments</p>
              
              <div className="mt-4 pt-3 border-t border-slate-900 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Down Pay (₹):</span>
                  <input
                    type="number"
                    value={emiDownPayment || ""}
                    onChange={(e) => setEmiDownPayment(Math.min(emiDiscountedTotal, Math.max(0, parseInt(e.target.value) || 0)))}
                    disabled={locked}
                    className="w-20 bg-slate-950 border border-slate-855 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Discount (₹):</span>
                  <input
                    type="number"
                    value={discountRupees || ""}
                    onChange={(e) => setDiscountRupees(Math.min(totalFees, Math.max(0, parseInt(e.target.value) || 0)))}
                    disabled={locked}
                    className="w-20 bg-slate-950 border border-slate-855 rounded-lg px-2 py-1 text-right text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500/40"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Tenure (Months):</span>
                  <select
                    value={emiTenure}
                    onChange={(e) => setEmiTenure(parseInt(e.target.value))}
                    disabled={locked}
                    className="bg-slate-950 border border-slate-855 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>EMI Amount:</span>
                  <span>₹{emiEMIAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200 border-t border-slate-900 pt-2 mt-1">
                  <span>Total Payable:</span>
                  <span className="text-teal-400">₹{emiTotalPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Option */}
      <div className="mt-6 space-y-1.5">
        <label htmlFor="payMethod" className="block text-xs font-semibold text-slate-400">Payment Method*</label>
        <select
          id="payMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          disabled={locked}
          className="w-full max-w-xs bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-350 focus:outline-none focus:border-teal-500/50 transition-colors font-medium cursor-pointer"
          required
        >
          <option value="">Select Method</option>
          <option value="Cash">Cash</option>
          <option value="Bank">Bank Transfer</option>
          <option value="UPI">UPI</option>
          <option value="Cheque">Bank Check / Cheque</option>
        </select>
      </div>

      {/* Confirmation Checkbox */}
      {!confirmed && (
        <div className="mt-6 p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="confirmLock"
              onChange={handleConfirmPlan}
              className="h-5 w-5 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 focus:ring-offset-slate-950 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-300">
              I confirm my payment option selection and agree to proceed with the payment plan.
            </span>
          </label>
          <p className="mt-1 text-[10px] text-slate-500 ml-8 font-medium">
            Checking this box will lock your payment selection and generate the installment schedule.
          </p>
        </div>
      )}

      {/* Installment Table Section */}
      {paymentType && activeSchedule.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest border-l-2 border-teal-500 pl-2">Installment Schedule</h3>
            {!confirmed && (
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 w-fit">
                <Info className="h-3.5 w-3.5" /> Preview Mode (Confirm plan below to enable payment processing)
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto bg-slate-950/20 border border-slate-900 rounded-2xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900">
                <tr>
                  <th className="px-5 py-3 text-center">Installment</th>
                  <th className="px-5 py-3 text-center">Due Date</th>
                  <th className="px-5 py-3 text-center">Amount</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Mark as Paid</th>
                  <th className="px-5 py-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {activeSchedule.map((inst) => (
                  <tr key={inst.installmentNumber} className="hover:bg-slate-900/20 text-slate-300">
                    <td className="px-5 py-3 text-center font-medium">
                      {inst.type ? `${inst.type} (Installment ${inst.installmentNumber})` : `Installment ${inst.installmentNumber}`}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-400">{inst.dueDate}</td>
                    <td className="px-5 py-3 text-center font-bold">₹{inst.amount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                        inst.status === "Paid"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={inst.status === "Paid"}
                        disabled={!confirmed || inst.status === "Paid" || processingPayment === inst.installmentNumber}
                        onChange={() => handleMarkAsPaid(inst)}
                        className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-5 py-3 text-center">
                      {inst.status === "Paid" ? (
                        <button
                          onClick={() => handlePrintReceipt(inst)}
                          className="px-2.5 py-1 text-[10px] font-bold text-slate-950 bg-emerald-450 hover:bg-emerald-350 transition-colors rounded-lg flex items-center justify-center gap-1 mx-auto shadow shadow-emerald-500/10 cursor-pointer hover-lift"
                        >
                          <Printer className="h-3.5 w-3.5 text-slate-950" />Receipt
                        </button>
                      ) : (
                        <span className="text-slate-650">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Bottom Navigation */}
      <div className="border-t border-slate-900 pt-6 mt-8 flex justify-between items-center">
        <button
          onClick={onGoBack}
          className="btn-secondary px-6 py-2.5 text-xs rounded-xl cursor-pointer"
        >
          Back
        </button>

        {confirmed && (
          <button
            onClick={() => onProceedToReceipt(receiptNo, enrollmentId)}
            className="btn-primary px-6 py-2.5 text-xs rounded-xl cursor-pointer uppercase tracking-wide"
          >
            Proceed to Admission Receipt
          </button>
        )}
      </div>

      {/* Printable Receipt Modal Dialog overlay */}
      {printReceiptData && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl relative animate-float-scale">
            <button 
              onClick={() => setPrintReceiptData(null)}
              className="no-print absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-500/10 text-slate-600 hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Print Area */}
            <div id="receipt-print-area" className="p-4 border-2 border-slate-900 rounded-2xl space-y-4">
              <div className="text-center pb-2 border-b border-slate-300">
                <img 
                  src="https://i.postimg.cc/DZFDcqP8/IMG-20250320-WA0023-1-modified-3.png" 
                  alt="Institute Logo" 
                  className="w-16 h-16 object-contain mx-auto mb-2 rounded-lg"
                />
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-800">TrustCare</h2>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">{printReceiptData.branch} Branch</p>
              </div>

              <div className="flex justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-500">Receipt No: </span>
                  <span className="font-bold text-slate-800">{printReceiptData.receiptNumber}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Date: </span>
                  <span className="font-bold text-slate-800">{printReceiptData.date}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs border-y border-slate-200 py-3 font-medium">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-800">{printReceiptData.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Course Name:</span>
                  <span className="font-bold text-slate-800">{printReceiptData.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Payment Option:</span>
                  <span className="font-bold text-slate-800">Installment {printReceiptData.installmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-800">{printReceiptData.paymentMode}</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-650">Amount Paid:</span>
                <span className="text-base font-extrabold text-teal-600">₹{printReceiptData.amountPaid.toLocaleString()}</span>
              </div>

              <div className="pt-4 flex justify-between items-end text-[9px] text-slate-500">
                <div>
                  <p className="font-bold text-slate-600">Received By:</p>
                  <p className="mt-1 font-semibold">{printReceiptData.receivedBy}</p>
                </div>
                <div className="text-right">
                  <div className="h-8 w-24 border-b border-slate-300 mb-1 mx-auto"></div>
                  <p className="font-bold text-slate-600">Authorized Signature</p>
                </div>
              </div>
            </div>

            {/* Modal Print Actions */}
            <div className="mt-6 flex justify-end gap-3 no-print">
              <button
                onClick={() => setPrintReceiptData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-150 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-teal-400 to-indigo-500 hover:opacity-90 active:scale-95 transition-all rounded-xl flex items-center gap-1.5 shadow cursor-pointer hover-lift"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
