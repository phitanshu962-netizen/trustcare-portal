import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  role: "admin" | "staff";
  branch: string;
}

const ADMIN_EMAILS = ["phitanshu962@gmail.com", "harshnpc21@gmail.com"];

// Convert a username to a standardized email for Firebase Auth
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@trustcare.com`;
}

// Seed default users if the collection is empty
export async function seedDefaultUsers() {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    if (snapshot.empty) {
      console.log("Seeding default users...");
      const defaultUsers = [
        { username: "admin", password: "Password123", role: "admin" },
        { username: "staff", password: "Password123", role: "staff" }
      ];

      for (const user of defaultUsers) {
        const email = usernameToEmail(user.username);
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, user.password);
          const uid = userCredential.user.uid;
          await setDoc(doc(db, "users", uid), {
            uid,
            email,
            username: user.username,
            role: user.role,
            branch: "main",
            instituteName: "Shelar Training Institute",
            createdAt: new Date()
          });
          console.log(`Created user: ${user.username}`);
        } catch (authError: any) {
          if (authError.code === "auth/email-already-in-use") {
            console.log(`User ${user.username} already exists in Firebase Auth.`);
          } else {
            console.error(`Failed to create auth user ${user.username}:`, authError);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error seeding default users:", error);
  }
}

// Update user profile in Firestore
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<boolean> {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// Login a user and retrieve their Firestore profile
export async function loginUser(username: string, password: string): Promise<UserProfile> {
  const email = username.includes("@") ? username : usernameToEmail(username);

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    const defaultProfile: UserProfile = {
      uid,
      email,
      username: username.split("@")[0],
      role: ADMIN_EMAILS.includes(email) ? "admin" : "staff",
      branch: "kurla"
    };
    await setDoc(doc(db, "users", uid), defaultProfile);
    return defaultProfile;
  }

  const profile = userDoc.data() as UserProfile;
  if (ADMIN_EMAILS.includes(email) && profile.role !== "admin") {
    profile.role = "admin";
    await setDoc(doc(db, "users", uid), { role: "admin" }, { merge: true });
  }
  return profile;
}

// Sign out from the application
export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// Subscribe to auth state changes
export function subscribeToAuth(callback: (user: FirebaseUser | null, profile: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const email = user.email || "";
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        if (ADMIN_EMAILS.includes(email) && profile.role !== "admin") {
          profile.role = "admin";
          setDoc(doc(db, "users", user.uid), { role: "admin" }, { merge: true });
        }
        callback(user, profile);
      } else {
        callback(user, {
          uid: user.uid,
          email,
          username: email.split("@")[0],
          role: ADMIN_EMAILS.includes(email) ? "admin" : "staff",
          branch: "kurla"
        });
      }
    } else {
      callback(null, null);
    }
  });
}

// Login with Google Provider and retrieve/create Firestore profile
export async function loginWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;

  const email = user.email || "";

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      email,
      username: (user.displayName || email).split("@")[0].replace(/\s+/g, "_").toLowerCase(),
      role: ADMIN_EMAILS.includes(email) ? "admin" : "staff",
      branch: "kurla"
    };
    await setDoc(doc(db, "users", user.uid), {
      ...profile,
      createdAt: new Date()
    });
    return profile;
  }

  const profile = userDoc.data() as UserProfile;
  if (ADMIN_EMAILS.includes(email) && profile.role !== "admin") {
    profile.role = "admin";
    await setDoc(doc(db, "users", user.uid), { role: "admin" }, { merge: true });
  }

  return profile;
}