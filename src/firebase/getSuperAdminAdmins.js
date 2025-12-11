// src/firebase/getSuperAdminAdmins.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";

export const getAdminsUnderSuperAdmin = async () => {
  try {
    const superAdminId = "9XNRK9GmaMQviOrWhGeqawkoYg43";

    const ref = collection(
      db,
      "mainData",
      "Billuload",
      "Admin",
      superAdminId,
      "admins"
    );

    const snapshot = await getDocs(ref);

    const admins = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ Fetched ${admins.length} admins from SuperAdmin node`);
    return admins;
  } catch (error) {
    console.error("❌ Error fetching admins:", error);
    return [];
  }
};
