// src/firebase/saveAdminPoints.js
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

const SUPERADMIN_ID = "9XNRK9GmaMQviOrWhGeqawkoYg43";

/**
 * Save admin points to SuperAdmin → admins node
 * Path: mainData/Billuload/Admin/9XNRK9GmaMQviOrWhGeqawkoYg43/admins/{adminId}
 */
export const saveAdminPoints = async (adminId, pointsData) => {
  try {
    const adminRef = doc(
      db,
      "mainData",
      "Billuload",
      "Admin",
      SUPERADMIN_ID,
      "admins",
      adminId
    );

    await updateDoc(adminRef, {
      points: pointsData.totalPoints,
      resolvedTickets: pointsData.resolvedCount,
      totalTickets: pointsData.totalTickets,
      lastUpdated: new Date().toISOString()
    });

    console.log(`✅ Updated admin ${adminId} with ${pointsData.totalPoints} points`);
    return { success: true };
  } catch (error) {
    // If document doesn't exist, create it
    if (error.code === 'not-found') {
      try {
        const adminRef = doc(
          db,
          "mainData",
          "Billuload",
          "Admin",
          SUPERADMIN_ID,
          "admins",
          adminId
        );

        await setDoc(adminRef, {
          points: pointsData.totalPoints,
          resolvedTickets: pointsData.resolvedCount,
          totalTickets: pointsData.totalTickets,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        console.log(`✅ Created admin ${adminId} with ${pointsData.totalPoints} points`);
        return { success: true };
      } catch (createError) {
        console.error("Error creating admin points:", createError);
        return { success: false, error: createError.message };
      }
    }
    
    console.error("Error saving admin points:", error);
    return { success: false, error: error.message };
  }
};
