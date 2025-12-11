// src/firebase/calculateAdminPoints.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";

/**
 * Calculate points for a single ticket based on resolution time
 * RULE 1: Within 24 hours = 100 points
 * RULE 2: After 24 hours = 100 - (10 × extra days)
 * RULE 3: Resolved after endDate = 0 points
 */
export const calculateTicketPoints = (assignedAt, resolvedAt, endDate) => {
  if (!assignedAt || !resolvedAt || !endDate) {
    return 0;
  }

  try {
    const assign = new Date(assignedAt);
    const resolved = new Date(resolvedAt);
    const end = new Date(endDate);

    // RULE 3: If resolved after endDate → 0 points
    if (resolved > end) {
      return 0;
    }

    // Hours taken to resolve
    const diffMs = resolved - assign;
    const diffHours = diffMs / (1000 * 60 * 60);

    // RULE 1: Resolved within 24 hours → 100 points
    if (diffHours <= 24) {
      return 100;
    }

    // RULE 2: Ticket took more than 24 hours → subtract 10 per day
    const extraHours = diffHours - 24;
    const extraDays = Math.ceil(extraHours / 24); // round up full days

    let points = 100 - (extraDays * 10);

    // Do not allow negative points
    if (points < 0) points = 0;

    return points;
  } catch (error) {
    console.error("Error calculating ticket points:", error);
    return 0;
  }
};

/**
 * Calculate total points for an admin based on all their resolved tickets
 */
export const calculateAdminTotalPoints = async (adminId) => {
  try {
    const ticketsRef = collection(
      db,
      "mainData",
      "Billuload",
      "users",
      adminId,
      "tickets"
    );

    const snapshot = await getDocs(ticketsRef);

    let totalPoints = 0;
    let resolvedCount = 0;

    snapshot.forEach((ticketDoc) => {
      const ticket = ticketDoc.data();

      if (ticket.status === "resolved" || ticket.status === "Resolved" || ticket.status === "Completed") {
        const points = calculateTicketPoints(
          ticket.assignedAt || ticket.createdAt,
          ticket.resolvedAt || ticket.resolvedDate,
          ticket.endDate || ticket.expectedEndDate
        );

        totalPoints += points;
        resolvedCount++;
      }
    });

    return {
      totalPoints,
      resolvedCount,
      totalTickets: snapshot.size
    };
  } catch (error) {
    console.error("Error calculating admin total points:", error);
    return {
      totalPoints: 0,
      resolvedCount: 0,
      totalTickets: 0
    };
  }
};
