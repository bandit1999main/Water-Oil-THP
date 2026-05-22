import { projects as staticProjects } from './projects.js';

// --- environment keys ---
const firebaseConfig = {
  apiKey: "AIzaSyBlX_PjdyFhi8ySSlOoMdXWBZH0pLQ1xHk",
  authDomain: "tammadaday.firebaseapp.com",
  projectId: "tammadaday",
  storageBucket: "tammadaday.firebasestorage.app",
  messagingSenderId: "81971118471",
  appId: "1:81971118471:web:52835644628cd5fcda9322"
};

// Check if we have standard Firebase configurations in .env
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

let db = null;
let auth = null;
let useFirebase = false;

// Attempt Firebase initialization
if (isFirebaseConfigured) {
  try {
    // Dynamic imports to prevent issues if Firebase isn't needed
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    useFirebase = true;
    console.log("🔥 Firebase initialized successfully! Connected to Cloud Firestore.");
  } catch (error) {
    console.warn("⚠️ Failed to initialize Firebase. Falling back to local storage database manager.", error);
    useFirebase = false;
  }
} else {
  console.log("ℹ️ Firebase credentials not provided in .env. Running on premium Local Storage Database Manager.");
}

// --- LOCAL STORAGE DATABASE MANAGER ---
const LOCAL_STORAGE_KEY = 'bandit_portfolio_projects';
const LOCAL_AUTH_KEY = 'bandit_admin_token';
const DEFAULT_ADMIN_EMAIL = 'bandit1999main@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'admin'; // default password

function getLocalProjects() {
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!localData) {
    // Seed with static projects
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(staticProjects));
    return staticProjects;
  }
  return JSON.parse(localData);
}

function setLocalProjects(projects) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
}

// --- EXPORTED DATABASE ACTIONS ---

// Get active projects
export async function fetchProjects() {
  if (useFirebase) {
    try {
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const q = query(collection(db, "projects"), orderBy("id", "asc"));
      const querySnapshot = await getDocs(q);
      
      const firestoreProjects = [];
      querySnapshot.forEach((doc) => {
        firestoreProjects.push({ ...doc.data(), docId: doc.id });
      });

      if (firestoreProjects.length === 0) {
        console.log("🌱 Firestore collection is empty. Seeding with default portfolio projects...");
        const seeded = await seedFirestore(staticProjects);
        return seeded;
      }
      return firestoreProjects;
    } catch (error) {
      console.error("❌ Firestore fetch failed. Falling back to Local Storage.", error);
      return getLocalProjects();
    }
  } else {
    return getLocalProjects();
  }
}

// Seed helper
async function seedFirestore(projectsList) {
  const { collection, addDoc } = await import('firebase/firestore');
  const seededList = [];
  try {
    for (const project of projectsList) {
      const docRef = await addDoc(collection(db, "projects"), project);
      seededList.push({ ...project, docId: docRef.id });
    }
    console.log("✅ Firestore seeded successfully with", seededList.length, "projects.");
    return seededList;
  } catch (error) {
    console.error("❌ Seeding Firestore failed:", error);
    return getLocalProjects();
  }
}

// Add a project
export async function addProject(projectData) {
  const newId = Date.now(); // unique numeric ID
  const newProject = {
    id: newId,
    title: projectData.title,
    category: projectData.category,
    shortDescription: projectData.shortDescription,
    description: projectData.description,
    tags: projectData.tags,
    imageClass: projectData.imageClass || "nova-bg",
    demoUrl: projectData.demoUrl || "#",
    githubUrl: projectData.githubUrl || "#"
  };

  if (useFirebase) {
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, "projects"), newProject);
      return { ...newProject, docId: docRef.id };
    } catch (error) {
      console.error("❌ Firebase add project failed. Saving to Local Storage.", error);
      return addLocalProject(newProject);
    }
  } else {
    return addLocalProject(newProject);
  }
}

function addLocalProject(newProject) {
  const list = getLocalProjects();
  list.push(newProject);
  setLocalProjects(list);
  return newProject;
}

