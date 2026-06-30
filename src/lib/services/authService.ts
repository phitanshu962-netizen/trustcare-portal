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
  branch: "kurla" | "thane" | "nalasapora" | "karad";
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
        { username: "admin", password: "Password123", role: "admin", branch: "kurla" },
        { username: "kurla_staff", password: "Password123", role: "staff", branch: "kurla" },
        { username: "karad_staff", password: "Password123", role: "staff", branch: "karad" },
        { username: "thane_staff", password: "Password123", role: "staff", branch: "thane" },
        { username: "nalasapora_staff", password: "Password123", role: "staff", branch: "nalasapora" }
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
            branch: user.branch,
            createdAt: new Date()
          });
          console.log(`Created user: ${user.username}`);
        } catch (authError: any) {
          // If already exists in auth, try to create firestore profile
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

// Login a user and retrieve their Firestore profile
export async function loginUser(username: string, password: string): Promise<UserProfile> {
  const email = username.includes("@") ? username : usernameToEmail(username);
  
  // Sign in with Firebase Auth
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  
  // Fetch user profile from Firestore
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    // If the doc doesn't exist, create a default profile for backward compatibility
    const defaultProfile: UserProfile = {
      uid,
      email,
      username: username.split("@")[0],
      role: ADMIN_EMAILS.includes(email) ? "admin" : "staff", // updated fallback based on email
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
        // Fallback profile
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
