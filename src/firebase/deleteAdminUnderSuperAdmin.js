// src/firebase/deleteAdminUnderSuperAdmin.js
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "./config";

export const deleteAdminUnderSuperAdmin = async (adminId) => {
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

    await deleteDoc(adminRef);

    console.log("✅ Admin deleted successfully!");
    return { success: true };
  } catch (error) {
    console.error("❌ Error deleting admin:", error);
    return { success: false, error: error.message };
  }
};