// Update a project
export async function updateProject(projectId, projectData) {
  if (useFirebase) {
    try {
      const { doc, updateDoc, collection, getDocs, query, where } = await import('firebase/firestore');
      // If we don't have the docId, find it by numeric ID
      let targetDocId = projectData.docId;
      if (!targetDocId) {
        const q = query(collection(db, "projects"), where("id", "==", Number(projectId)));
        const snap = await getDocs(q);
        snap.forEach(d => {
          targetDocId = d.id;
        });
      }
      
      if (targetDocId) {
        const docRef = doc(db, "projects", targetDocId);
        const updatedFields = {
          title: projectData.title,
          category: projectData.category,
          shortDescription: projectData.shortDescription,
          description: projectData.description,
          tags: projectData.tags,
          imageClass: projectData.imageClass,
          demoUrl: projectData.demoUrl,
          githubUrl: projectData.githubUrl
        };
        await updateDoc(docRef, updatedFields);
        return { ...updatedFields, id: Number(projectId), docId: targetDocId };
      }
      throw new Error("Document ID not found");
    } catch (error) {
      console.error("❌ Firebase update failed. Updating in Local Storage.", error);
      return updateLocalProject(projectId, projectData);
    }
  } else {
    return updateLocalProject(projectId, projectData);
  }
}

function updateLocalProject(projectId, projectData) {
  const list = getLocalProjects();
  const index = list.findIndex(p => p.id === Number(projectId));
  if (index !== -1) {
    list[index] = {
      ...list[index],
      title: projectData.title,
      category: projectData.category,
      shortDescription: projectData.shortDescription,
      description: projectData.description,
      tags: projectData.tags,
      imageClass: projectData.imageClass,
      demoUrl: projectData.demoUrl,
      githubUrl: projectData.githubUrl
    };
    setLocalProjects(list);
    return list[index];
  }
  return null;
}

// Delete a project
export async function deleteProject(projectId, docId) {
  if (useFirebase) {
    try {
      const { doc, deleteDoc, collection, getDocs, query, where } = await import('firebase/firestore');
      let targetDocId = docId;
      if (!targetDocId) {
        const q = query(collection(db, "projects"), where("id", "==", Number(projectId)));
        const snap = await getDocs(q);
        snap.forEach(d => {
          targetDocId = d.id;
        });
      }

      if (targetDocId) {
        const docRef = doc(db, "projects", targetDocId);
        await deleteDoc(docRef);
        return true;
      }
      throw new Error("Document ID not found for deletion");
    } catch (error) {
      console.error("❌ Firebase delete failed. Deleting from Local Storage.", error);
      return deleteLocalProject(projectId);
    }
  } else {
    return deleteLocalProject(projectId);
  }
}

function deleteLocalProject(projectId) {
  const list = getLocalProjects();
  const filtered = list.filter(p => p.id !== Number(projectId));
  setLocalProjects(filtered);
  return true;
}

// --- MULTI-USER SYSTEM STRINGS & STORAGE KEYS ---
const LOCAL_USERS_KEY = 'bandit_portfolio_users';
const LOCAL_USER_SESSION_KEY = 'bandit_user_session';

// Helper for local state callbacks
let localAuthListeners = [];

// Helper to trigger local auth change callbacks manually when logging in/out
function triggerLocalAuthChange() {
  const user = getActiveUser();
  localAuthListeners.forEach(callback => callback(user));
}

// --- AUTHENTICATION ACTIONS ---

// Sign Up Visitor
export async function registerVisitor(email, password, displayName) {
  if (useFirebase) {
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("❌ Firebase Visitor SignUp failed:", error);
      return { success: false, error: error.message };
    }
  } else {
    // Local storage mock register
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    if (users.some(u => u.email === email)) {
      return { success: false, error: "Email is already registered." };
    }
    const newUser = { id: `user-${Date.now()}`, email, password, displayName };
    users.push(newUser);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    
    // Auto login
    localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify({ email, displayName, id: newUser.id, role: 'visitor' }));
    triggerLocalAuthChange();
    return { success: true, user: { email, displayName } };
  }
}

