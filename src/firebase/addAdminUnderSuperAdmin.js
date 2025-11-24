// src/firebase/addAdminUnderSuperAdmin.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "./config";

export const addAdminUnderSuperAdmin = async (adminData) => {
  try {
    const superAdminId = "9XNRK9GmaMQviOrWhGeqawkoYg43";

    const adminRef = doc(
      db,
      "mainData",
      "Billuload",
      "Admin",
      superAdminId,
      "admins",
      adminData.adminId
    );

    await setDoc(adminRef, {
      ...adminData,
      createdAt: adminData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log("✅ Admin added to SuperAdmin node!");
    return { success: true, adminId: adminData.adminId };
  } catch (error) {
    console.error("❌ Error adding admin:", error);
    return { success: false, error: error.message };
  }
};
