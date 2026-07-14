import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import {
  checkAadharNumberInquiry,
  submitInquiryData,
  InquiryData
} from "../lib/services/inquiryService";
import { getAllCourses, Course } from "../lib/services/courseService";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Contact,
  Calendar,
  Phone,
  Send,
  Sparkles,
  X,
  Plus
} from "lucide-react";

interface InquiryViewProps {
  userProfile: UserProfile | null;
  onTakeAdmission: (data: InquiryData) => void;
}

export default function InquiryView({ userProfile, onTakeAdmission }: InquiryViewProps) {
  const initialFormState: InquiryData = {
    date: new Date().toISOString().split("T")[0],
    aadharNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    qualification: "",
    age: 0,
    gender: "",
    phoneNo: "",
    whatsappNo: "",
    parentsNo: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    pincode: "",
    interestedCourse: "",
    inquiryTakenBy: userProfile?.username || "",
    branch: userProfile?.branch || "kurla"
  };

  const [formData, setFormData] = useState<InquiryData>(initialFormState);
  const [agree, setAgree] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [aadharFound, setAadharFound] = useState<InquiryData | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [courseList, setCourseList] = useState<Course[]>([]);

  // Fetch courses dynamically
  useEffect(() => {
    getAllCourses().then((courses) => {
      setCourseList(courses.filter(c => c.active !== false));
    }).catch(() => {
      setCourseList([]);
    });
  }, []);

  // Update branch and inquiry taken by when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        branch: userProfile.branch,
        inquiryTakenBy: userProfile.username
      }));
    }
  }, [userProfile]);

  // Aadhaar checking logic
  const handleAadharChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
    setFormData(prev => ({ ...prev, aadharNumber: val }));

    if (val.length === 12) {
      setLookupLoading(true);
      try {
        const record = await checkAadharNumberInquiry(val);
        if (record) {
          setAadharFound(record);
          setShowPopup(true);
        }
      } catch (err) {
        console.error("Aadhaar lookup error:", err);
      } finally {
        setLookupLoading(false);
      }
    }
  };

  const fillFormFromPopup = () => {
    if (aadharFound) {
      setFormData({
        ...formData,
        ...aadharFound,
        // Make sure we keep the new date/Aadhaar/takenBy if not in lookup
        date: formData.date,
        aadharNumber: aadharFound.aadharNumber || formData.aadharNumber,
        branch: userProfile?.branch || aadharFound.branch || "main"
      });
      setShowPopup(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setErrorMsg("Please agree to the terms and conditions.");
      return;
    }

    setSuccessMsg("");
    setErrorMsg("");

    const res = await submitInquiryData({
      ...formData,
      loggedInUserId: userProfile?.username || "Guest"
    });

    if (res.success) {
      setSuccessMsg(res.message);
      // Reset form (keep branch and taken by)
      setFormData({
        ...initialFormState,
        branch: userProfile?.branch || "main",
        inquiryTakenBy: userProfile?.username || ""
      });
      setAgree(false);
      setAadharFound(null);
      // Auto clear success message after 4s
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleTakeAdmission = async () => {
    if (!formData.firstName || !formData.lastName || !formData.interestedCourse) {
      setErrorMsg("Please fill out basic student details (First Name, Last Name, and Course) first.");
      return;
    }

    // First, save/submit the inquiry to Firestore
    setErrorMsg("");
    setSuccessMsg("");

    const res = await submitInquiryData({
      ...formData,
      loggedInUserId: userProfile?.username || "Guest"
    });

    if (!res.success) {
      setErrorMsg("Failed to save inquiry before admission: " + res.message);
      return;
    }

    // Set combined full name before sending
    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ");
    const address = [formData.addressLine1, formData.addressLine2, `Pincode: ${formData.pincode}`].filter(Boolean).join(", ");

    onTakeAdmission({
      ...formData,
      fullName,
      address
    });
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-slate-900/40 border border-slate-900/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4 glass-panel gpu-accelerated">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

      {/* Header */}
      <div className="border-b border-slate-900 pb-4 mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <FileText className="h-7 w-7 text-teal-400" />INQUIRY FORM
        </h1>

        
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-450" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Personal Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aadhar Number */}
            <div className="space-y-1.5">
              <label htmlFor="aadharNumber" className="block text-xs font-semibold text-slate-400">
                Aadhar Number (12 Digits)
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleAadharChange}
                  className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-750 focus:outline-none focus:border-teal-500/50 transition-colors font-medium tracking-wider"
                  placeholder="e.g. 123456789012"
                  maxLength={12}
                  required
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 flex items-center">
                  {lookupLoading ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-teal-400" />
                  ) : formData.aadharNumber.length === 12 ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                  ) : (
                    <Contact className="h-4.5 w-4.5 text-slate-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label htmlFor="date" className="block text-xs font-semibold text-slate-400">
                Inquiry Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Names */}
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="block text-xs font-semibold text-slate-400">First Name*</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="middleName" className="block text-xs font-semibold text-slate-400">Middle Name</label>
              <input
                type="text"
                id="middleName"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="block text-xs font-semibold text-slate-400">Last Name*</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Qualification */}
            <div className="space-y-1.5">
              <label htmlFor="qualification" className="block text-xs font-semibold text-slate-400">Qualification*</label>
              <input
                type="text"
                id="qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                required
              />
            </div>
            {/* Age */}
            <div className="space-y-1.5">
              <label htmlFor="age" className="block text-xs font-semibold text-slate-400">Age*</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                required
                min={0}
              />
            </div>
            {/* Gender */}
            <div className="space-y-1.5">
              <label htmlFor="gender" className="block text-xs font-semibold text-slate-400">Gender*</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors font-medium cursor-pointer"
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-1.5">
              <label htmlFor="interestedCourse" className="block text-xs font-semibold text-slate-400">Select Course*</label>
              <select
                id="interestedCourse"
                name="interestedCourse"
                value={formData.interestedCourse}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors font-medium cursor-pointer"
                required
              >
                <option value="">Select Course</option>
                {courseList.length === 0 ? (
                  <option value="" disabled>No courses available for this branch</option>
                ) : (
                  courseList.map((course) => (
                    <option key={course.id} value={course.courseId}>
                      {course.courseName} ({course.duration})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inquiryTakenBy" className="block text-xs font-semibold text-slate-400">Inquiry Taken By</label>
              <input
                type="text"
                id="inquiryTakenBy"
                name="inquiryTakenBy"
                value={formData.inquiryTakenBy}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="branch" className="block text-xs font-semibold text-slate-400">Branch</label>
              <input
                type="text"
                id="branch"
                name="branch"
                value={formData.branch}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed capitalize font-semibold"
                readOnly
              />
            </div>
          </div>

        {/* Contact Info Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="phoneNo" className="block text-xs font-semibold text-slate-400">Phone*</label>
              <input
                type="tel"
                id="phoneNo"
                name="phoneNo"
                value={formData.phoneNo}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNo: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                placeholder="10 digit number"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="whatsappNo" className="block text-xs font-semibold text-slate-400">WhatsApp*</label>
              <input
                type="tel"
                id="whatsappNo"
                name="whatsappNo"
                value={formData.whatsappNo}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsappNo: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                placeholder="10 digit number"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="parentsNo" className="block text-xs font-semibold text-slate-400">Parents No*</label>
              <input
                type="tel"
                id="parentsNo"
                name="parentsNo"
                value={formData.parentsNo}
                onChange={(e) => setFormData(prev => ({ ...prev, parentsNo: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
                className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                placeholder="10 digit number"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-400">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full bg-slate-955 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
              placeholder="e.g. email@example.com"
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Address Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="addressLine1" className="block text-xs font-semibold text-slate-400">Address Line 1*</label>
              <input
                type="text"
                id="addressLine1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="addressLine2" className="block text-xs font-semibold text-slate-400">Address Line 2</label>
              <input
                type="text"
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleInputChange}
                className="w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pincode" className="block text-xs font-semibold text-slate-400">Pincode*</label>
              <input
                type="text"
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value.replace(/[^\d]/g, "").slice(0, 6) }))}
                className="w-full bg-slate-950/80 border border-slate-855 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors font-medium tracking-widest"
                placeholder="6 digits"
                required
              />
            </div>
          </div>
        </div>



        {/* Footer Actions */}
        <div className="border-t border-slate-900 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <label className="inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                id="agree"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="h-4.5 w-4.5 text-teal-500 border-slate-800 bg-slate-950 rounded focus:ring-teal-500/30 focus:ring-offset-slate-950 cursor-pointer"
                required
              />
              <span className="ml-2.5 text-xs text-slate-400 font-medium">I agree to the terms and conditions</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 w-full sm:w-auto">
            <button
              type="submit"
              className="px-6 py-2.5 btn-primary text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wide"
            >
              <Send className="h-3.5 w-3.5" />
              Submit Inquiry
            </button>
            <button
              type="button"
              onClick={handleTakeAdmission}
              className="px-6 py-2.5 btn-secondary text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Take Admission
            </button>
          </div>
        </div>
      </form>

      {/* Aadhaar Record Found Popup Modal */}
      {showPopup && aadharFound && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-slate-950 border border-slate-850 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 scale-100 glass-panel">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-900 bg-gradient-to-r from-slate-950 to-slate-900/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full flex items-center justify-center shadow-inner">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Existing Aadhar Found!</h3>
                  <p className="text-[10px] text-slate-500">Record found in branch: <span className="capitalize text-teal-400 font-semibold">{aadharFound.branch}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowPopup(false)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-450 transition-colors flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Full Name</span>
                  <span className="text-slate-200 font-semibold">{aadharFound.fullName || `${aadharFound.firstName} ${aadharFound.lastName}`}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone No</span>
                  <span className="text-slate-200 font-semibold">{aadharFound.phoneNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Qualification</span>
                  <span className="text-slate-200 font-semibold">{aadharFound.qualification}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Age / Gender</span>
                  <span className="text-slate-200 font-semibold">{aadharFound.age} / {aadharFound.gender}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Interested Course</span>
                  <span className="text-slate-200 font-semibold capitalize">{(aadharFound.interestedCourse || "").replace(/_/g, " ")}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Admission Status</span>
                  <span className={`inline-flex mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${aadharFound.admissionStatus === "Admitted"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}>
                    <i className={`fas ${aadharFound.admissionStatus === "Admitted" ? "fa-check-circle" : "fa-clock"} mr-1.5`}></i>
                    {aadharFound.admissionStatus || "Not Admitted"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Address</span>
                  <span className="text-slate-200 font-medium text-[11px] leading-relaxed">{aadharFound.address || `${aadharFound.addressLine1}, ${aadharFound.pincode}`}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-900 bg-slate-950 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowPopup(false); setAadharFound(null); }}
                className="px-4 py-2 btn-secondary text-xs rounded-xl cursor-pointer"
              >
                Continue New
              </button>
              <button
                onClick={fillFormFromPopup}
                className="px-4 py-2 btn-primary text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Fill Form data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}