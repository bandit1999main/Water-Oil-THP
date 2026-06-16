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
  onSnapshot,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
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

// Collection name helper functions
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

  const match = collName.match(/employees_(\d{4})_(\d{2})/);
  if (match) {
    updateMonthlySummaryAfterSave(parseInt(match[1]), parseInt(match[2])).catch(err => console.error("Summary update failed:", err));
  }

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

  const match = collName.match(/water_employees_(\d{4})_(\d{2})/);
  if (match) {
    updateMonthlySummaryAfterSave(parseInt(match[1]), parseInt(match[2])).catch(err => console.error("Summary update failed:", err));
  }

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

export async function fetchEmployeesFromCollection(collName) {
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
    console.error(`❌ Firestore fetchEmployeesFromCollection failed for ${collName}. Falling back to local storage.`, error);
    return JSON.parse(localStorage.getItem(localKey)) || [];
  }
}

/**
 * --- ATTENDANCE CRUD ---
 */
export async function fetchAttendanceList(year, month) {
  const collName = `attendance_${year}_${String(month).padStart(2, '0')}`;
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
    console.error(`❌ Firestore fetchAttendanceList failed for ${collName}:`, error);
    return JSON.parse(localStorage.getItem(localKey)) || [];
  }
}

export async function saveAttendanceRecord(year, month, empName, checkedDays, dayStatuses = {}) {
  const collName = `attendance_${year}_${String(month).padStart(2, '0')}`;
  const localKey = `tp_${collName}`;
  
  const list = JSON.parse(localStorage.getItem(localKey)) || [];
  const idx = list.findIndex(item => item.name === empName);
  const record = { name: empName, checkedDays, dayStatuses };
  if (idx !== -1) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  localStorage.setItem(localKey, JSON.stringify(list));
  
  if (!isCloudConnected()) return false;
  
  try {
    const docRef = doc(db, collName, empName);
    await setDoc(docRef, record);
    return true;
  } catch (error) {
    console.error(`❌ Firestore saveAttendanceRecord failed for ${collName}:`, error);
    return false;
  }
}

