import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import { InquiryData } from "../lib/services/inquiryService";
import {
  getNextReceiptNumber,
  saveAdmissionData,
  AdmissionData
} from "../lib/services/admissionService";
import { getCourse, getAllCourses, Course } from "../lib/services/courseService";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Camera,
  Database,
  Info
} from "lucide-react";
import { openInstallmentReceipt } from "./CoursePaymentReceiptView";

interface AdmissionViewProps {
  userProfile: UserProfile | null;
  inquiryData: InquiryData | null;
  onGoBack: () => void;
  onAdmissionComplete: (
    enrollmentId: string,
    studentName: string,
    courseName: string,
    totalFees: number,
    branch: string,
    receiptNo: string,
    courseDuration?: string,
    guardianName?: string,
    guardianRelation?: string
  ) => void;
}

// Course configurations per branch location (fallback when Firestore is unavailable)
const getCourseConfig = (branch: string, course: string) => {
  const branchLower = (branch || "main").toLowerCase();

  const mainData: any = {
    anm_nursing: { duration: "1 Year", fees: 65000, admission_fee: 5000 },
    gnm_nursing: { duration: "3 Years", fees: 100000, admission_fee: 5000 },
    dmlt: { duration: "1 Year", fees: 70000, admission_fee: 5000 },
    ot_technician: { duration: "1 Year", fees: 30000, admission_fee: 5000 },
    general_nursing: { duration: "1 Year", fees: 30000, admission_fee: 5000 }
  };

  const karadData: any = {
    anm_nursing: { duration: "1 Year", fees: 36000, admission_fee: 3000 },
    gnm_nursing: { duration: "3 Years", fees: 95000, admission_fee: 5000 },
    dmlt: { duration: "1 Year", fees: 24000, admission_fee: 2000 },
    ot_technician: { duration: "1 Year", fees: 36000, admission_fee: 3000 },
    electrician: { duration: "1 Year", fees: 24000, admission_fee: 2000 },
    ac_refrigerator: { duration: "1 Year", fees: 24000, admission_fee: 2000 },
    basic_parlour: { duration: "2 Months", fees: 5000, admission_fee: 1000 }
  };

  const nalasaporaData: any = {
    anm_nursing: { duration: "1 Year", fees: 55000, admission_fee: 5000 },
    gnm_nursing: { duration: "3 Years", fees: 90000, admission_fee: 5000 },
    dmlt: { duration: "1 Year", fees: 30000, admission_fee: 5000 },
    ot_technician: { duration: "1 Year", fees: 30000, admission_fee: 5000 },
    general_nursing: { duration: "1 Year", fees: 30000, admission_fee: 5000 }
  };

  const thaneData: any = {
    anm_nursing: { duration: "1 Year", fees: 8500, admission_fee: 5000 },
    gnm_nursing: { duration: "3 Years", fees: 100000, admission_fee: 5000 },
    dmlt: { duration: "1 Year", fees: 700, admission_fee: 5000 },
    ot_technician: { duration: "1 Year", fees: 30000, admission_fee: 5000 },
    general_nursing: { duration: "1 Year", fees: 30000, admission_fee: 5000 }
  };

  let courseInfo = null;
  if (branchLower === "karad") courseInfo = karadData[course];
  else if (branchLower === "nalasapora") courseInfo = nalasaporaData[course];
  else if (branchLower === "thane") courseInfo = thaneData[course];
  else courseInfo = mainData[course]; // default to main

  return courseInfo || { duration: "1 Year", fees: 30000, admission_fee: 5000 };
};

const coursesPerBranch: any = {
  main: [
    { value: "anm_nursing", label: "ANM Nursing" },
    { value: "gnm_nursing", label: "GNM Nursing" },
    { value: "dmlt", label: "DMLT" },
    { value: "ot_technician", label: "OT Technician" },
    { value: "general_nursing", label: "General Nursing" }
  ],
  karad: [
    { value: "anm_nursing", label: "ANM Nursing" },
    { value: "gnm_nursing", label: "GNM Nursing" },
    { value: "dmlt", label: "DMLT" },
    { value: "ot_technician", label: "OT Technician" },
    { value: "electrician", label: "Electrician" },
    { value: "ac_refrigerator", label: "AC & Refrigerator" },
    { value: "basic_parlour", label: "Basic Parlour" }
  ],
  nalasapora: [
    { value: "anm_nursing", label: "ANM Nursing" },
    { value: "gnm_nursing", label: "GNM Nursing" },
    { value: "dmlt", label: "DMLT" },
    { value: "ot_technician", label: "OT Technician" },
    { value: "general_nursing", label: "General Nursing" }
  ],
  thane: [
    { value: "anm_nursing", label: "ANM Nursing" },
    { value: "gnm_nursing", label: "GNM Nursing" },
    { value: "dmlt", label: "DMLT" },
    { value: "ot_technician", label: "OT Technician" },
    { value: "general_nursing", label: "General Nursing" }
  ]
};

