import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDJc5TGxm8oFPYPwhQXT7X3mS7BrTBVT8U",
  authDomain: "water-oil-thp.firebaseapp.com",
  projectId: "water-oil-thp",
  storageBucket: "water-oil-thp.firebasestorage.app",
  messagingSenderId: "326764898632",
  appId: "1:326764898632:web:db857c7aeda75af7f2b7d",
  measurementId: "G-NQFY3EGD3B"
};

let db = null;
let auth = null;
let useFirebase = false;

// Initialize Firebase
try {
  const app = initializeApp(firebaseConfig);
  // เปิดใช้งานแคชระดับเครื่องแบบ Persistent Local Cache (สนับสนุนการทำงานออฟไลน์)
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  auth = getAuth(app);
  useFirebase = true;
  console.log("🔥 Firebase & Offline Persistence initialized successfully! Connected to Thailand Post Oil Cloud.");
} catch (error) {
  console.error("⚠️ Failed to initialize Firebase. Falling back to local storage.", error);
  useFirebase = false;
}

export function isCloudConnected() {
  return useFirebase && db !== null;
}

export function getFirebaseAuth() {
  return auth;
}

export function listenToAuthState(callback) {
  if (!auth) return null;
  return onAuthStateChanged(auth, callback);
}

export async function loginWithGoogle() {
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  try {
    // ลองใช้ signInWithPopup เป็นหลักเพื่อความรวดเร็วและไม่ต้อง reload หน้าเว็บ
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    // หากโดนบล็อกป๊อปอัป (เช่นบนมือถือ) ให้ใช้ redirect เป็น fallback อัตโนมัติ
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      console.warn("⚠️ Popup blocked, falling back to signInWithRedirect...");
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error("❌ Google redirect sign-in failed:", redirectErr);
        throw redirectErr;
      }
    } else {
      console.error("❌ Google sign-in failed:", error);
      throw error;
    }
  }
}

export async function getGoogleRedirectResult() {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error) {
    console.error("❌ getRedirectResult failed:", error);
    return null; // ป้องกันการ throw error ไปยังหน้าหลักจนทำให้แอปค้าง
  }
}

export async function logoutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("❌ Sign-out failed:", error);
  }
}

export function checkIsAdmin(user) {
  if (!user) return false;
  return user.email === 'bandit1999main@gmail.com';
}

/**
export function getActiveEmployeesCollectionName() {
  const yrEl = document.getElementById('globalYear');
  const moEl = document.getElementById('globalMonth');
  const yr = yrEl ? yrEl.value : '2569';
  const mo = moEl ? moEl.value.padStart(2, '0') : '05';
  return `employees_${yr}_${mo}`;
}

export function getActiveWaterEmployeesCollectionName() {
  const yrEl = document.getElementById('globalYear');
  const moEl = document.getElementById('globalMonth');
  const yr = yrEl ? yrEl.value : '2569';
  const mo = moEl ? moEl.value.padStart(2, '0') : '05';
  return `water_employees_${yr}_${mo}`;
}

/**
 * --- EMPLOYEES CRUD ---
 */

// Fetch all employees from Firestore
export async function fetchEmployees() {
  const collName = getActiveEmployeesCollectionName();
  const localKey = `tp_${collName}`;
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem(localKey)) || [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, collName));
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    // Store locally as fallback cache
    localStorage.setItem(localKey, JSON.stringify(list));
    return list;
  } catch (error) {
    console.error(`❌ Firestore fetchEmployees failed for ${collName}. Falling back to local storage.`, error);
    return JSON.parse(localStorage.getItem(localKey)) || [];
  }
}

