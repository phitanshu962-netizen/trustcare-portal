import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/services/authService";
import {
    Course,
    getAllCourses,
    saveCourse,
    deactivateCourse,
    activateCourse,
    deleteCourse
} from "../lib/services/courseService";
import { Timestamp } from "firebase/firestore";

interface CourseManagementViewProps {
    userProfile: UserProfile | null;
}

const emptyForm = {
    courseName: "",
    duration: "",
    fees: 0,
    admissionFee: 0
};

function formatDate(ts: any): string {
    if (!ts) return "-";
    if (ts instanceof Timestamp) {
        return ts.toDate().toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric"
        });
    }
    if (ts?.toDate) {
        return ts.toDate().toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric"
        });
    }
    if (typeof ts === "string") {
        return new Date(ts).toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric"
        });
    }
    return "-";
}

function generateCourseId(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
}

export default function CourseManagementView({ userProfile }: CourseManagementViewProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    // Track permanently deleted course IDs to keep them hidden even after re-fetch
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await getAllCourses();
            // Filter out any courses that were permanently deleted
            setCourses(data.filter((c) => !deletedIds.has(c.courseId)));
        } catch (err: any) {
            setErrorMsg("Failed to load courses: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCourses(); }, [deletedIds]);

    const handleFormChange = (field: string, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
        setErrorMsg("");
    };

    const handleEdit = (course: Course) => {
        setForm({
            courseName: course.courseName,
            duration: course.duration,
            fees: course.fees,
            admissionFee: course.admissionFee || 0
        });
        setEditingId(course.courseId);
        setShowForm(true);
        setErrorMsg("");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        const autoId = editingId || generateCourseId(form.courseName);

        if (!form.courseName.trim() || !form.duration.trim() || form.fees <= 0) {
            setErrorMsg("Please fill all fields correctly. Course fees must be greater than 0.");
            return;
        }
        if (!autoId) {
            setErrorMsg("Could not generate Course ID from the provided name.");
            return;
        }

        setSaving(true);
        try {
            const res = await saveCourse({
                courseId: autoId,
                courseName: form.courseName.trim(),
                duration: form.duration.trim(),
                fees: form.fees,
                admissionFee: form.admissionFee,
                createdBy: userProfile?.username || "Admin"
            });

            if (res.success) {
                setSuccessMsg(editingId ? "Course updated successfully!" : "Course created successfully!");
                resetForm();
                await fetchCourses();
                setTimeout(() => setSuccessMsg(""), 3000);
            } else {
                setErrorMsg(res.message || "Failed to save course.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Error saving course.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (course: Course) => {
        const confirmed = window.confirm(
            course.active !== false
                ? `Are you sure you want to deactivate "${course.courseName}"?`
                : `Are you sure you want to reactivate "${course.courseName}"?`
        );
        if (!confirmed) return;

        try {
            const res = course.active !== false
                ? await deactivateCourse(course.courseId, userProfile?.username || "Admin")
                : await activateCourse(course.courseId, userProfile?.username || "Admin");

            if (res.success) {
                setSuccessMsg(course.active !== false ? "Course deactivated." : "Course reactivated.");
                await fetchCourses();
                setTimeout(() => setSuccessMsg(""), 3000);
            } else {
                setErrorMsg(res.message || "Failed to update course status.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Error updating course.");
        }
    };

    const handleDelete = async (course: Course) => {
        const confirmed = window.confirm(
            `⚠️ PERMANENT DELETE\n\nAre you absolutely sure you want to permanently delete "${course.courseName}"?\n\nThis action CANNOT be undone. All course data will be removed from Firestore.`
        );
        if (!confirmed) return;

        const secondConfirm = window.confirm(
            `Click OK to confirm permanent deletion of "${course.courseName}".`
        );
        if (!secondConfirm) return;

        setErrorMsg("");
        setSuccessMsg("");

        // Immediately mark as deleted in local tracker so it never comes back
        setDeletedIds((prev) => new Set(prev).add(course.courseId));
        // Optimistically remove from courses state
        setCourses((prev) => prev.filter((c) => c.courseId !== course.courseId));

        // Firestore delete (best-effort - document may already be gone)
        try {
            const res = await deleteCourse(course.courseId, userProfile?.username || "Admin");
            if (res.success) {
                setSuccessMsg(`"${course.courseName}" has been permanently deleted.`);
            } else {
                console.warn("Firestore delete returned error, but course kept hidden locally:", res.message);
                setSuccessMsg(`"${course.courseName}" removed from view (Firestore error: ${res.message})`);
            }
        } catch (err: any) {
            console.warn("Firestore delete failed, but course kept hidden locally:", err.message);
            setSuccessMsg(`"${course.courseName}" removed from view (${err.message})`);
        }
        setTimeout(() => setSuccessMsg(""), 4000);
    };

    return (
        <div className="relative w-full max-w-6xl mx-auto bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4">
            <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
            <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

            <div className="border-b border-slate-900 pb-4 mb-6 text-center">
                <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
                    <i className="fas fa-graduation-cap text-teal-400"></i>COURSE MANAGEMENT
                </h1>
                <p className="text-xs text-slate-500 mt-1">Add, edit, and manage courses with pricing & duration</p>
            </div>

            {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                    <i className="fas fa-check-circle"></i><span>{successMsg}</span>
                </div>
            )}
            {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                    <i className="fas fa-exclamation-circle"></i><span>{errorMsg}</span>
                </div>
            )}

            {!showForm && (
                <div className="mb-6">
                    <button onClick={() => { setShowForm(true); setErrorMsg(""); }}
                        className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2">
                        <i className="fas fa-plus"></i> Add New Course
                    </button>
                </div>
            )}

            {showForm && (
                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-6 mb-8">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-l-2 border-teal-500 pl-2 mb-5">
                        {editingId ? "Edit Course" : "Create New Course"}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-400">Course ID (Auto-generated)</label>
                                <input type="text" value={editingId || generateCourseId(form.courseName)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-500 cursor-not-allowed" readOnly
                                    placeholder="auto-generated from course name" />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-400">Course Name *</label>
                                <input type="text" value={form.courseName} onChange={(e) => handleFormChange("courseName", e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors"
                                    placeholder="e.g. ANM Nursing" required />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-400">Duration *</label>
                                <input type="text" value={form.duration} onChange={(e) => handleFormChange("duration", e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors"
                                    placeholder="e.g. 1 year" required />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-400">Admission Fee (₹)</label>
                                <input type="number" value={form.admissionFee || ""} onChange={(e) => handleFormChange("admissionFee", Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors"
                                    placeholder="e.g. 5000" min="0" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-400">Course Fees (₹) *</label>
                                <input type="number" value={form.fees || ""} onChange={(e) => handleFormChange("fees", Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors"
                                    placeholder="e.g. 65000" min="1" required />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={saving}
                                className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2 disabled:opacity-50">
                                {saving ? <><i className="fas fa-spinner fa-spin"></i>Saving...</> : <><i className="fas fa-save"></i>{editingId ? "Update Course" : "Save Course"}</>}
                            </button>
                            <button type="button" onClick={resetForm}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin text-teal-400 text-2xl"></i>
                    <span className="text-xs text-slate-500">Loading courses...</span>
                </div>
            ) : courses.length === 0 ? (
                <div className="py-16 text-center">
                    <i className="fas fa-book text-4xl text-slate-800 mb-3"></i>
                    <p className="text-sm text-slate-500">No courses found. Create your first course above.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-slate-950/20 border border-slate-900 rounded-2xl">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900">
                            <tr>
                                <th className="px-5 py-3">Course ID</th>
                                <th className="px-5 py-3">Course Name</th>
                                <th className="px-5 py-3">Duration</th>
                                <th className="px-5 py-3 text-right">Admission Fee (₹)</th>
                                <th className="px-5 py-3 text-right">Course Fee (₹)</th>
                                <th className="px-5 py-3 text-right">Total (₹)</th>
                                <th className="px-5 py-3 text-center">Created On</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/60">
                            {courses.map((course) => (
                                <tr key={course.id} className="hover:bg-slate-900/20">
                                    <td className="px-5 py-3 font-mono text-slate-500">{course.courseId}</td>
                                    <td className="px-5 py-3 font-medium text-slate-200">{course.courseName}</td>
                                    <td className="px-5 py-3 text-slate-400">{course.duration}</td>
                                    <td className="px-5 py-3 text-right font-bold text-indigo-400">₹{(course.admissionFee || 0).toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right font-bold text-teal-400">₹{course.fees.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right font-bold text-slate-200">₹{((course.admissionFee || 0) + course.fees).toLocaleString()}</td>
                                    <td className="px-5 py-3 text-center text-slate-400">{formatDate(course.createdAt)}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${course.active !== false
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                                            }`}>
                                            {course.active !== false ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => handleEdit(course)}
                                                className="px-2 py-1.5 text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-1">
                                                <i className="fas fa-edit"></i>Edit
                                            </button>
                                            <button onClick={() => handleToggleActive(course)}
                                                className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 ${course.active !== false
                                                    ? "text-rose-400 hover:bg-rose-500/10"
                                                    : "text-emerald-400 hover:bg-emerald-500/10"
                                                    }`}>
                                                <i className={`fas ${course.active !== false ? "fa-ban" : "fa-check"}`}></i>
                                                {course.active !== false ? "Deactivate" : "Activate"}
                                            </button>
                                            <button onClick={() => handleDelete(course)}
                                                className="px-2 py-1.5 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1">
                                                <i className="fas fa-trash-alt"></i>Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}