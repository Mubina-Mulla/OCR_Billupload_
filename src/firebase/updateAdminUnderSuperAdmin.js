// src/firebase/updateAdminUnderSuperAdmin.js
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./config";

export const updateAdminUnderSuperAdmin = async (adminId, updateData) => {
  try {
    const superAdminId = "9XNRK9GmaMQviOrWhGeqawkoYg43";

    const adminRef = doc(
      db,
      "mainData",
      "Billuload",
      "Admin",
      superAdminId,
      "admins",
      adminId
    );

    await updateDoc(adminRef, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    console.log("✅ Admin updated successfully!");
    return { success: true };
  } catch (error) {
    console.error("❌ Error updating admin:", error);
    return { success: false, error: error.message };
  }
};