// Log In Visitor
export async function loginVisitor(email, password) {
  if (useFirebase) {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("❌ Firebase Visitor Login failed:", error);
      return { success: false, error: error.message };
    }
  } else {
    // Local storage mock login
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify({ email, displayName: user.displayName, id: user.id, role: 'visitor' }));
      triggerLocalAuthChange();
      return { success: true, user: { email, displayName: user.displayName } };
    } else {
      return { success: false, error: "Incorrect email or password." };
    }
  }
}

// Log In with Google (Unified visitor/admin)
export async function loginWithGoogle() {
  if (useFirebase) {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // If the Google email matches DEFAULT_ADMIN_EMAIL, elevate to Admin
      if (user.email === DEFAULT_ADMIN_EMAIL) {
        localStorage.setItem(LOCAL_AUTH_KEY, `google-admin-${Date.now()}`);
        localStorage.removeItem(LOCAL_USER_SESSION_KEY);
      } else {
        localStorage.removeItem(LOCAL_AUTH_KEY);
        localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify({
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          id: user.uid,
          role: 'visitor'
        }));
      }
      
      triggerLocalAuthChange();
      return { success: true, user };
    } catch (error) {
      console.error("❌ Firebase Google Login failed:", error);
      return { success: false, error: error.message };
    }
  } else {
    // Offline Mock Google Login
    const mockEmail = "google.visitor@example.com";
    const mockName = "Google Visitor";
    const mockId = `google-mock-${Date.now()}`;
    
    localStorage.removeItem(LOCAL_AUTH_KEY);
    localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify({
      email: mockEmail,
      displayName: mockName,
      id: mockId,
      role: 'visitor'
    }));
    
    triggerLocalAuthChange();
    return { success: true, user: { email: mockEmail, displayName: mockName, uid: mockId } };
  }
}

// Log In Admin
export async function loginAdmin(email, password) {
  if (useFirebase) {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (email !== DEFAULT_ADMIN_EMAIL) {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        return { success: false, error: "Unauthorized access. This area is reserved for the administrator." };
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("❌ Firebase Admin Login failed:", error);
      return { success: false, error: error.message };
    }
  } else {
    // Fallback Local Admin Login
    if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
      const mockToken = `mock-session-${Date.now()}`;
      localStorage.setItem(LOCAL_AUTH_KEY, mockToken);
      localStorage.removeItem(LOCAL_USER_SESSION_KEY); // Clear visitor session if admin logs in
      triggerLocalAuthChange();
      return { success: true, user: { email: DEFAULT_ADMIN_EMAIL, role: 'admin' } };
    } else {
      return { success: false, error: "Incorrect admin credentials." };
    }
  }
}

// Check logged in user status
export function getActiveUser() {
  if (useFirebase) {
    return auth?.currentUser || null;
  } else {
    // Admin check
    const adminToken = localStorage.getItem(LOCAL_AUTH_KEY);
    if (adminToken) {
      return { email: DEFAULT_ADMIN_EMAIL, displayName: 'Bandit (Admin)', uid: 'admin-uid', role: 'admin' };
    }
    // Visitor check
    const visitorSession = localStorage.getItem(LOCAL_USER_SESSION_KEY);
    if (visitorSession) {
      const u = JSON.parse(visitorSession);
      return { email: u.email, displayName: u.displayName, uid: u.id, role: 'visitor' };
    }
    return null;
  }
}

// Keep backward compatibility check for getAdminUser
export function getAdminUser() {
  const user = getActiveUser();
  if (useFirebase) {
    return user && user.email === DEFAULT_ADMIN_EMAIL ? user : null;
  } else {
    return user && user.role === 'admin' ? user : null;
  }
}

// Auth state change listener
export function onAuthChanged(callback) {
  if (useFirebase) {
    const { onAuthStateChanged } = auth;
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  } else {
    localAuthListeners.push(callback);
    callback(getActiveUser());
    
    return () => {
      localAuthListeners = localAuthListeners.filter(l => l !== callback);
    };
  }
}

// Logout system (Unified)
export async function logoutUser() {
  if (useFirebase) {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      return true;
    } catch (error) {
      console.error("❌ Firebase Logout failed:", error);
      return false;
    }
  } else {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    localStorage.removeItem(LOCAL_USER_SESSION_KEY);
    triggerLocalAuthChange();
    return true;
  }
}

