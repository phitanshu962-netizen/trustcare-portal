import { db } from "../firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp,
  orderBy,
  deleteDoc
} from "firebase/firestore";

export interface Installment {
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: "Pending" | "Paid";
  type?: string;
}

export interface PaymentSchedule {
  enrollmentId: string;
  studentName: string;
  courseName: string;
  paymentType: "full" | "partial" | "emi";
  totalFee: number;
  installments: Installment[];
  timestamp?: any;
  loggedInUser?: string;
}

export interface InstallmentPaymentRecord {
  installmentNumber: number;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  user: string;
  timestamp: any;
}

export interface StudentPaymentHistory {
  enrollmentId: string;
  studentName: string;
  courseName: string;
  selectedPaymentOption: string;
  courseFee: number;
  courseDuration: string;
  courseYear: number;
  payments: InstallmentPaymentRecord[];
  amountPaid: number;
  paymentMethod: string;
  user: string;
  timestamp?: any;
}

export interface ExamReceiptData {
  id?: string;
  receiptDate: string;
  receiptNumber: string;
  enrollmentId: string;
  studentName: string;
  courseName: string;
  totalAmount: number;
  paymentMode: string;
  agreeTerms: "Agreed" | "Not Agreed";
  timestamp?: any;
  userId: string;
}

// Get student data by enrollment ID for payment module
export async function getStudentDataByEnrollmentId(enrollmentId: string) {
  try {
    // 1. Check admissions collection
    const admissionDoc = await getDoc(doc(db, "admissions", enrollmentId));
    if (admissionDoc.exists()) {
      const data = admissionDoc.data();
      return {
        success: true,
        enrollmentId,
        firstName: data.firstName || "",
        middleName: data.middleName || "",
        lastName: data.lastName || "",
        courseName: data.courseName || "",
        receiptNumber: data.receiptNumber || "",
        studentName: data.studentName || `${data.firstName} ${data.middleName} ${data.lastName}`.trim(),
        branch: data.branch || "kurla",
        courseDuration: data.courseDuration || "",
        totalCourseFees: data.totalCourseFees || 0,
        admissionFee: data.admissionFee || 0,
        examFee: data.examFee || 0,
        guardianName: data.guardianName || "",
        guardianRelation: data.guardianRelation || "",
        email: data.email || "",
        photoUrl: data.photoUrl || ""
      };
    }

    // 2. Check feeStructures collection
    const feeDoc = await getDoc(doc(db, "feeStructures", enrollmentId));
    if (feeDoc.exists()) {
      const data = feeDoc.data();
      return {
        success: true,
        enrollmentId,
        firstName: "",
        middleName: "",
        lastName: "",
        courseName: data.courseName || "",
        receiptNumber: "",
        studentName: data.name || "",
        branch: data.branch || "kurla"
      };
    }

    return { success: false, error: "Enrollment ID not found" };
  } catch (error: any) {
    console.error("Error fetching student payment data:", error);
    return { success: false, error: error.message };
  }
}