export async function saveAttendanceList(year, month, attendanceList) {
  const collName = `attendance_${year}_${String(month).padStart(2, '0')}`;
  const localKey = `tp_${collName}`;
  
  localStorage.setItem(localKey, JSON.stringify(attendanceList));
  
  if (!isCloudConnected()) return false;
  
  try {
    const batch = writeBatch(db);
    
    const querySnapshot = await getDocs(collection(db, collName));
    querySnapshot.forEach((d) => {
      if (!attendanceList.some(item => item.name === d.id)) {
        batch.delete(doc(db, collName, d.id));
      }
    });
    
    attendanceList.forEach((item) => {
      const docRef = doc(db, collName, item.name);
      batch.set(docRef, item);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error(`❌ Firestore saveAttendanceList failed for ${collName}:`, error);
    return false;
  }
}

export function listenToAttendanceList(year, month, callback) {
  const collName = `attendance_${year}_${String(month).padStart(2, '0')}`;
  const localKey = `tp_${collName}`;
  if (!isCloudConnected()) return null;
  
  return onSnapshot(collection(db, collName), (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    localStorage.setItem(localKey, JSON.stringify(list));
    callback(list);
  }, (error) => {
    console.error(`❌ Firestore listenToAttendanceList failed for ${collName}:`, error);
  });
}

/**
 * --- MONTHLY SUMMARY Snapshots ---
 */
export async function fetchMonthlySummaries() {
  if (!isCloudConnected()) {
    return JSON.parse(localStorage.getItem('tp_monthly_summaries')) || [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, "monthly_summaries"));
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    localStorage.setItem('tp_monthly_summaries', JSON.stringify(list));
    return list;
  } catch (error) {
    console.error("❌ Firestore fetchMonthlySummaries failed. Falling back to local storage.", error);
    return JSON.parse(localStorage.getItem('tp_monthly_summaries')) || [];
  }
}

export async function saveMonthlySummary(year, month, summaryData) {
  const docId = `${year}_${String(month).padStart(2, '0')}`;
  
  const list = JSON.parse(localStorage.getItem('tp_monthly_summaries')) || [];
  const idx = list.findIndex(item => item.id === docId);
  const record = { ...summaryData, id: docId, year, month, updatedAt: Date.now() };
  if (idx !== -1) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  localStorage.setItem('tp_monthly_summaries', JSON.stringify(list));

  if (!isCloudConnected()) return false;
  try {
    const docRef = doc(db, "monthly_summaries", docId);
    await setDoc(docRef, record, { merge: true });
    console.log(`✅ Saved monthly summary snapshot for ${docId}`);
    return true;
  } catch (error) {
    console.error(`❌ Firestore saveMonthlySummary failed for ${docId}:`, error);
    return false;
  }
}

function calculateWaterTaxInternal(salary, totalAllowance) {
  const brackets = window.waterTaxBrackets || [
    { minSalary: 0, maxSalary: 25833, rate: 0.00 },
    { minSalary: 25834, maxSalary: 38333, rate: 0.05 },
    { minSalary: 38334, maxSalary: 55000, rate: 0.10 },
    { minSalary: 55001, maxSalary: 75833, rate: 0.15 },
    { minSalary: 75834, maxSalary: 96666, rate: 0.20 },
    { minSalary: 96667, maxSalary: 9999999, rate: 0.25 }
  ];
  for (const b of brackets) {
    if (salary >= b.minSalary && salary <= b.maxSalary) {
      return totalAllowance * (b.rate || 0);
    }
  }
  return 0;
}

export async function updateMonthlySummaryAfterSave(year, month) {
  const monthStr = String(month).padStart(2, '0');
  const fuelColl = `employees_${year}_${monthStr}`;
  const waterColl = `water_employees_${year}_${monthStr}`;
  
  const fuelList = await fetchEmployeesFromCollection(fuelColl);
  const waterList = await fetchEmployeesFromCollection(waterColl);
  
  let fuelTotalCost = 0;
  let maintTotalCost = 0;
  let fuelTotalNet = 0;
  let fuelLiters = 0;
  
  fuelList.forEach(emp => {
    fuelTotalCost += (emp.fuelCost || 0);
    maintTotalCost += (emp.maintCost || 0);
    fuelTotalNet += (emp.sumTotal || 0);
    fuelLiters += (emp.liters || 0);
  });
  
  let waterTotalCost = 0;
  let waterTotalTax = 0;
  let waterTotalNet = 0;
  
  waterList.forEach(emp => {
    const allowance = (emp.workDays || 0) * (window.waterAllowancePerDay || 30);
    const tax = calculateWaterTaxInternal(emp.salary || 0, allowance);
    const net = allowance - tax;
    waterTotalCost += allowance;
    waterTotalTax += tax;
    waterTotalNet += net;
  });
  
  const personnelNames = new Set();
  fuelList.forEach(e => personnelNames.add(e.name));
  waterList.forEach(e => personnelNames.add(e.name));
  
  const summaryData = {
    fuelTotalCost,
    maintTotalCost,
    fuelTotalNet,
    fuelLiters,
    waterTotalCost,
    waterTotalTax,
    waterTotalNet,
    totalPersonnelCount: personnelNames.size
  };
  
  await saveMonthlySummary(year, month, summaryData);
}
/**
 * --- GLOBAL CONFIGS ---
 */
export async function fetchGlobalConfigs() {
  const defaultConfigs = {
    waterAllowancePerDay: 30,
    postOfficeName: "ไปรษณีย์ไทย",
    defaultFuelPrice: 35.00,
    waterTaxBrackets: [
      { minSalary: 0, maxSalary: 25833, rate: 0.00 },
      { minSalary: 25834, maxSalary: 38333, rate: 0.05 },
      { minSalary: 38334, maxSalary: 55000, rate: 0.10 },
      { minSalary: 55001, maxSalary: 75833, rate: 0.15 },
      { minSalary: 75834, maxSalary: 96666, rate: 0.20 },
      { minSalary: 96667, maxSalary: 9999999, rate: 0.25 }
    ]
  };
  if (!isCloudConnected()) {
    try {
      return JSON.parse(localStorage.getItem('tp_global_configs')) || defaultConfigs;
    } catch (e) {
      return defaultConfigs;
    }
  }
  try {
    const docRef = doc(db, "configs", "global_variables");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      localStorage.setItem('tp_global_configs', JSON.stringify(data));
      return data;
    } else {
      await setDoc(docRef, defaultConfigs);
      localStorage.setItem('tp_global_configs', JSON.stringify(defaultConfigs));
      return defaultConfigs;
    }
  } catch (error) {
    console.error("❌ Firestore fetchGlobalConfigs failed. Falling back to local storage.", error);
    try {
      return JSON.parse(localStorage.getItem('tp_global_configs')) || defaultConfigs;
    } catch (e) {
      return defaultConfigs;
    }
  }
}

