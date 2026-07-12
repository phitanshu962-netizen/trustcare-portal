import { db } from "../firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    addDoc
} from "firebase/firestore";

export interface Course {
    id?: string;
    courseId: string;
    courseName: string;
    duration: string;
    fees: number;
    admissionFee: number;
    examFee?: number;
    active: boolean;
    createdAt?: any;
    updatedAt?: any;
    createdBy?: string;
}

// Get all courses
export async function getAllCourses(): Promise<Course[]> {
    try {
        const q = query(
            collection(db, "courses"),
            orderBy("courseName", "asc")
        );
        const snapshot = await getDocs(q);
        const courses: Course[] = [];
        snapshot.forEach((docSnap) => {
            courses.push({ ...docSnap.data(), id: docSnap.id } as Course);
        });
        return courses;
    } catch (error) {
        console.error("Error fetching all courses:", error);
        return [];
    }
}

// Get a single course by courseId (uses field query to handle old doc ID formats)
export async function getCourse(courseId: string): Promise<Course | null> {
    try {
        const q = query(collection(db, "courses"), where("courseId", "==", courseId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            return { ...docSnap.data(), id: docSnap.id } as Course;
        }
        return null;
    } catch (error) {
        console.error("Error fetching course:", error);
        return null;
    }
}

// Save or update a course
export async function saveCourse(data: {
    courseId: string;
    courseName: string;
    duration: string;
    fees: number;
    admissionFee: number;
    examFee?: number;
    createdBy?: string;
}): Promise<{ success: boolean; message?: string }> {
    try {
        const docRef = doc(db, "courses", data.courseId);
        const existingDoc = await getDoc(docRef);

        if (existingDoc.exists()) {
            await updateDoc(docRef, {
                courseName: data.courseName,
                duration: data.duration,
                fees: Number(data.fees),
                admissionFee: Number(data.admissionFee),
                examFee: Number(data.examFee || 0),
                updatedAt: Timestamp.now(),
                createdBy: data.createdBy || "Admin"
            });
        } else {
            await setDoc(docRef, {
                courseId: data.courseId,
                courseName: data.courseName,
                duration: data.duration,
                fees: Number(data.fees),
                admissionFee: Number(data.admissionFee),
                examFee: Number(data.examFee || 0),
                active: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                createdBy: data.createdBy || "Admin"
            });
        }

        await addDoc(collection(db, "auditLogs"), {
            logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            userId: data.createdBy || "Admin",
            action: existingDoc.exists() ? "Course Updated" : "Course Created",
            timestamp: Timestamp.now(),
            details: JSON.stringify({
                courseId: data.courseId,
                courseName: data.courseName,
                fees: data.fees,
                duration: data.duration,
                examFee: data.examFee || 0
            })
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error saving course:", error);
        return { success: false, message: error.message };
    }
}

// Helper to update all documents matching a courseId (handles old doc ID formats)
async function updateAllCoursesByCourseId(courseId: string, updates: Record<string, any>): Promise<number> {
    const q = query(collection(db, "courses"), where("courseId", "==", courseId));
    const snapshot = await getDocs(q);
    const updatePromises: Promise<void>[] = [];
    snapshot.forEach((docSnap) => {
        updatePromises.push(updateDoc(docSnap.ref, updates));
    });
    if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
    }
    return updatePromises.length;
}

// Deactivate all documents matching this courseId
export async function deactivateCourse(courseId: string, userId?: string): Promise<{ success: boolean; message?: string }> {
    try {
        const count = await updateAllCoursesByCourseId(courseId, { active: false, updatedAt: Timestamp.now() });

        await addDoc(collection(db, "auditLogs"), {
            logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            userId: userId || "Admin",
            action: "Course Deactivated",
            timestamp: Timestamp.now(),
            details: JSON.stringify({ courseId, updatedCount: count })
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deactivating course:", error);
        return { success: false, message: error.message };
    }
}

// Reactivate all documents matching this courseId
export async function activateCourse(courseId: string, userId?: string): Promise<{ success: boolean; message?: string }> {
    try {
        const count = await updateAllCoursesByCourseId(courseId, { active: true, updatedAt: Timestamp.now() });

        await addDoc(collection(db, "auditLogs"), {
            logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            userId: userId || "Admin",
            action: "Course Reactivated",
            timestamp: Timestamp.now(),
            details: JSON.stringify({ courseId, updatedCount: count })
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error reactivating course:", error);
        return { success: false, message: error.message };
    }
}

// Permanently delete a course document from Firestore
// Queries by courseId field to handle old doc ID formats (e.g. "kurla_anm_nursing")
export async function deleteCourse(courseId: string, userId?: string): Promise<{ success: boolean; message?: string }> {
    try {
        // Query for ALL documents with this courseId field value
        const q = query(collection(db, "courses"), where("courseId", "==", courseId));
        const snapshot = await getDocs(q);

        let deletedCount = 0;
        const deletePromises: Promise<void>[] = [];

        snapshot.forEach((docSnap) => {
            deletePromises.push(deleteDoc(docSnap.ref));
            deletedCount++;
        });

        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }

        await addDoc(collection(db, "auditLogs"), {
            logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            userId: userId || "Admin",
            action: "Course Permanently Deleted",
            timestamp: Timestamp.now(),
            details: JSON.stringify({ courseId, deletedCount })
        });

        console.log(`Deleted ${deletedCount} document(s) for courseId: ${courseId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting course:", error);
        return { success: false, message: error.message };
    }
}
