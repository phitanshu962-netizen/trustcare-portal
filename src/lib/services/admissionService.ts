import { db, storage } from "../firebase";
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  Timestamp, 
  orderBy, 
  where,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface AdmissionData {
  id?: string;
  receiptNumber: string;
  enrollmentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  studentName: string;
  photoUrl?: string;
  courseName: string;
  courseDuration: string;
  totalCourseFees: number;
  admissionFee: number;
  paymentMode: string;
  guardianRelation: string;
  guardianName: string;
  agreement: "Agreed" | "Not Agreed";
  user: string;
  date: string;
  timestamp?: any;
  branch: string;
  email?: string;
}

// Generate the next receipt number (e.g. AR-0001, AR-0024)
export async function getNextReceiptNumber(): Promise<string> {
  try {
    const admissionsRef = collection(db, "admissions");
    const snapshot = await getDocs(admissionsRef);
    let maxNum = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const receiptNo = data.receiptNumber || "";
      const match = receiptNo.match(/^AR-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return "AR-" + String(nextNum).padStart(4, "0");
  } catch (error) {
    console.error("Error generating next receipt number:", error);
    return "AR-0001";
  }
}

// Upload a student photo to Firebase Storage
export async function uploadStudentPhoto(enrollmentId: string, file: File): Promise<string> {
  try {
    const photoRef = ref(storage, `student_photos/${enrollmentId}.jpg`);
    await uploadBytes(photoRef, file);
    const downloadUrl = await getDownloadURL(photoRef);
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading student photo:", error);
    throw error;
  }
}

// Save admission and set up enrollments/feeStructures
export async function saveAdmissionData(
  formData: AdmissionData,
  photoFile?: File
): Promise<{ success: boolean; message: string }> {
  try {
    let photoUrl = formData.photoUrl || "";

    // 1. Upload photo if provided
    if (photoFile) {
      photoUrl = await uploadStudentPhoto(formData.enrollmentId, photoFile);
    }

    const completeAdmission: AdmissionData = {
      ...formData,
      photoUrl,
      timestamp: Timestamp.now()
    };

    // 2. Save Admission Document (Keyed by enrollmentId)
    await setDoc(doc(db, "admissions", formData.enrollmentId), completeAdmission);

    // 3. Save Enrollment Document
    const formattedDate = new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy
    await setDoc(doc(db, "enrollments", formData.enrollmentId), {
      enrollmentId: formData.enrollmentId,
      studentName: formData.studentName,
      course: formData.courseName,
      date: formattedDate,
      status: "Active"
    });

    // 4. Save FeeStructure Document
    // Assume if a paymentMode is selected, the Admission Fee is paid (Due is 0)
    const admissionFeeDue = formData.paymentMode ? 0 : formData.admissionFee;
    await setDoc(doc(db, "feeStructures", formData.enrollmentId), {
      enrollmentId: formData.enrollmentId,
      name: formData.studentName,
      courseName: formData.courseName,
      paymentMode: formData.paymentMode || "Cash",
      admissionFee: formData.admissionFee,
      admissionFeeDue: admissionFeeDue,
      courseFee: formData.totalCourseFees,
      courseFeeDue: formData.totalCourseFees, // Initial course fee due is full course fee
      examFee: 0,
      examFeeDue: 0,
      totalAmountDue: admissionFeeDue + formData.totalCourseFees,
      branch: formData.branch,
      userName: formData.user,
      timestamp: Timestamp.now()
    });

    // 5. Update corresponding Inquiry (match by studentName)
    try {
      const inquiriesRef = collection(db, "inquiries");
      // Lookup where fullName matches studentName
      const q = query(inquiriesRef, where("fullName", "==", formData.studentName));
      const querySnapshot = await getDocs(q);
      
      for (const inquiryDoc of querySnapshot.docs) {
        await updateDoc(doc(db, "inquiries", inquiryDoc.id), {
          admissionStatus: "Admitted",
          admissionDate: formData.date
        });
      }
    } catch (inquiryErr) {
      console.warn("Could not update inquiry status:", inquiryErr);
    }

    // 6. Log Audit Trail
    try {
      await addDoc(collection(db, "auditLogs"), {
        logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        userId: formData.user,
        action: "Admission Form Submission",
        timestamp: Timestamp.now(),
        details: JSON.stringify({
          enrollmentId: formData.enrollmentId,
          studentName: formData.studentName,
          receiptNumber: formData.receiptNumber
        })
      });
    } catch (auditErr) {
      console.warn("Could not write audit log:", auditErr);
    }

    return { success: true, message: "Admission completed successfully!" };
  } catch (error: any) {
    console.error("Error saving admission data:", error);
    return { success: false, message: error.message || "Failed to save data." };
  }
}

// Update admission photo URL
export async function updateAdmissionPhotoUrl(id: string, photoUrl: string) {
  try {
    await updateDoc(doc(db, "admissions", id), { photoUrl });
    return { success: true, message: "Photo updated successfully" };
  } catch (error: any) {
    console.error("Error updating photo:", error);
    return { success: false, message: error.message };
  }
}

// Get admissions analytics
export async function getAdmissionAnalytics(branchFilter?: string) {
  try {
    let q = query(collection(db, "admissions"), orderBy("timestamp", "desc"));
    if (branchFilter && branchFilter !== "all") {
      q = query(collection(db, "admissions"), where("branch", "==", branchFilter), orderBy("timestamp", "desc"));
    }

    const querySnapshot = await getDocs(q);
    const data: AdmissionData[] = [];
    let totalFees = 0;
    const courseCounts: { [key: string]: number } = {};

    querySnapshot.forEach((docSnap) => {
      const docData = docSnap.data();
      const row = { ...docData, id: docSnap.id } as AdmissionData;
      data.push(row);
      totalFees += Number(row.totalCourseFees || 0);

      const course = row.courseName;
      if (course) {
        courseCounts[course] = (courseCounts[course] || 0) + 1;
      }
    });

    let topCourse = "-";
    if (Object.keys(courseCounts).length > 0) {
      topCourse = Object.keys(courseCounts).reduce((a, b) => courseCounts[a] > courseCounts[b] ? a : b);
    }

    return {
      data,
      summary: {
        totalRecords: data.length,
        totalFees: totalFees,
        averageFees: data.length > 0 ? totalFees / data.length : 0,
        topCourse: topCourse
      }
    };
  } catch (error) {
    console.error("Error getting admission analytics:", error);
    return { data: [], summary: { totalRecords: 0, totalFees: 0, averageFees: 0, topCourse: "-" } };
  }
}

export async function deleteAdmission(admissionId: string) {
  try {
    await deleteDoc(doc(db, "admissions", admissionId));
    return { success: true, message: "Admission deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting admission:", error);
    return { success: false, message: error.message };
  }
}
