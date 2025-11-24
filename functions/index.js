const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// CALCULATE TICKET POINTS
function calculateTicketPoints(assignedAt, resolvedAt, endDate) {
  const assign = new Date(assignedAt);
  const resolved = new Date(resolvedAt);
  const end = new Date(endDate);

  // RULE 3: If resolved after end date → zero points
  if (resolved > end) return 0;

  const diffMs = resolved - assign;
  const diffHours = diffMs / (1000 * 60 * 60);

  // RULE 1: Within 24 hours → 100 points
  if (diffHours <= 24) return 100;

  // RULE 2: After 24 hours → subtract 10 per extra day
  const extraHours = diffHours - 24;
  const extraDays = Math.ceil(extraHours / 24);

  let points = 100 - extraDays * 10;
  if (points < 0) points = 0;

  return points;
}

// CALCULATE TOTAL POINTS FOR ADMIN
async function calculateAdminTotalPoints(adminId) {
  const ticketsRef = db
    .collection("mainData")
    .doc("Billuload")
    .collection("users")
    .doc(adminId)
    .collection("tickets");

  const snapshot = await ticketsRef.get();

  let totalPoints = 0;
  let resolvedCount = 0;

  snapshot.forEach((doc) => {
    const ticket = doc.data();

    if (
      ticket.status === "resolved" ||
      ticket.status === "Resolved" ||
      ticket.status === "Completed"
    ) {
      const assignedAt = ticket.assignedAt || ticket.createdAt;
      const resolvedAt = ticket.resolvedAt || ticket.resolvedDate;
      const endDate = ticket.endDate || ticket.expectedEndDate;

      if (assignedAt && resolvedAt && endDate) {
        const points = calculateTicketPoints(assignedAt, resolvedAt, endDate);
        totalPoints += points;
        resolvedCount++;
      }
    }
  });

  return {
    totalPoints,
    resolvedCount,
    totalTickets: snapshot.size,
  };
}

// AUTO UPDATE POINTS ON TICKET RESOLVE
exports.updatePointsOnTicketResolve = functions.firestore
  .document("mainData/Billuload/users/{adminId}/tickets/{ticketId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const adminId = context.params.adminId;

    // Only run when status changes to resolved
    const wasNotResolved =
      before.status !== "resolved" &&
      before.status !== "Resolved" &&
      before.status !== "Completed";
    const isNowResolved =
      after.status === "resolved" ||
      after.status === "Resolved" ||
      after.status === "Completed";

    if (wasNotResolved && isNowResolved) {
      console.log(`🎯 Ticket ${context.params.ticketId} resolved for admin ${adminId}`);

      // Calculate total points for this admin
      const pointsData = await calculateAdminTotalPoints(adminId);

      console.log(`📊 Admin ${adminId} total points:`, pointsData);

      // Save points to SuperAdmin → admins
      const superAdminId = "9XNRK9GmaMQviOrWhGeqawkoYg43";

      const adminRef = db
        .collection("mainData")
        .doc("Billuload")
        .collection("Admin")
        .doc(superAdminId)
        .collection("admins")
        .doc(adminId);

      await adminRef.set(
        {
          points: pointsData.totalPoints,
          resolvedTickets: pointsData.resolvedCount,
          totalTickets: pointsData.totalTickets,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log(`✅ Updated admin ${adminId} with ${pointsData.totalPoints} points`);
    }

    return null;
  });

// MANUAL RECALCULATION FUNCTION (callable from frontend)
exports.recalculateAdminPoints = functions.https.onCall(async (data, context) => {
  const { adminId } = data;

  if (!adminId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Admin ID is required"
    );
  }

  try {
    const pointsData = await calculateAdminTotalPoints(adminId);

    const superAdminId = "9XNRK9GmaMQviOrWhGeqawkoYg43";

    const adminRef = db
      .collection("mainData")
      .doc("Billuload")
      .collection("Admin")
      .doc(superAdminId)
      .collection("admins")
      .doc(adminId);

    await adminRef.set(
      {
        points: pointsData.totalPoints,
        resolvedTickets: pointsData.resolvedCount,
        totalTickets: pointsData.totalTickets,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      success: true,
      points: pointsData.totalPoints,
      resolvedTickets: pointsData.resolvedCount,
      totalTickets: pointsData.totalTickets,
    };
  } catch (error) {
    console.error("Error recalculating points:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