export async function saveGlobalConfigs(configs) {
  localStorage.setItem('tp_global_configs', JSON.stringify(configs));
  if (!isCloudConnected()) return false;
  try {
    const docRef = doc(db, "configs", "global_variables");
    await setDoc(docRef, configs, { merge: true });
    console.log("✅ Saved global configs successfully");
    return true;
  } catch (error) {
    console.error("❌ Firestore saveGlobalConfigs failed:", error);
    return false;
  }
}

/**
 * --- MONTH LOCK ---
 */
export async function fetchMonthLock(year, month) {
  const docId = `lock_${year}_${String(month).padStart(2, '0')}`;
  if (!isCloudConnected()) {
    return localStorage.getItem(`tp_${docId}`) === 'true';
  }
  try {
    const docRef = doc(db, "configs", docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const isLocked = docSnap.data().isLocked || false;
      localStorage.setItem(`tp_${docId}`, String(isLocked));
      return isLocked;
    }
    return false;
  } catch (error) {
    console.error("❌ fetchMonthLock failed:", error);
    return localStorage.getItem(`tp_${docId}`) === 'true';
  }
}

export async function saveMonthLock(year, month, isLocked) {
  const docId = `lock_${year}_${String(month).padStart(2, '0')}`;
  localStorage.setItem(`tp_${docId}`, String(isLocked));
  if (!isCloudConnected()) return false;
  try {
    const docRef = doc(db, "configs", docId);
    await setDoc(docRef, { isLocked });
    console.log(`✅ Set lock for ${docId} to ${isLocked}`);
    return true;
  } catch (error) {
    console.error("❌ saveMonthLock failed:", error);
    return false;
  }
}

/**
 * --- ACTIVITY AUDIT LOGS ---
 */
export async function logActivity(actionType, description) {
  const auth = getFirebaseAuth();
  const user = auth ? auth.currentUser : null;
  const actorEmail = user ? user.email : 'Anonymous';
  const actorName = user ? (user.displayName || user.email) : 'Anonymous';

  if (!isCloudConnected()) {
    console.warn("⚠️ Offline: Cannot write logActivity on cloud:", actionType, description);
    return false;
  }

  try {
    const colRef = collection(db, "activity_logs");
    await addDoc(colRef, {
      actorEmail,
      actorName,
      actionType,
      description,
      timestamp: serverTimestamp()
    });
    console.log(`📝 Logged activity: ${actionType} - ${description}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to logActivity:", error);
    return false;
  }
}

export async function fetchActivityLogs(limitCount = 50) {
  if (!isCloudConnected()) return [];
  try {
    const colRef = collection(db, "activity_logs");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    const logs = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      logs.push({
        id: docSnap.id,
        ...data,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
      });
    });
    return logs;
  } catch (error) {
    console.error("❌ Failed to fetchActivityLogs:", error);
    return [];
  }
}


