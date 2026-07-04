import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  Timestamp, 
  orderBy,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

export interface InquiryData {
  id?: string;
  date: string;
  aadharNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName?: string;
  qualification: string;
  age: number;
  gender: string;
  phoneNo: string;
  whatsappNo: string;
  parentsNo: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  pincode: string;
  address?: string;
  interestedCourse: string;
  inquiryTakenBy: string;
  branch: string;
  status?: string;
  admissionStatus?: "Not Admitted" | "Admitted";
  timestamp?: any;
  loggedInUserId?: string;
}

// Check if Aadhar exists in inquiries collection
export async function checkAadharNumberInquiry(aadharNumber: string): Promise<InquiryData | null> {
  try {
    const q = query(collection(db, "inquiries"), where("aadharNumber", "==", aadharNumber));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as InquiryData;
  } catch (error) {
    console.error("Error checking Aadhar number:", error);
    throw error;
  }
}

// Submit or update inquiry
export async function submitInquiryData(formData: InquiryData): Promise<{ success: boolean; message: string; data?: InquiryData }> {
  try {
    // Basic validation
    const required = ["aadharNumber", "firstName", "lastName", "phoneNo", "interestedCourse", "branch"];
    for (const field of required) {
      if (!formData[field as keyof InquiryData]) {
        return { success: false, message: `Missing required field: ${field}` };
      }
    }

    // Build combined fields
    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
    const address = [formData.addressLine1, formData.addressLine2, formData.addressLine3, `Pincode: ${formData.pincode}`].filter(Boolean).join(", ");
    
    const completeData: any = {
      ...formData,
      fullName,
      address,
      status: formData.status || "New Inquiry",
      admissionStatus: formData.admissionStatus || "Not Admitted",
      timestamp: Timestamp.now()
    };

    // Check if duplicate exists (Aadhar lookup)
    const existing = await checkAadharNumberInquiry(formData.aadharNumber);
    
    if (existing && existing.id) {
      // Update existing record
      const docRef = doc(db, "inquiries", existing.id);
      await updateDoc(docRef, completeData);
      return { 
        success: true, 
        message: "Inquiry record updated successfully!", 
        data: { id: existing.id, ...completeData } 
      };
    } else {
      // Add new record
      const docRef = await addDoc(collection(db, "inquiries"), completeData);
      return { 
        success: true, 
        message: "New inquiry added successfully!", 
        data: { id: docRef.id, ...completeData } 
      };
    }
  } catch (error: any) {
    console.error("Error submitting inquiry data:", error);
    return { success: false, message: error.message || "Failed to save/update data in Firestore." };
  }
}

// Get inquiry analytics and records
export async function getInquiryAnalytics(branchFilter?: string) {
  try {
    let q = query(collection(db, "inquiries"), orderBy("timestamp", "desc"));
    if (branchFilter && branchFilter !== "all") {
      q = query(collection(db, "inquiries"), where("branch", "==", branchFilter), orderBy("timestamp", "desc"));
    }
    
    const querySnapshot = await getDocs(q);
    const data: InquiryData[] = [];
    const courseCounts: { [key: string]: number } = {};
    
    querySnapshot.forEach((docSnap) => {
      const docData = docSnap.data();
      const row = { id: docSnap.id, ...docData } as InquiryData;
      data.push(row);
      
      const course = row.interestedCourse;
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
        uniqueCourses: Object.keys(courseCounts).length,
        topCourse: topCourse
      }
    };
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return { data: [], summary: { totalRecords: 0, uniqueCourses: 0, topCourse: "-" } };
  }
}

export async function deleteInquiry(inquiryId: string) {
  try {
    await deleteDoc(doc(db, "inquiries", inquiryId));
    return { success: true, message: "Inquiry deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting inquiry:", error);
    return { success: false, message: error.message };
  }
}