// Keep backward compatibility logout
export async function logoutAdmin() {
  return logoutUser();
}

// --- PROJECT FAVORITES (BOOKMARK) ACTIONS ---

// Get all favorited project IDs for the active user
export async function fetchUserFavorites() {
  const user = getActiveUser();
  if (!user) return [];
  
  const userId = useFirebase ? user.uid : user.email;
  
  if (useFirebase) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(db, "favorites", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().projectIds || [];
      }
      return [];
    } catch (error) {
      console.error("❌ Firebase fetch favorites failed. Falling back to local.", error);
      return getLocalFavorites(userId);
    }
  } else {
    return getLocalFavorites(userId);
  }
}

function getLocalFavorites(userId) {
  const data = localStorage.getItem(`bandit_favs_${userId}`);
  return data ? JSON.parse(data) : [];
}

// Toggle a favorite project ID
export async function toggleFavoriteProject(projectId) {
  const user = getActiveUser();
  if (!user) throw new Error("Authentication required to bookmark projects.");
  
  const userId = useFirebase ? user.uid : user.email;
  const currentFavs = await fetchUserFavorites();
  const index = currentFavs.indexOf(Number(projectId));
  
  let newFavs;
  if (index === -1) {
    newFavs = [...currentFavs, Number(projectId)];
  } else {
    newFavs = currentFavs.filter(id => id !== Number(projectId));
  }
  
  if (useFirebase) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, "favorites", userId);
      await setDoc(docRef, { projectIds: newFavs });
      return newFavs;
    } catch (error) {
      console.error("❌ Firebase toggle favorite failed. Saving locally.", error);
      saveLocalFavorites(userId, newFavs);
      return newFavs;
    }
  } else {
    saveLocalFavorites(userId, newFavs);
    triggerLocalAuthChange(); // trigger UI re-renders locally
    return newFavs;
  }
}

function saveLocalFavorites(userId, favs) {
  localStorage.setItem(`bandit_favs_${userId}`, JSON.stringify(favs));
}

// --- RESUME / ABOUT ME ACTIONS ---
const LOCAL_ABOUT_KEY = 'bandit_about_me';

const DEFAULT_ABOUT_DATA = {
  bio: "I am a digital artisan who loves building high-performance web applications. My coding journey revolves around creating beautiful, user-centered software designs backed by secure, optimized backend logic.\n\nI believe that premium products lie at the intersection of stunning design and stellar performance. I'm constantly learning new web patterns and leveraging cutting-edge web platform capabilities to build next-generation applications.",
  avatarUrl: "./avatar_placeholder.png",
  experience: [
    {
      id: "exp1",
      role: "Senior Full-Stack Developer",
      company: "Creative Digital Agency",
      duration: "2024 - Present",
      description: "Led development of premium React web applications, integrated Firebase/Cloud architectures, optimized front-end performance by 40%, and mentored junior engineers."
    },
    {
      id: "exp2",
      role: "Full-Stack Web Engineer",
      company: "Tech Innovation Lab",
      duration: "2022 - 2024",
      description: "Designed robust API microservices with Node.js and Go. Implemented sleek, responsive user interfaces and managed PostgreSQL databases."
    }
  ],
  education: [
    {
      id: "edu1",
      degree: "Bachelor of Science in Computer Science",
      school: "King Mongkut's Institute of Technology",
      duration: "2018 - 2022",
      description: "Graduated with Honors. Specialized in Software Engineering, Web Technology, and Intelligent Systems."
    }
  ]
};

export async function fetchAboutMe() {
  if (useFirebase) {
    try {
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, "about", "me");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // Seed with default resume
        await setDoc(docRef, DEFAULT_ABOUT_DATA);
        return DEFAULT_ABOUT_DATA;
      }
    } catch (error) {
      console.error("❌ Firebase fetch resume failed. Falling back to local.", error);
      return getLocalAboutMe();
    }
  } else {
    return getLocalAboutMe();
  }
}

function getLocalAboutMe() {
  const data = localStorage.getItem(LOCAL_ABOUT_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_ABOUT_KEY, JSON.stringify(DEFAULT_ABOUT_DATA));
    return DEFAULT_ABOUT_DATA;
  }
  return JSON.parse(data);
}