// Save all employees to Firestore in batch
export async function saveEmployees(employeesList) {
  const collName = getActiveEmployeesCollectionName();
  const localKey = `tp_${collName}`;
  
  // Ensure every item has a stable unique ID
  const now = Date.now();
  employeesList.forEach((emp, i) => {
    if (!emp.id) emp.id = `emp_${now}_${i}`;
  });

  // Always update local storage first
  localStorage.setItem(localKey, JSON.stringify(employeesList));

  if (!isCloudConnected()) return false;

  try {
    const batch = writeBatch(db);
    
    // First, get all existing docs to clean up deleted ones
    const querySnapshot = await getDocs(collection(db, collName));
    querySnapshot.forEach((d) => {
      if (!employeesList.some(emp => String(emp.id) === d.id)) {
        batch.delete(doc(db, collName, d.id));
      }
    });

    // Add or update existing ones
    employeesList.forEach((emp) => {
      const docRef = doc(db, collName, String(emp.id));
      batch.set(docRef, emp);
    });

    await batch.commit();
    console.log(`✅ Employees successfully synced to Cloud Firestore (${collName}).`);
    return true;
  } catch (error) {
    console.error(`❌ Firestore saveEmployees failed for ${collName}.`, error);
    return false;
  }
}

/**
 * --- WATER EMPLOYEES CRUD ---
 */

// Fetch all water employees from Firestore
export async function fetchWaterEmployees() {
  const collName = getActiveWaterEmployeesCollectionName();
  const localKey = `tp_${collName}`;
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem(localKey)) || [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, collName));
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    localStorage.setItem(localKey, JSON.stringify(list));
    return list;
  } catch (error) {
    console.error(`❌ Firestore fetchWaterEmployees failed for ${collName}. Falling back to local storage.`, error);
    return JSON.parse(localStorage.getItem(localKey)) || [];
  }
}

// Save all water employees to Firestore in batch
export async function saveWaterEmployees(employeesList) {
  const collName = getActiveWaterEmployeesCollectionName();
  const localKey = `tp_${collName}`;

  // Ensure every item has a stable unique ID
  const now = Date.now();
  employeesList.forEach((emp, i) => {
    if (!emp.id) emp.id = `water_${now}_${i}`;
  });

  localStorage.setItem(localKey, JSON.stringify(employeesList));

  if (!isCloudConnected()) return false;

  try {
    const batch = writeBatch(db);
    
    const querySnapshot = await getDocs(collection(db, collName));
    querySnapshot.forEach((d) => {
      if (!employeesList.some(emp => String(emp.id) === d.id)) {
        batch.delete(doc(db, collName, d.id));
      }
    });

    employeesList.forEach((emp) => {
      const docRef = doc(db, collName, String(emp.id));
      batch.set(docRef, emp);
    });

    await batch.commit();
    console.log(`✅ Water employees successfully synced to Cloud Firestore (${collName}).`);
    return true;
  } catch (error) {
    console.error(`❌ Firestore saveWaterEmployees failed for ${collName}.`, error);
    return false;
  }
}


/**
 * --- ROUTE DATA ACTIONS ---
 */

// Fetch customized route data
export async function fetchRouteData() {
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem('tp_route_data'));
  }
  try {
    const querySnapshot = await getDocs(collection(db, "route_data"));
    if (querySnapshot.empty) {
      return null; // Let caller initialize standard route data
    }
    const routeData = {};
    querySnapshot.forEach((doc) => {
      routeData[doc.id] = doc.data();
    });
    // Cache locally
    localStorage.setItem('tp_route_data', JSON.stringify(routeData));
    return routeData;
  } catch (error) {
    console.error("❌ Firestore fetchRouteData failed.", error);
    return JSON.parse(localStorage.getItem('tp_route_data'));
  }
}

// Save all route data
export async function saveRouteData(routeData) {
  localStorage.setItem('tp_route_data', JSON.stringify(routeData));

  if (!isCloudConnected()) return false;

  try {
    const batch = writeBatch(db);
    Object.keys(routeData).forEach((routeKey) => {
      const docRef = doc(db, "route_data", String(routeKey));
      batch.set(docRef, routeData[routeKey]);
    });
    await batch.commit();
    console.log("✅ Route data successfully synced to Cloud Firestore.");
    return true;
  } catch (error) {
    console.error("❌ Firestore saveRouteData failed.", error);
    return false;
  }
}