export default function AdmissionView({
  userProfile,
  inquiryData,
  onGoBack,
  onAdmissionComplete
}: AdmissionViewProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Dynamic field states
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [branch] = useState<string>(userProfile?.branch || "main");
  const [course, setCourse] = useState("");
  const [email, setEmail] = useState("");

  // List of active inquiries for dynamic loading
  const [inquiriesList, setInquiriesList] = useState<InquiryData[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState("");

  // Form inputs
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [agree, setAgree] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Use Firestore-based config with fallback to inline config
  const [config, setConfig] = useState({ duration: "1 Year", fees: 30000, admission_fee: 5000, exam_fee: 0 });
  const [courseList, setCourseList] = useState<Course[]>([]);

  // Fetch courses dynamically for dropdown
  useEffect(() => {
    getAllCourses().then((courses) => {
      setCourseList(courses.filter(c => c.active !== false));
    }).catch(() => {
      setCourseList([]);
    });
  }, []);


  // Fetch course configuration dynamically from Firestore
  useEffect(() => {
    async function loadCourseConfig() {
      if (!course) return;
      try {
        const courseData = await getCourse(course);
        if (courseData && courseData.active !== false) {
          setConfig({
            duration: courseData.duration,
            fees: courseData.fees,
            admission_fee: courseData.admissionFee || 0,
            exam_fee: courseData.examFee || 0
          });
        } else {
          // Fallback: try searching all courses
          const allCourses = await getAllCourses();
          const found = allCourses.find(c => c.courseId === course && c.active !== false);
          if (found) {
            setConfig({
              duration: found.duration,
              fees: found.fees,
              admission_fee: found.admissionFee || 0,
              exam_fee: found.examFee || 0
            });
          } else {
            // Fallback to inline config
            const fallback = getCourseConfig(branch, course);
            setConfig({
              duration: fallback.duration,
              fees: fallback.fees,
              admission_fee: fallback.admission_fee,
              exam_fee: (fallback as any).exam_fee || 0
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load course config from Firestore, using inline defaults:", err);
        const fallback = getCourseConfig(branch, course);
        setConfig({
          duration: fallback.duration,
          fees: fallback.fees,
          admission_fee: fallback.admission_fee,
          exam_fee: (fallback as any).exam_fee || 0
        });
      }
    }
    loadCourseConfig();
  }, [course, branch]);

  // Initialize field values from inquiryData prop
  useEffect(() => {
    if (inquiryData) {
      setFirstName(inquiryData.firstName || "");
      setMiddleName(inquiryData.middleName || "");
      setLastName(inquiryData.lastName || "");
      setCourse(inquiryData.interestedCourse || "");
      setEmail(inquiryData.email || "");
    }
  }, [inquiryData, userProfile]);

  // Load inquiries lists for scratch creation option
  useEffect(() => {
    async function loadInquiries() {
      try {
        const q = query(
          collection(db, "inquiries"),
          where("admissionStatus", "==", "Not Admitted")
        );
        const querySnapshot = await getDocs(q);
        const inqs: InquiryData[] = [];
        querySnapshot.forEach((docSnap) => {
          inqs.push({ id: docSnap.id, ...docSnap.data() } as InquiryData);
        });
        setInquiriesList(inqs);
      } catch (err) {
        console.warn("Error fetching inquiries:", err);
      }
    }
    loadInquiries();
  }, []);

  // Fetch next receipt number and enrollment ID on mount
  useEffect(() => {
    async function initIds() {
      setLoading(true);
      try {
        const nextReceipt = await getNextReceiptNumber();
        setReceiptNumber(nextReceipt);
        const admissionsSnapshot = await getDocs(collection(db, "admissions"));
        let maxNum = 0;
        admissionsSnapshot.forEach((docSnap) => {
          const id = docSnap.id;
          const match = id.match(/^(?:TCHS|TCIHS)(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        const nextEnrollment = "TCIHS" + String(maxNum + 1).padStart(3, "0");
        setEnrollmentId(nextEnrollment);
      } catch (err) {
        console.error("Error loading IDs:", err);
      } finally {
        setLoading(false);
      }
    }
    initIds();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setErrorMsg("Please agree to the terms and conditions.");
      return;
    }
    if (!paymentMode) {
      setErrorMsg("Please select a payment mode.");
      return;
    }
    if (!firstName || !lastName) {
      setErrorMsg("First Name and Last Name are required.");
      return;
    }
    if (!course) {
      setErrorMsg("Please select a course.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const studentName = [firstName, middleName, lastName].filter(Boolean).join(" ");

    const calculatedTotalFees = config.fees;

    const admissionDoc: AdmissionData = {
      receiptNumber,
      enrollmentId,
      firstName,
      middleName,
      lastName,
      studentName,
      courseName: course,
      courseDuration: config.duration,
      totalCourseFees: calculatedTotalFees,
      admissionFee: config.admission_fee,
      paymentMode,
      guardianRelation,
      guardianName,
      agreement: agree ? "Agreed" : "Not Agreed",
      user: userProfile?.username || "Admin",
      date: new Date().toISOString().split("T")[0],
      branch,
      email
    };

    const res = await saveAdmissionData(admissionDoc, photoFile);
    setSubmitting(false);

    if (res.success) {
      // Auto-send email to student if email exists
      if (email) {
        try {
          await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              to: email,
              type: "admission",
              data: {
                receiptNo: receiptNumber,
                date: new Date(admissionDoc.date).toLocaleDateString("en-GB"),
                studentName: studentName,
                courseName: course,
                courseDuration: config.duration,
                amountPaid: config.admission_fee,
                paymentMode: paymentMode,
                receivedBy: userProfile?.username || "Admin",
                branch: branch.toUpperCase()
              }
            })
          });
        } catch (mailErr) {
          console.warn("Error sending auto email receipt:", mailErr);
        }
      }
      // Generate and open the Admission Receipt using the installment receipt format
      openInstallmentReceipt({
        receiptNo: receiptNumber,
        date: new Date(admissionDoc.date).toLocaleDateString("en-GB"),
        studentName: studentName,
        courseName: course,
        installmentNumber: 1,
        amountPaid: config.admission_fee,
        paymentMode: paymentMode,
        receivedBy: userProfile?.username || "Admin",
        branch: branch.toUpperCase(),
        totalFees: config.admission_fee,
        totalPaidSoFar: config.admission_fee,
        balanceDue: 0,
        isAdmission: true
      });

      onAdmissionComplete(
        enrollmentId,
        studentName,
        course,
        calculatedTotalFees,
        branch,
        receiptNumber,
        config.duration,
        guardianName,
        guardianRelation
      );
    } else {
      setErrorMsg(res.message);
    }
  };

  const activeCourseOptions = coursesPerBranch.main;

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-slate-900/40 border border-slate-900/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4 glass-panel gpu-accelerated">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

      {/* Header */}
      <div className="border-b border-slate-900 pb-4 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <FileText className="h-7 w-7 text-teal-400" />ADMISSION FORM
        </h1>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Generating ID & Receipt codes...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-450" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Loader Selection if no pre-defined Inquiry */}
          {!inquiryData && inquiriesList.length > 0 && (
            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/40 border border-slate-900/60">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Load details from existing inquiry
              </label>
              <div className="flex gap-3">
                <select
                  value={selectedInquiryId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedInquiryId(id);
                    const selected = inquiriesList.find(x => x.id === id);
                    if (selected) {
                      setFirstName(selected.firstName || "");
                      setMiddleName(selected.middleName || "");
                      setLastName(selected.lastName || "");
                      setCourse(selected.interestedCourse || "");
                      setEmail(selected.email || "");
                    } else {
                      setFirstName("");
                      setMiddleName("");
                      setLastName("");
                      // Branch is fixed to Mankhurd (main)
                      setCourse("");
                      setEmail("");
                    }
                  }}
                  className="flex-1 bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2 text-sm text-slate-350 focus:outline-none focus:border-teal-500/50 cursor-pointer"
                >
                  <option value="">-- Start New Admission from Scratch --</option>
                  {inquiriesList.map(inq => (
                    <option key={inq.id} value={inq.id}>
                      {inq.fullName || `${inq.firstName} ${inq.lastName}`} ({inq.phoneNo}) - {(inq.interestedCourse || "").replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                <Info className="h-3 w-3" />
                Selecting an inquiry will populate the student details below. Leave blank to write manually.
              </p>
            </div>
          )}

          {/* Receipt Info */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Receipt Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Receipt Number</label>
                <input
                  type="text"
                  value={receiptNumber}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed font-semibold"
                  readOnly
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Enrollment ID</label>
                <input
                  type="text"
                  value={enrollmentId}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed font-semibold tracking-wider"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">First Name*</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 font-medium ${inquiryData ? 'bg-slate-900 text-slate-400 cursor-not-allowed' : ''}`}
                  readOnly={!!inquiryData}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className={`w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 font-medium ${inquiryData ? 'bg-slate-900 text-slate-400 cursor-not-allowed' : ''}`}
                  readOnly={!!inquiryData}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Last Name*</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 font-medium ${inquiryData ? 'bg-slate-900 text-slate-400 cursor-not-allowed' : ''}`}
                  readOnly={!!inquiryData}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 font-medium ${inquiryData ? 'bg-slate-900 text-slate-400 cursor-not-allowed' : ''}`}
                  readOnly={!!inquiryData}
                  placeholder="student@example.com"
                />
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Photo Upload</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <label htmlFor="student_photo" className="block text-xs font-semibold text-slate-400">
                  Select Profile Photo
                </label>
                <input
                  type="file"
                  id="student_photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20 file:cursor-pointer transition-colors"
                />
              </div>
              <div className="flex items-center justify-center min-h-[140px] border-2 border-dashed border-slate-800 rounded-2xl p-2 bg-slate-950/40">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Student Preview"
                    className="max-h-32 object-contain rounded-xl shadow-md border border-slate-900"
                  />
                ) : (
                  <span className="text-xs text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-slate-700" />
                    No Photo Selected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Course Details */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Course Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Branch*</label>
                <input
                  type="text"
                  value={branch === "main" ? "Mankhurd (Main)" : branch.charAt(0).toUpperCase() + branch.slice(1)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed font-semibold"
                  readOnly
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="course_select" className="block text-xs font-semibold text-slate-400">Course Selected*</label>
                <select
                  id="course_select"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className={`w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-350 focus:outline-none focus:border-teal-500/50 font-medium cursor-pointer ${inquiryData ? 'bg-slate-900 text-slate-400 cursor-not-allowed' : ''}`}
                  disabled={!!inquiryData}
                  required
                >
                  <option value="">Select Course</option>
                  {courseList.length === 0 ? (
                    <option value="" disabled>No courses available</option>
                  ) : (
                    courseList.map((c) => (
                      <option key={c.courseId} value={c.courseId}>{c.courseName}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {course && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Course Duration</label>
                  <input
                    type="text"
                    value={config.duration}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed font-medium"
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Course Fees</label>
                  <input
                    type="text"
                    value={`₹${config.fees.toLocaleString()}`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-teal-400 cursor-not-allowed font-bold"
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Admission Fee</label>
                  <input
                    type="text"
                    value={`₹${config.admission_fee.toLocaleString()}`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-indigo-400 cursor-not-allowed font-bold"
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Exam Fee</label>
                  <input
                    type="text"
                    value={`₹${(config.exam_fee || 0).toLocaleString()}`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-amber-400 cursor-not-allowed font-bold"
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Details</h2>
            <div className="space-y-1.5">
              <label htmlFor="payment_mode" className="block text-xs font-semibold text-slate-400">Admission Payment Mode*</label>
              <select
                id="payment_mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-350 focus:outline-none focus:border-teal-500/50 font-medium cursor-pointer"
                required
              >
                <option value="">Select Mode</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Bank Check / Cheque</option>
              </select>
            </div>
          </div>

          {/* Guardian Info */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="guardian_relation" className="block text-xs font-semibold text-slate-400">Guardian Relation</label>
                <input
                  type="text"
                  id="guardian_relation"
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 font-medium"
                  placeholder="e.g. Father, Mother, Spouse"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="guardian_name" className="block text-xs font-semibold text-slate-400">Guardian Full Name</label>
                <input
                  type="text"
                  id="guardian_name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 font-medium"
                  placeholder="Enter full name"
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-slate-900 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <label className="inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 focus:ring-offset-slate-950 cursor-pointer"
                  required
                />
                <span className="ml-2.5 text-xs text-slate-400 font-medium">I agree to terms, conditions and admission requirements</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onGoBack}
                className="px-6 py-2.5 btn-secondary text-xs rounded-xl cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 btn-primary text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wide"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Next
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}