// Save course payment setup to feeStructures
export async function saveCoursePayment(data: {
  enrollmentId: string;
  studentName: string;
  courseName: string;
  paymentMode: string;
  totalFees: number;
  coursePayFees: number;
  paymentType?: string;
  loggedInUserId: string;
  branch: string;
}) {
  try {
    const feeRef = doc(db, "feeStructures", data.enrollmentId);
    const feeDoc = await getDoc(feeRef);

    if (feeDoc.exists()) {
      const current = feeDoc.data();
      const currentTotalDue = Number(current.totalAmountDue || 0);

      if (data.paymentType === "full" || data.paymentType === "partial" || data.paymentType === "emi") {
        // Confirmation/setup - initialize fields
        await updateDoc(feeRef, {
          courseFee: Number(data.coursePayFees),
          courseFeeDue: Number(data.coursePayFees),
          totalAmountDue: Math.max(0, currentTotalDue),
          paymentMode: data.paymentMode || "Cash",
          timestamp: Timestamp.now()
        });
      } else {
        // Regular payment update - add to courseFee and reduce due
        const newCourseFee = Number(current.courseFee || 0) + Number(data.coursePayFees);
        const newCourseFeeDue = Math.max(0, Number(current.courseFeeDue || 0) - Number(data.coursePayFees));
        const newTotalDue = Math.max(0, currentTotalDue - Number(data.coursePayFees));

        await updateDoc(feeRef, {
          courseFee: newCourseFee,
          courseFeeDue: newCourseFeeDue,
          totalAmountDue: newTotalDue,
          paymentMode: data.paymentMode || "Cash",
          timestamp: Timestamp.now()
        });
      }
    } else {
      // Create new fee structure
      await setDoc(feeRef, {
        enrollmentId: data.enrollmentId,
        name: data.studentName,
        courseName: data.courseName,
        paymentMode: data.paymentMode || "Cash",
        admissionFee: 0,
        admissionFeeDue: 0,
        courseFee: Number(data.coursePayFees || data.totalFees),
        courseFeeDue: Number(data.coursePayFees || data.totalFees),
        examFee: 0,
        examFeeDue: 0,
        totalAmountDue: Number(data.coursePayFees || data.totalFees),
        branch: data.branch || "kurla",
        userName: data.loggedInUserId || "Admin",
        timestamp: Timestamp.now()
      });
    }

    // Log to auditLogs
    await addDoc(collection(db, "auditLogs"), {
      logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: data.loggedInUserId || "Admin",
      action: "Course Payment Selection Saved",
      timestamp: Timestamp.now(),
      details: JSON.stringify({ enrollmentId: data.enrollmentId, paymentType: data.paymentType })
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error saving course payment:", error);
    return { success: false, message: error.message };
  }
}

// Save installment schedule
export async function saveInstallmentSchedule(data: PaymentSchedule) {
  try {
    const docRef = doc(db, "installmentSchedules", data.enrollmentId);
    await setDoc(docRef, {
      ...data,
      timestamp: Timestamp.now()
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error saving installment schedule:", error);
    return { success: false, message: error.message };
  }
}

// Load installment schedule
export async function loadInstallmentSchedule(enrollmentId: string): Promise<Installment[]> {
  try {
    const docRef = doc(db, "installmentSchedules", enrollmentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as PaymentSchedule;
      return (data.installments || []).sort((a, b) => a.installmentNumber - b.installmentNumber);
    }
    return [];
  } catch (error) {
    console.error("Error loading installment schedule:", error);
    return [];
  }
}

// Load installment payments for student
export async function getInstallmentPaymentsForStudent(enrollmentId: string): Promise<StudentPaymentHistory | null> {
  try {
    const docSnap = await getDoc(doc(db, "installmentPayments", enrollmentId));
    if (docSnap.exists()) {
      return docSnap.data() as StudentPaymentHistory;
    }
    return null;
  } catch (error) {
    console.error("Error loading installment payments:", error);
    return null;
  }
}

// Save an installment payment
export async function saveInstallmentPayment(data: {
  enrollmentId: string;
  studentName: string;
  courseName: string;
  installmentNumber: number;
  installmentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  loggedInUser: string;
}) {
  try {
    if (!data.enrollmentId) {
      return { success: false, message: "Enrollment ID is required to save an installment payment." };
    }

    const paymentRef = doc(db, "installmentPayments", data.enrollmentId);
    const paymentDoc = await getDoc(paymentRef);

    const newPaymentRecord: InstallmentPaymentRecord = {
      installmentNumber: data.installmentNumber,
      amountPaid: data.installmentAmount,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate,
      user: data.loggedInUser,
      timestamp: Timestamp.now()
    };

    let updatedHistory: StudentPaymentHistory;

    if (paymentDoc.exists()) {
      const current = paymentDoc.data() as StudentPaymentHistory;
      
      // Check duplicate
      const alreadyPaid = (current.payments || []).some(p => p.installmentNumber === data.installmentNumber);
      if (alreadyPaid) {
        return { success: false, message: `Installment ${data.installmentNumber} has already been paid.` };
      }

      const payments = [...(current.payments || []), newPaymentRecord];
      const amountPaid = payments.reduce((acc, curr) => acc + curr.amountPaid, 0);

      updatedHistory = {
        ...current,
        payments,
        amountPaid,
        paymentMethod: data.paymentMethod,
        user: data.loggedInUser,
        timestamp: Timestamp.now()
      };
      
      await updateDoc(paymentRef, { ...updatedHistory });
    } else {
      updatedHistory = {
        enrollmentId: data.enrollmentId,
        studentName: data.studentName,
        courseName: data.courseName,
        selectedPaymentOption: "installment",
        courseFee: data.installmentAmount,
        courseDuration: "",
        courseYear: 1,
        payments: [newPaymentRecord],
        amountPaid: data.installmentAmount,
        paymentMethod: data.paymentMethod,
        user: data.loggedInUser,
        timestamp: Timestamp.now()
      };
      
      await setDoc(paymentRef, updatedHistory);
    }

    // Update schedule status to Paid
    const scheduleRef = doc(db, "installmentSchedules", data.enrollmentId);
    const scheduleDoc = await getDoc(scheduleRef);
    if (scheduleDoc.exists()) {
      const scheduleData = scheduleDoc.data() as PaymentSchedule;
      const installments = (scheduleData.installments || []).map(inst => {
        if (inst.installmentNumber === data.installmentNumber) {
          return { ...inst, status: "Paid" as const };
        }
        return inst;
      });
      await updateDoc(scheduleRef, { installments });
    }

    // Update FeeStructure balances
    const feeRef = doc(db, "feeStructures", data.enrollmentId);
    const feeDoc = await getDoc(feeRef);
    if (feeDoc.exists()) {
      const currentFee = feeDoc.data();
      const currentCourseFeeDue = Number(currentFee.courseFeeDue || 0);
      const currentTotalDue = Number(currentFee.totalAmountDue || 0);

      await updateDoc(feeRef, {
        courseFeeDue: Math.max(0, currentCourseFeeDue - data.installmentAmount),
        totalAmountDue: Math.max(0, currentTotalDue - data.installmentAmount),
        timestamp: Timestamp.now()
      });
    }

    // Log to auditLogs
    await addDoc(collection(db, "auditLogs"), {
      logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: data.loggedInUser,
      action: "Installment Payment Recorded",
      timestamp: Timestamp.now(),
      details: JSON.stringify({ 
        enrollmentId: data.enrollmentId, 
        installmentNumber: data.installmentNumber, 
        amount: data.installmentAmount 
      })
    });

    return { success: true, data: updatedHistory };
  } catch (error: any) {
    console.error("Error saving installment payment:", error);
    return { success: false, message: error.message };
  }
}

// Save Exam Receipt
export async function saveExamReceipt(data: ExamReceiptData) {
  try {
    const receiptRef = await addDoc(collection(db, "examReceipts"), {
      ...data,
      timestamp: Timestamp.now()
    });

    // Update feeStructures exam fees
    const feeRef = doc(db, "feeStructures", data.enrollmentId);
    const feeDoc = await getDoc(feeRef);

    if (feeDoc.exists()) {
      const current = feeDoc.data();
      const currentExamFee = Number(current.examFee || 0);
      const currentExamFeeDue = Number(current.examFeeDue || 0);
      const currentTotalDue = Number(current.totalAmountDue || 0);

      // Save updated values
      await updateDoc(feeRef, {
        examFee: currentExamFee + Number(data.totalAmount),
        examFeeDue: Math.max(0, currentExamFeeDue - Number(data.totalAmount)),
        timestamp: Timestamp.now()
      });
    }

    // Log Audit
    await addDoc(collection(db, "auditLogs"), {
      logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: data.userId,
      action: "Exam Receipt Generated",
      timestamp: Timestamp.now(),
      details: JSON.stringify({ receiptNumber: data.receiptNumber, amount: data.totalAmount })
    });

    return { success: true, id: receiptRef.id };
  } catch (error: any) {
    console.error("Error saving exam receipt:", error);
    return { success: false, message: error.message };
  }
}

// Generate the next Exam Fee receipt number (e.g. ER-0001)
export async function getNextReceiptNumberEF(): Promise<string> {
  try {
    const receiptsRef = collection(db, "examReceipts");
    const snapshot = await getDocs(receiptsRef);
    let maxNum = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const receiptNo = data.receiptNumber || "";
      const match = receiptNo.match(/^ER-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return "ER-" + String(nextNum).padStart(4, "0");
  } catch (error) {
    console.error("Error generating next exam receipt number:", error);
    return "ER-0001";
  }
}


// Fetch Master Fee Structure list
export async function getFeeStructureData(branchFilter?: string) {
  try {
    let q = query(collection(db, "feeStructures"), orderBy("timestamp", "desc"));
    if (branchFilter && branchFilter !== "all") {
      q = query(collection(db, "feeStructures"), where("branch", "==", branchFilter), orderBy("timestamp", "desc"));
    }

    const querySnapshot = await getDocs(q);
    const data: any[] = [];
    let totalAdmissionFees = 0;
    let totalCourseFees = 0;
    let totalExamFees = 0;
    let totalAmountDue = 0;
    const paymentModeCounts: { [key: string]: number } = {};

    querySnapshot.forEach((docSnap) => {
      const row = { ...docSnap.data(), id: docSnap.id } as any;
      data.push(row);

      totalAdmissionFees += Number(row.admissionFee || 0);
      totalCourseFees += Number(row.courseFee || 0);
      totalExamFees += Number(row.examFee || 0);
      totalAmountDue += Number(row.totalAmountDue || 0);

      const mode = row.paymentMode;
      if (mode) {
        paymentModeCounts[mode] = (paymentModeCounts[mode] || 0) + 1;
      }
    });

    let commonMode = "";
    let maxCount = 0;
    for (const mode in paymentModeCounts) {
      if (paymentModeCounts[mode] > maxCount) {
        maxCount = paymentModeCounts[mode];
        commonMode = mode;
      }
    }

    return {
      data,
      summary: {
        totalRecords: data.length,
        totalAdmissionFees,
        totalCourseFees,
        totalExamFees,
        totalAmountDue,
        mostCommonPaymentMode: commonMode
      }
    };
  } catch (error) {
    console.error("Error getting fee structure data:", error);
    return { data: [], summary: { totalRecords: 0, totalAdmissionFees: 0, totalCourseFees: 0, totalExamFees: 0, totalAmountDue: 0, mostCommonPaymentMode: "" } };
  }
}

// Delete fee structure and related installment schedule/payments
export async function deleteFeeStructure(enrollmentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    await deleteDoc(doc(db, "feeStructures", enrollmentId));
    await deleteDoc(doc(db, "installmentSchedules", enrollmentId));
    await deleteDoc(doc(db, "installmentPayments", enrollmentId));
    
    // Log to auditLogs
    await addDoc(collection(db, "auditLogs"), {
      logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: "Admin",
      action: "Fee Structure Deleted",
      timestamp: Timestamp.now(),
      details: JSON.stringify({ enrollmentId })
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting fee structure:", error);
    return { success: false, message: error.message };
  }
}
