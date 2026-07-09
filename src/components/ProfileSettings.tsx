import React, { useState, useEffect } from "react";
import { UserProfile, updateUserProfile } from "../lib/services/authService";

interface ProfileSettingsProps {
    userProfile: UserProfile | null;
    onProfileUpdated: (profile: UserProfile) => void;
}

export default function ProfileSettings({ userProfile, onProfileUpdated }: ProfileSettingsProps) {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "staff">("staff");
    const [branch, setBranch] = useState("");
    const [instituteName, setInstituteName] = useState("");
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (userProfile) {
            setUsername(userProfile.username || "");
            setEmail(userProfile.email || "");
            setRole(userProfile.role || "staff");
            setBranch(userProfile.branch || "main");
            setInstituteName((userProfile as any).instituteName || "");
        }
    }, [userProfile]);

    const handleSave = async (field: string) => {
        if (!userProfile) return;
        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        const updateData: any = {};
        if (field === "account") {
            if (!username.trim()) { setErrorMsg("Username cannot be empty."); setSaving(false); return; }
            updateData.username = username.trim();
            updateData.email = email.trim();
            updateData.role = role;
            updateData.branch = branch.trim() || "main";
        } else if (field === "institute") {
            if (!instituteName.trim()) { setErrorMsg("Institute name cannot be empty."); setSaving(false); return; }
            updateData.instituteName = instituteName.trim();
        }

        try {
            await updateUserProfile(userProfile.uid, updateData);
            const updated = { ...userProfile, ...updateData };
            onProfileUpdated(updated);
            setSuccessMsg(`${field === "account" ? "Account" : "Institute"} settings updated successfully!`);
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto bg-slate-950/60 border border-slate-900 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden mt-4">
            <div className="absolute top-0 right-0 -z-10 h-32 w-32 bg-teal-500/10 blur-2xl rounded-full" />
            <div className="absolute bottom-0 left-0 -z-10 h-32 w-32 bg-indigo-500/10 blur-2xl rounded-full" />

            <div className="border-b border-slate-900 pb-4 mb-6 text-center">
                <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
                    <i className="fas fa-cog text-teal-400"></i>PROFILE SETTINGS
                </h1>
                <p className="text-xs text-slate-500 mt-1">Manage account details and institute settings</p>
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

            {/* Account Info - Editable */}
            <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 mb-6 space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-400">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-400">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                        />
                    </div>
                    {userProfile?.role === "admin" && (
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-400">Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as "admin" | "staff")}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500/50 transition-colors"
                            >
                                <option value="admin">Admin</option>
                                <option value="staff">Staff</option>
                            </select>
                        </div>
                    )}
                    {userProfile?.role === "admin" && (
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-400">Branch</label>
                            <input
                                type="text"
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500/50 transition-colors"
                                placeholder="main"
                            />
                        </div>
                    )}
                </div>
                <button
                    onClick={() => handleSave("account")}
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <><i className="fas fa-spinner fa-spin"></i>Saving...</> : <><i className="fas fa-save"></i>Save Account</>}
                </button>
            </div>

            {/* Institute Name Settings */}
            {userProfile?.role === "admin" && (
                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Institute Settings</h3>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-400">Institute Name</label>
                        <input
                            type="text"
                            value={instituteName}
                            onChange={(e) => setInstituteName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-teal-500/50 transition-colors"
                            placeholder="e.g. TrustCare Institute"
                        />
                        <p className="text-[10px] text-slate-600">This name appears on receipts and reports.</p>
                    </div>

                    <button
                        onClick={() => handleSave("institute")}
                        disabled={saving || !instituteName.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-indigo-400 text-slate-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-lg shadow-teal-500/10 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <><i className="fas fa-spinner fa-spin"></i>Saving...</> : <><i className="fas fa-save"></i>Save Institute</>}
                    </button>
                </div>
            )}
        </div>
    );
}