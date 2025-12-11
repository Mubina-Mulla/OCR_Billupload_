// src/firebase/updateAdminPoints.js
import { calculateAdminTotalPoints } from "./calculateAdminPoints";
import { saveAdminPoints } from "./saveAdminPoints";

/**
 * Complete process: Calculate admin points and save to Firestore
 * This should be called whenever a ticket is resolved
 */
export const updatePointsForAdmin = async (adminId) => {
  try {
    console.log(`🎯 Calculating points for admin: ${adminId}`);
    
    // Calculate total points from all tickets
    const pointsData = await calculateAdminTotalPoints(adminId);
    
    console.log(`📊 Admin ${adminId} points:`, pointsData);
    
    // Save to SuperAdmin → admins node
    const result = await saveAdminPoints(adminId, pointsData);
    
    if (result.success) {
      console.log(`✅ Successfully updated points for admin ${adminId}`);
      return {
        success: true,
        points: pointsData.totalPoints,
        resolvedTickets: pointsData.resolvedCount,
        totalTickets: pointsData.totalTickets
      };
    } else {
      console.error(`❌ Failed to save points for admin ${adminId}`);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error("Error updating admin points:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update points for all admins
 * Useful for batch updates or recalculation
 */
export const updatePointsForAllAdmins = async (adminIds) => {
  const results = [];
  
  for (const adminId of adminIds) {
    const result = await updatePointsForAdmin(adminId);
    results.push({
      adminId,
      ...result
    });
  }
  
  return results;
};