export async function updateAboutMe(aboutData) {
  if (useFirebase) {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, "about", "me");
      await setDoc(docRef, aboutData);
      return aboutData;
    } catch (error) {
      console.error("❌ Firebase update resume failed. Saving locally.", error);
      saveLocalAboutMe(aboutData);
      return aboutData;
    }
  } else {
    saveLocalAboutMe(aboutData);
    return aboutData;
  }
}

function saveLocalAboutMe(aboutData) {
  localStorage.setItem(LOCAL_ABOUT_KEY, JSON.stringify(aboutData));
}

// --- COMMENTS ACTIONS ---
const LOCAL_COMMENTS_KEY = 'bandit_comments';

export async function fetchComments(projectId) {
  if (useFirebase) {
    try {
      const { collection, getDocs, query, where, orderBy } = await import('firebase/firestore');
      const q = query(
        collection(db, "comments"),
        where("projectId", "==", Number(projectId)),
        orderBy("timestamp", "asc")
      );
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ ...doc.data(), commentId: doc.id });
      });
      return list;
    } catch (error) {
      console.error("❌ Firebase fetch comments failed. Falling back to local.", error);
      return getLocalComments(projectId);
    }
  } else {
    return getLocalComments(projectId);
  }
}

function getLocalComments(projectId) {
  const data = localStorage.getItem(LOCAL_COMMENTS_KEY);
  const list = data ? JSON.parse(data) : [];
  return list
    .filter(c => c.projectId === Number(projectId))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function addComment(projectId, content) {
  const user = getActiveUser();
  if (!user) throw new Error("Authentication required to post comments.");

  const newComment = {
    projectId: Number(projectId),
    content: content,
    uid: user.uid || user.email,
    authorName: user.displayName || user.email.split('@')[0],
    authorEmail: user.email,
    timestamp: Date.now()
  };

  if (useFirebase) {
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, "comments"), newComment);
      return { ...newComment, commentId: docRef.id };
    } catch (error) {
      console.error("❌ Firebase add comment failed. Saving locally.", error);
      return addLocalComment(newComment);
    }
  } else {
    return addLocalComment(newComment);
  }
}

function addLocalComment(comment) {
  const data = localStorage.getItem(LOCAL_COMMENTS_KEY);
  const list = data ? JSON.parse(data) : [];
  const fullComment = { ...comment, commentId: `comment-${Date.now()}` };
  list.push(fullComment);
  localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(list));
  return fullComment;
}

export async function deleteComment(commentId, projectId) {
  const user = getActiveUser();
  if (!user) throw new Error("Authentication required to delete comments.");

  // Check if admin or the owner (we'll double check role/email)
  const isAdmin = user.role === 'admin' || user.email === DEFAULT_ADMIN_EMAIL;
  
  if (useFirebase) {
    try {
      const { doc, getDoc, deleteDoc } = await import('firebase/firestore');
      const docRef = doc(db, "comments", commentId);
      
      // Fetch comment first to verify ownership if not admin
      if (!isAdmin) {
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().uid !== user.uid) {
          throw new Error("Unauthorized: You do not own this comment.");
        }
      }
      
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("❌ Firebase delete comment failed. Falling back to local.", error);
      return deleteLocalComment(commentId);
    }
  } else {
    return deleteLocalComment(commentId);
  }
}

function deleteLocalComment(commentId) {
  const data = localStorage.getItem(LOCAL_COMMENTS_KEY);
  if (!data) return false;
  let list = JSON.parse(data);
  const comment = list.find(c => c.commentId === commentId);
  if (!comment) return false;
  
  // Verify authorization
  const user = getActiveUser();
  const isAdmin = user && (user.role === 'admin' || user.email === DEFAULT_ADMIN_EMAIL);
  const isOwner = user && (user.uid === comment.uid || user.email === comment.uid);
  
  if (!isAdmin && !isOwner) {
    throw new Error("Unauthorized to delete comment");
  }
  
  list = list.filter(c => c.commentId !== commentId);
  localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(list));
  return true;
}
