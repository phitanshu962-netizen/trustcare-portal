import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import {
  getStudentDataByEnrollmentId,
  saveExamReceipt,
  getNextReceiptNumberEF,
  ExamReceiptData
} from "../lib/services/paymentService";
import {
  Receipt,
  Loader2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Printer,
  X
} from "lucide-react";

interface ExamReceiptViewProps {
  userProfile: UserProfile | null;
  onGoBack?: () => void;
}

const getExamFee = (branch: string, courseName: string) => {
  const branchLower = (branch || "kurla").toLowerCase();

  if (branchLower === "karad") {
    const course = String(courseName).toLowerCase();
    if (course.includes("parlour")) {
      return 1000;
    }
    return 6000;
  }

  return 500; // Default for Kurla, Thane, Nalasapora
};

export default function ExamReceiptView({ userProfile, onGoBack }: ExamReceiptViewProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState("");

  // Form fields
  const [enrollmentId, setEnrollmentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [branch, setBranch] = useState("");
  const [totalAmount, setTotalAmount] = useState(500);
  const [paymentMode, setPaymentMode] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Generate Receipt Number and Date on mount
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const nextReceipt = await getNextReceiptNumberEF();
        setReceiptNumber(nextReceipt);

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setReceiptDate(`${dd}/${mm}/${yyyy}`);
      } catch (error) {
        console.error("Error loading receipt number:", error);
        showNotification("Failed to load receipt number", "error");
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Fetch student info on blur of enrollmentId
  const handleEnrollmentIdBlur = async () => {
    const trimmedId = enrollmentId.trim();
    if (!trimmedId) return;

    showNotification("Fetching student data...", "info");
    try {
      const res = await getStudentDataByEnrollmentId(trimmedId);
      if (res.success) {
        setStudentName(res.studentName || "");
        setCourseName(res.courseName || "");
        setStudentEmail(res.email || "");

        const studentBranch = res.branch || userProfile?.branch || "kurla";
        setBranch(studentBranch);

        const fee = getExamFee(studentBranch, res.courseName || "");
        setTotalAmount(fee);

        showNotification("Student data loaded successfully!", "success");
      } else {
        showNotification("Enrollment ID not found or invalid", "error");
        setStudentName("");
        setCourseName("");
        setStudentEmail("");
        setTotalAmount(500);
      }
    } catch (error) {
      showNotification("Error loading student data", "error");
      console.error(error);
    }
  };

  // Generate HTML for printer double receipt (same design as installment receipt)
  const printReceipt = (receiptNo: string, dateStr: string, name: string, course: string, amt: number, mode: string, studentBranch: string) => {
    const logoBase64 = "/TrustCareLogo.avif";
    const courseLabel = course.replace(/_/g, " ").toUpperCase();
    const formattedAmount = "₹" + amt.toLocaleString("en-IN");

    const receiptHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=794">
  <title>Exam Receipt - ${receiptNo}</title>
  <style>
    @page { size: A4; margin: 0.5in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100vw;
      overflow-x: hidden;
      font-family: 'Times New Roman', Times, serif;
      background: #2bb6bc;
      color: #000;
    }
    .print-bar {
      height: 50px;
      background: #1e293b;
      border-bottom: 2px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 18px;
      flex-shrink: 0;
    }
    .print-bar button {
      padding: 7px 24px;
      background: #14507a;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
    }
    .print-bar p { font-size: 11px; color: #94a3b8; }
    .scroll-area {
      min-height: 100vh;
      overflow-y: auto;
      padding: 14px 0 24px;
    }
    .page-container {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      margin: 0 auto 18px;
      background: #fff;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .receipt {
      width: 100%;
      height: 48%;
      border: 3px solid #000;
      border-radius: 20px;
      padding: 20px;
      box-sizing: border-box;
      background: white;
      page-break-inside: avoid;
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .receipt::before {
      content: "";
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 560px;
      height: 560px;
      background-image: url('${logoBase64}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      opacity: 0.05;
      z-index: 0;
      pointer-events: none;
    }
    hr.dotted-sep {
      width: 100%;
      border: none;
      border-top: 2px dashed #aaa;
      margin: 12px 0;
      position: relative;
      z-index: 1;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .logo-container {
      width: 150px;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-img {
      width: 150px;
      height: 150px;
      object-fit: contain;
    }
    .header-center {
      flex: 1;
      text-align: center;
      line-height: 1.2;
    }
    .org-name {
      font-size: 36px;
      font-weight: 900;
      color: #006400;
      font-family: 'Times New Roman', Times, serif;
      letter-spacing: 1.5px;
      margin: 0;
    }
    .org-sub {
      font-size: 16px;
      font-weight: bold;
      color: #000;
      letter-spacing: 0.5px;
      margin: 2px 0 0 0;
    }
    .receipt-badge {
      display: inline-block;
      background: #000;
      color: #fff;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 2px;
      padding: 3px 20px;
      border-radius: 12px;
      margin-top: 6px;
      text-transform: uppercase;
    }
    .receipt-type {
      font-size: 10px;
      font-weight: bold;
      color: #777;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .receipt-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      position: relative;
      z-index: 1;
      margin-top: 10px;
    }
    .field-row {
      display: flex;
      align-items: flex-end;
      margin-top: 16px;
      font-size: 14px;
      font-weight: bold;
      color: #000;
      position: relative;
      z-index: 1;
    }
    .field-label {
      white-space: nowrap;
      margin-right: 5px;
    }
    .field-underline {
      flex: 1;
      border-bottom: 1.5px solid #000;
      padding-bottom: 1px;
      padding-left: 8px;
      font-weight: bold;
      color: #000;
    }
    .checkbox-box {
      width: 22px;
      height: 22px;
      border: 2px solid #000;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: bold;
      color: #000;
      margin-left: 6px;
      vertical-align: middle;
      line-height: 1;
      background: #fff;
    }
    .mode-badge {
      background: #000;
      color: #fff;
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 12.5px;
      font-weight: bold;
      margin-right: 15px;
      text-transform: uppercase;
      display: inline-block;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      position: relative;
      z-index: 1;
    }
    .footer-notes {
      font-size: 11px;
      font-weight: bold;
      line-height: 1.5;
      color: #000;
      text-align: left;
    }
    .signature-area {
      font-size: 12px;
      font-weight: bold;
      color: #000;
      white-space: nowrap;
    }
    @media print {
      html, body { overflow: visible; height: auto; background: #fff; }
      .print-bar { display: none !important; }
      .scroll-area { height: auto; overflow: visible; padding: 0; }
      .page-container {
        width: 100%;
        height: 100vh;
        min-height: 100vh;
        margin: 0;
        padding: 20px;
        box-shadow: none;
        page-break-after: always;
      }
      .page-container:last-child { page-break-after: auto; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button onclick="window.print()">&#128424; Print Receipt</button>
    <p>Press Ctrl+P (Cmd+P on Mac) to print. Close this tab when done.</p>
  </div>
  <div class="scroll-area">
    <div class="page-container">
      <!-- Receipt 1 - Student Copy -->
      <div class="receipt">
        <div class="header">
          <div class="logo-container"><img class="logo-img" src="${logoBase64}" alt="Logo" /></div>
          <div class="header-center">
            <div class="org-name">TRUSTCARE</div>
            <div class="org-sub">INSTITUTE OF HEALTH SCIENCE</div>
            <div class="receipt-badge">RECEIPT</div>
            <div class="receipt-type">STUDENT COPY</div>
          </div>
          <div class="logo-container"><img class="logo-img" src="${logoBase64}" alt="Logo" /></div>
        </div>
        <div class="receipt-content">
          <div class="field-row">
            <div style="display: flex; width: 250px; align-items: flex-end;">
              <span class="field-label">Receipt No.</span>
              <span class="field-underline">${receiptNo}</span>
            </div>
            <div style="display: flex; width: 220px; align-items: flex-end; margin-left: 20px;">
              <span class="field-label">Date :</span>
              <span class="field-underline">${dateStr}</span>
            </div>
          </div>

          <div class="field-row">
            <span class="field-label">Student Name :</span>
            <span class="field-underline">${name}</span>
          </div>

          <div class="field-row">
            <span class="field-label">Course Name :</span>
            <span class="field-underline">${courseLabel}</span>
          </div>

          <div class="field-row" style="align-items: center;">
            <span class="field-label">Purpose To Pay :</span>
            <span style="display: inline-flex; align-items: center; margin-right: 15px;">
              Admission Fee's
              <span class="checkbox-box">&nbsp;</span>
            </span>
            <span style="display: inline-flex; align-items: center; margin-right: 15px;">
              Course Fee's
              <span class="checkbox-box">&#10003;</span>
            </span>
            <span style="display: inline-flex; align-items: center;">
              Exam Fee's
              <span class="checkbox-box">&#10003;</span>
            </span>
          </div>

          <div class="field-row">
            <div style="display: flex; flex: 1; align-items: flex-end;">
              <span class="field-label">Total Amount :</span>
              <span class="field-underline">${formattedAmount}</span>
            </div>
            <div style="display: flex; flex: 1; align-items: flex-end; margin-left: 15px;">
              <span class="field-label">Paid Amt. :</span>
              <span class="field-underline">${formattedAmount}</span>
            </div>
            <div style="display: flex; flex: 1; align-items: flex-end; margin-left: 15px;">
              <span class="field-label">Balance Amt :</span>
              <span class="field-underline">₹0</span>
            </div>
          </div>

          <div class="field-row" style="width: 350px;">
            <span class="field-label">Received By :</span>
            <span class="field-underline">${userProfile?.username || "Admin"}</span>
          </div>

          <div class="field-row" style="align-items: center; margin-top: 18px;">
            <span class="mode-badge">Mode of Payment:</span>
            <span style="display: inline-flex; align-items: center; margin-right: 15px;">
              Cash
              <span class="checkbox-box">${mode.toLowerCase() === 'cash' ? '✓' : '&nbsp;'}</span>
            </span>
            <span style="display: inline-flex; align-items: center; margin-right: 15px;">
              Online
              <span class="checkbox-box">${(mode.toLowerCase() === 'online' || mode.toLowerCase() === 'upi' || mode.toLowerCase() === 'bank' || mode.toLowerCase() === 'gpay' || mode.toLowerCase() === 'phonepe') ? '✓' : '&nbsp;'}</span>
            </span>
            <span style="display: inline-flex; align-items: center;">
              Cheque
              <span class="checkbox-box">${mode.toLowerCase() === 'cheque' ? '✓' : '&nbsp;'}</span>
            </span>
          </div>
        </div>
        <div class="footer">
          <div class="footer-notes">
            <div>• Course Fees, Once Paid Cannot Be Refunded.</div>
            <div style="margin-top: 3px;">• After Admission Is Completed Cancellation. Is Not Allowed.</div>
          </div>
          <div class="signature-area">
            Authority Sign./Stamp &nbsp;................................
          </div>
        </div>
      </div>

      <hr class="dotted-sep" />

      <!-- Receipt 2 - Office Copy -->
      <div class="receipt">
        <div class="header">
          <div class="logo-container"><img class="logo-img" src="${logoBase64}" alt="Logo" /></div>
          <div class="header-center">
            <div class="org-name">TRUSTCARE</div>
            <div class="org-sub">INSTITUTE OF HEALTH SCIENCE</div>
            <div class="receipt-badge">RECEIPT</div>
            <div class="receipt-type">CENTRE COPY</div>
          </div>
          <div class="logo-container"><img class="logo-img" src="${logoBase64}" alt="Logo" /></div>
        </div>
        <div class="receipt-content">
          <div class="field-row">
            <div style="display: flex; width: 250px; align-items: flex-end;">
              <span class="field-label">Receipt No.</span>
              <span class="field-underline">${receiptNo}</span>
            </div>
            <div style="display: flex; width: 220px; align-items: flex-end; margin-left: 20px;">
              <span class="field-label">Date :</span>
              <span class="field-underline">${dateStr}</span>
            </div>
          </div>

          <div class="field-row">
            <span class="field-label">Student Name :</span>
            <span class="field-underline">${name}</span>
          </div>

          <div class="field-row">
            <span class="field-label">Course Name :</span>
            <span class="field-underline">${courseLabel}</span>
          </div>

          <div class="field-row" style="align-items: center;">
            <span class="field-label">Purpose To Pay :</span>
            <span style="display: inline-flex; align-items: center; margin-right: 15px;">
              Admission Fee's
              <span class="checkbox-box">&nbsp;</span>
            </span>
            <span style="display: inline-flex; align-items: center; margin-right: 15px;">
              Course Fee's
              <span class="checkbox-box">&#10003;</span>
            </span>
            <span style="display: inline-flex; align-items: center;">
              Exam Fee's
              <span class="checkbox-box">&#10003;</span>
            </span>
          </div>

          <div class="field-row">
            <div style="display: flex; flex: 1; align-items: flex-end;">
              <span class="field-label">Total Amount :</span>
              <span class="field-underline">${formattedAmount}</span>
            </div>
            <div style="display: flex; flex: 1; align-items: flex-end; margin-left: 15px;">
              <span class="field-label">Paid Amt. :</span>
              <span class="field-underline">${formattedAmount}</span>
            </div>
            <div style="display: flex; flex: 1; align-items: flex-end; margin-left: 15px;">
              <span class="field-label">Balance Amt :</span>
              <span class="field-underline">₹0</span>
            </div>
          </div>

          <div class="field-row" style="width: 350px;">
            <span class="field-label">Received By :</span>
            <span class="field-underline">${userProfile?.username || "Admin"}</span>
          </div>

          <div class="field-row" style="align-items: center; margin-top: 18px;">
            <span class="mode-badge">Mode of Payment:</span>
            <span style="display: inline-flex; align-items: center; margin-right: 15px;">
              Cash
              <span class="checkbox-box">${mode.toLowerCase() === 'cash' ? '✓' : '&nbsp;'}</span>
            </span>
            <span style="display: inline-flex; align-items: center; margin-right: 15px;">
              Online
              <span class="checkbox-box">${(mode.toLowerCase() === 'online' || mode.toLowerCase() === 'upi' || mode.toLowerCase() === 'bank' || mode.toLowerCase() === 'gpay' || mode.toLowerCase() === 'phonepe') ? '✓' : '&nbsp;'}</span>
            </span>
            <span style="display: inline-flex; align-items: center;">
              Cheque
              <span class="checkbox-box">${mode.toLowerCase() === 'cheque' ? '✓' : '&nbsp;'}</span>
            </span>
          </div>
        </div>
        <div class="footer">
          <div class="footer-notes">
            <div>• Course Fees, Once Paid Cannot Be Refunded.</div>
            <div style="margin-top: 3px;">• After Admission Is Completed Cancellation. Is Not Allowed.</div>
          </div>
          <div class="signature-area">
            Authority Sign./Stamp &nbsp;................................
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    setTimeout(() => {
      window.print();
    }, 500);
  </script>
</body>
</html>`;

    const popW = 794;
    const popH = Math.min(screen.availHeight || 900, 1123);
    const left = Math.max(0, Math.round((screen.width - popW) / 2));
    const top = Math.max(0, Math.round((screen.height - popH) / 2));
    const printWindow = window.open("", "_blank", `width=${popW},height=${popH},left=${left},top=${top},scrollbars=yes`);
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } else {
      showNotification("Popup blocked! Please allow popups to print receipts.", "error");
    }
  };

  const handleSendExamEmail = async (receipt: any) => {
    if (!studentEmail && !receipt.email) {
      showNotification("Please enter a valid email address.", "error");
      return;
    }

    const emailToUse = studentEmail || receipt.email;
    setEmailSending(true);
    showNotification("Sending email...", "info");
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailToUse,
          type: "exam",
          data: {
            receiptNo: receipt.receiptNumber,
            date: receipt.receiptDate,
            studentName: receipt.studentName,
            courseName: receipt.courseName,
            totalAmount: receipt.totalAmount,
            paymentMode: receipt.paymentMode,
            receivedBy: receipt.userId,
            branch: branch.toUpperCase() || "KURLA"
          }
        })
      });

      const res = await response.json();
      if (response.ok) {
        showNotification(`Exam receipt email sent to ${emailToUse} successfully!`, "success");
      } else {
        showNotification(res.error || "Failed to send email.", "error");
      }
    } catch (err: any) {
      showNotification("Error sending email: " + err.message, "error");
    } finally {
      setEmailSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      showNotification("Please agree to the terms and conditions.", "error");
      return;
    }
    if (!enrollmentId || !studentName || !courseName) {
      showNotification("Please enter a valid Enrollment ID and make sure student info is fetched.", "error");
      return;
    }
    if (!paymentMode) {
      showNotification("Please select a payment mode.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const receiptData: ExamReceiptData & { email?: string } = {
        receiptDate,
        receiptNumber,
        enrollmentId,
        studentName,
        courseName,
        totalAmount,
        paymentMode,
        agreeTerms: agreeTerms ? "Agreed" : "Not Agreed",
        userId: userProfile?.username || "Admin",
        email: studentEmail
      };

      const res = await saveExamReceipt(receiptData);
      if (res.success) {
        showNotification("Exam fee receipt saved successfully! Printing...", "success");
        setLastReceipt(receiptData);

        // Print the receipt double layout
        printReceipt(receiptNumber, receiptDate, studentName, courseName, totalAmount, paymentMode, branch);

        // Auto-send exam email if student email is available
        if (studentEmail) {
          try {
            await fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: studentEmail,
                type: "exam",
                data: {
                  receiptNo: receiptNumber,
                  date: receiptDate,
                  studentName: studentName,
                  courseName: courseName,
                  totalAmount: totalAmount,
                  paymentMode: paymentMode,
                  receivedBy: userProfile?.username || "Admin",
                  branch: branch.toUpperCase()
                }
              })
            });
          } catch (mailErr) {
            console.warn("Could not auto-send exam email:", mailErr);
          }
        }

        // Reset form except date
        setEnrollmentId("");
        setStudentName("");
        setCourseName("");
        setPaymentMode("");
        setAgreeTerms(false);
        setBranch("");
        setStudentEmail("");

        // Load next receipt number
        const nextReceipt = await getNextReceiptNumberEF();
        setReceiptNumber(nextReceipt);
      } else {
        showNotification(res.message || "Failed to save receipt. Please try again.", "error");
      }
    } catch (error: any) {
      showNotification("Error saving exam receipt: " + error.message, "error");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-slate-900/40 border border-slate-900/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4 glass-panel gpu-accelerated">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${notification.type === "success"
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : notification.type === "error"
            ? "bg-rose-500/10 border-rose-500/20 text-rose-450"
            : "bg-teal-500/10 border-teal-500/20 text-teal-400"
          }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === "success" && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />}
            {notification.type === "error" && <AlertTriangle className="h-4.5 w-4.5 text-rose-450" />}
            {notification.type === "info" && <Info className="h-4.5 w-4.5 text-teal-400" />}
            <span className="text-xs font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

      {/* Header */}
      <div className="border-b border-slate-900 pb-4 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <Receipt className="h-7 w-7 text-teal-400" />EXAM FEE RECEIPT
        </h1>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Generating receipt code...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Enrollment ID Field */}
          <div className="space-y-1.5">
            <label htmlFor="enrollmentId" className="block text-xs font-semibold text-slate-400">
              Enrollment ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="enrollmentId"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                onBlur={handleEnrollmentIdBlur}
                placeholder="Enter Student Enrollment ID (e.g. TCHS001)"
                className="w-full bg-slate-950/80 border border-slate-850 focus:border-teal-500/50 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors font-medium"
                required
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </div>

          {/* Date & Receipt Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Date</label>
              <input
                type="text"
                value={receiptDate}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Receipt Number</label>
              <input
                type="text"
                value={receiptNumber}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed font-semibold"
              />
            </div>
          </div>

          {/* Student Info (Fetched) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Student Name</label>
              <input
                type="text"
                value={studentName}
                readOnly
                placeholder="Lookup by Enrollment ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed placeholder-slate-700 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Course Name</label>
              <input
                type="text"
                value={courseName ? courseName.replace(/_/g, " ").toUpperCase() : ""}
                readOnly
                placeholder="Lookup by Enrollment ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed placeholder-slate-700 font-semibold"
              />
            </div>
          </div>
          {studentName && (
            <div className="space-y-1.5 animate-slide-up">
              <label htmlFor="studentEmail" className="block text-xs font-semibold text-slate-400">Email Address</label>
              <input
                type="email"
                id="studentEmail"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-slate-950/80 border border-slate-850 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none transition-colors font-medium"
              />
            </div>
          )}
          {/* Amount & Payment Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Exam Fee Amount (₹)</label>
              <input
                type="text"
                value={`₹${totalAmount.toLocaleString()}`}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-teal-400 cursor-not-allowed font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="paymentMode" className="block text-xs font-semibold text-slate-400">
                Payment Mode <span className="text-rose-500">*</span>
              </label>
              <select
                id="paymentMode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-855 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-colors font-medium cursor-pointer"
                required
              >
                <option value="">Select Payment Mode</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Credit/Debit Card">Credit/Debit Card</option>
              </select>
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="pt-2">
            <label className="flex items-start cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="h-4.5 w-4.5 mt-0.5 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 focus:ring-offset-slate-950 cursor-pointer"
                required
              />
              <span className="ml-2.5 text-xs text-slate-400 leading-normal font-medium">
                I acknowledge and agree to the payment details above. Fees once paid are non-refundable.
              </span>
            </label>
          </div>

          {lastReceipt && (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up my-4">
              <div>
                <p className="text-xs font-bold text-slate-350">Last Receipt Generated: {lastReceipt.receiptNumber}</p>
                <p className="text-[10px] text-slate-500">Registered Student: {lastReceipt.studentName} ({lastReceipt.email || "No Email"})</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSendExamEmail(lastReceipt)}
                  disabled={emailSending || !lastReceipt.email}
                  className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✉ Email Receipt
                </button>
                <button
                  type="button"
                  onClick={() => handleSendExamEmail(lastReceipt)}
                  disabled={emailSending || !lastReceipt.email}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ↻ Resend Email
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-slate-900 pt-6 mt-6 flex justify-end gap-3">
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="px-6 py-2.5 btn-secondary text-xs rounded-xl cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 btn-primary text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wide"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Generate & Print Receipt
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