// Reset route data in cloud
export async function resetCloudRouteData() {
  if (!isCloudConnected()) return false;
  try {
    const querySnapshot = await getDocs(collection(db, "route_data"));
    const batch = writeBatch(db);
    querySnapshot.forEach((d) => {
      batch.delete(doc(db, "route_data", d.id));
    });
    await batch.commit();
    console.log("🗑️ Cloud route data cleared successfully.");
    return true;
  } catch (error) {
    console.error("❌ Firestore resetCloudRouteData failed.", error);
    return false;
  }
}

/**
 * --- SAVED TEMPLATES ACTIONS ---
 */

// Fetch saved templates
export async function fetchSavedTemplates() {
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem('tp_saved_templates')) || {};
  }
  try {
    const querySnapshot = await getDocs(collection(db, "templates"));
    const templates = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Backward compatibility: default to 'fuel' if no mode is specified
      templates[doc.id] = {
        employees: data.employees || [],
        mode: data.mode || 'fuel'
      };
    });
    localStorage.setItem('tp_saved_templates', JSON.stringify(templates));
    return templates;
  } catch (error) {
    console.error("❌ Firestore fetchSavedTemplates failed.", error);
    return JSON.parse(localStorage.getItem('tp_saved_templates')) || {};
  }
}

// Save template
export async function saveTemplate(templateName, employeesList, targetMode = 'fuel') {
  const templates = JSON.parse(localStorage.getItem('tp_saved_templates')) || {};
  templates[templateName] = {
    employees: employeesList,
    mode: targetMode
  };
  localStorage.setItem('tp_saved_templates', JSON.stringify(templates));

  if (!isCloudConnected()) return false;

  try {
    const docRef = doc(db, "templates", templateName);
    await setDoc(docRef, { 
      employees: employeesList, 
      mode: targetMode,
      updatedAt: Date.now() 
    });
    console.log(`✅ Template "${templateName}" (${targetMode}) successfully saved to Cloud Firestore.`);
    return true;
  } catch (error) {
    console.error("❌ Firestore saveTemplate failed.", error);
    return false;
  }
}

// Delete template
export async function deleteTemplate(templateName) {
  const templates = JSON.parse(localStorage.getItem('tp_saved_templates')) || {};
  delete templates[templateName];
  localStorage.setItem('tp_saved_templates', JSON.stringify(templates));

  if (!isCloudConnected()) return false;

  try {
    await deleteDoc(doc(db, "templates", templateName));
    console.log(`🗑️ Template "${templateName}" deleted from Cloud Firestore.`);
    return true;
  } catch (error) {
    console.error("❌ Firestore deleteTemplate failed.", error);
    return false;
  }
}

/**
 * --- SIGNATORY PROFILES ACTIONS ---
 */

// Fetch saved signatory profiles
export async function fetchSignatoryProfiles() {
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem('tp_sig_profiles')) || {};
  }
  try {
    const querySnapshot = await getDocs(collection(db, "signatory_profiles"));
    const profiles = {};
    querySnapshot.forEach((doc) => {
      profiles[doc.id] = doc.data();
    });
    localStorage.setItem('tp_sig_profiles', JSON.stringify(profiles));
    return profiles;
  } catch (error) {
    console.error("❌ Firestore fetchSignatoryProfiles failed.", error);
    return JSON.parse(localStorage.getItem('tp_sig_profiles')) || {};
  }
}

// Save signatory profile
export async function saveSignatoryProfile(profileName, profileData) {
  const profiles = JSON.parse(localStorage.getItem('tp_sig_profiles')) || {};
  profiles[profileName] = profileData;
  localStorage.setItem('tp_sig_profiles', JSON.stringify(profiles));

  if (!isCloudConnected()) return false;

  try {
    const docRef = doc(db, "signatory_profiles", profileName);
    await setDoc(docRef, { ...profileData, updatedAt: Date.now() });
    console.log(`✅ Signatory profile "${profileName}" successfully saved to Cloud Firestore.`);
    return true;
  } catch (error) {
    console.error("❌ Firestore saveSignatoryProfile failed.", error);
    return false;
  }
}

// Delete signatory profile
export async function deleteSignatoryProfile(profileName) {
  const profiles = JSON.parse(localStorage.getItem('tp_sig_profiles')) || {};
  delete profiles[profileName];
  localStorage.setItem('tp_sig_profiles', JSON.stringify(profiles));

  if (!isCloudConnected()) return false;

  try {
    await deleteDoc(doc(db, "signatory_profiles", profileName));
    console.log(`🗑️ Signatory profile "${profileName}" deleted from Cloud Firestore.`);
    return true;
  } catch (error) {
    console.error("❌ Firestore deleteSignatoryProfile failed.", error);
    return false;
  }
}

/**
 * --- REAL-TIME AUTOSYNC listeners ---
 */
export function listenToEmployees(callback) {
  if (!isCloudConnected()) return null;
  const collName = getActiveEmployeesCollectionName();
  const localKey = `tp_${collName}`;
  return onSnapshot(collection(db, collName), (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    localStorage.setItem(localKey, JSON.stringify(list));
    callback(list);
  }, (error) => {
    console.error(`Firestore listenToEmployees failed for ${collName}:`, error);
  });
}

export function listenToWaterEmployees(callback) {
  if (!isCloudConnected()) return null;
  const collName = getActiveWaterEmployeesCollectionName();
  const localKey = `tp_${collName}`;
  return onSnapshot(collection(db, collName), (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    localStorage.setItem(localKey, JSON.stringify(list));
    callback(list);
  }, (error) => {
    console.error(`Firestore listenToWaterEmployees failed for ${collName}:`, error);
  });
}

/**
 * --- GLOBAL SETTINGS CRUD & LISTENERS ---
 */
export async function fetchGlobalSettings() {
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem('tp_global_settings')) || {};
  }
  try {
    const querySnapshot = await getDocs(collection(db, "global_settings"));
    const settings = {};
    querySnapshot.forEach((doc) => {
      settings[doc.id] = doc.data();
    });
    localStorage.setItem('tp_global_settings', JSON.stringify(settings));
    return settings;
  } catch (error) {
    console.error("❌ Firestore fetchGlobalSettings failed.", error);
    return JSON.parse(localStorage.getItem('tp_global_settings')) || {};
  }
}

export async function saveGlobalSetting(key, val) {
  const settings = JSON.parse(localStorage.getItem('tp_global_settings')) || {};
  settings[key] = val;
  localStorage.setItem('tp_global_settings', JSON.stringify(settings));

  if (!isCloudConnected()) return false;

  try {
    const docRef = doc(db, "global_settings", String(key));
    await setDoc(docRef, val);
    console.log(`✅ Global setting "${key}" successfully saved to Cloud Firestore.`);
    return true;
  } catch (error) {
    console.error("❌ Firestore saveGlobalSetting failed.", error);
    return false;
  }
}

export function listenToGlobalSettings(callback) {
  if (!isCloudConnected()) return null;
  return onSnapshot(collection(db, "global_settings"), (snapshot) => {
    const settings = {};
    snapshot.forEach((doc) => {
      settings[doc.id] = doc.data();
    });
    localStorage.setItem('tp_global_settings', JSON.stringify(settings));
    callback(settings);
  }, (error) => {
    console.error("Firestore listenToGlobalSettings failed:", error);
  });
}

/**
 * --- PERSONNEL MANAGEMENT CRUD ---
 */

export async function fetchPersonnelList() {
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem('tp_personnel')) || [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, "personnel"));
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    localStorage.setItem('tp_personnel', JSON.stringify(list));
    return list;
  } catch (error) {
    console.error("❌ Firestore fetchPersonnelList failed. Falling back to local storage.", error);
    return JSON.parse(localStorage.getItem('tp_personnel')) || [];
  }
}

export async function savePersonnelList(personnelList) {
  const now = Date.now();
  personnelList.forEach((person, i) => {
    if (!person.id) person.id = `person_${now}_${i}`;
  });

  localStorage.setItem('tp_personnel', JSON.stringify(personnelList));

  if (!isCloudConnected()) return false;

  try {
    const batch = writeBatch(db);
    const querySnapshot = await getDocs(collection(db, "personnel"));
    querySnapshot.forEach((d) => {
      if (!personnelList.some(p => String(p.id) === d.id)) {
        batch.delete(doc(db, "personnel", d.id));
      }
    });

    personnelList.forEach((person) => {
      const docRef = doc(db, "personnel", String(person.id));
      batch.set(docRef, person);
    });

    await batch.commit();
    console.log("✅ Personnel list successfully synced to Cloud Firestore.");
    return true;
  } catch (error) {
    console.error("❌ Firestore savePersonnelList failed.", error);
    return false;
  }
}

export function listenToPersonnel(callback) {
  if (!isCloudConnected()) return null;
  return onSnapshot(collection(db, "personnel"), (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    localStorage.setItem('tp_personnel', JSON.stringify(list));
    callback(list);
  }, (error) => {
    console.error("Firestore listenToPersonnel failed:", error);
  });
}

/**
 * --- USER MANAGEMENT CRUD ---
 */

// Fetch all registered app users (admin list metadata)
export async function fetchUsersList() {
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem('tp_users')) || [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, "app_users"));
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ ...doc.data(), uid: doc.id });
    });
    localStorage.setItem('tp_users', JSON.stringify(list));
    return list;
  } catch (error) {
    console.error("❌ Firestore fetchUsersList failed.", error);
    return JSON.parse(localStorage.getItem('tp_users')) || [];
  }
}

// Save or Update a single user role/metadata
export async function saveUserRole(uid, userData) {
  if (!isCloudConnected()) return false;
  try {
    const docRef = doc(db, "app_users", uid);
    await setDoc(docRef, { ...userData, updatedAt: Date.now() }, { merge: true });
    console.log(`✅ User role/metadata for "${uid}" updated successfully.`);
    return true;
  } catch (error) {
    console.error("❌ Firestore saveUserRole failed.", error);
    return false;
  }
}

// Delete user from app metadata listing
export async function deleteUserMetadata(uid) {
  if (!isCloudConnected()) return false;
  try {
    await deleteDoc(doc(db, "app_users", uid));
    console.log(`🗑️ User metadata "${uid}" deleted.`);
    return true;
  } catch (error) {
    console.error("❌ Firestore deleteUserMetadata failed.", error);
    return false;
  }
}

export async function checkUserExists(uid) {
  if (!isCloudConnected() || !uid) return false;
  try {
    const docRef = doc(db, "app_users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error("❌ checkUserExists failed:", error);
    return false;
  }
}

// Register user metadata on successful login if it doesn't exist yet
export async function registerUserMetadata(user) {
  if (!isCloudConnected() || !user) return;
  try {
    const docRef = doc(db, "app_users", user.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const isMainAdmin = user.email === 'bandit1999main@gmail.com';
      await setDoc(docRef, {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        lastLogin: Date.now(),
        role: isMainAdmin ? 'admin' : 'user',
        approved: isMainAdmin ? true : false
      });
      console.log(`🆕 Registered new user: ${user.email} (Approved: ${isMainAdmin})`);
    } else {
      await setDoc(docRef, {
        lastLogin: Date.now()
      }, { merge: true });
    }
  } catch (error) {
    console.error("❌ Failed to register user metadata on Firestore:", error);
  }
}

// Real-time listener for current user's profile to dynamically unlock UI when approved
export function listenToUserProfile(uid, callback) {
  if (!isCloudConnected() || !uid) return null;
  return onSnapshot(doc(db, "app_users", uid), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Firestore listenToUserProfile failed:", error);
  });
}

export function listenToUsers(callback) {
  if (!isCloudConnected()) return null;
  return onSnapshot(collection(db, "app_users"), (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ ...doc.data(), uid: doc.id });
    });
    localStorage.setItem('tp_users', JSON.stringify(list));
    callback(list);
  }, (error) => {
    console.error("Firestore listenToUsers failed:", error);
  });
}




