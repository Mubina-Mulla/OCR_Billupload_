import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "./config";

/**
 * Initialize tickets subcollection for all users who don't have it
 * Also fix any user authentication issues
 */
const initializeUserTickets = async () => {
  try {
    console.log("🚀 INITIALIZING USER TICKETS: Starting process...");

    const usersPath = ["mainData", "Billuload", "users"];
    const usersRef = collection(db, ...usersPath);

    console.log("📁 Reading users from:", usersPath.join("/"));

    const snapshot = await getDocs(usersRef);

    console.log("📌 Users found:", snapshot.size);

    if (snapshot.empty) {
      console.warn("⚠ No users found!");
      return;
    }

    const results = {
      totalUsers: snapshot.size,
      usersWithTickets: 0,
      usersInitialized: 0,
      usersFixed: 0,
      errors: []
    };

    for (const userDoc of snapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`\n👤 Processing user: ${userId}`);
      console.log("📋 User data:", {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        active: userData.active
      });

      try {
        // Check if user has tickets subcollection
        const userTicketsRef = collection(db, ...usersPath, userId, 'tickets');
        const ticketsSnapshot = await getDocs(userTicketsRef);
        
        if (ticketsSnapshot.empty) {
          console.log(`📝 User ${userId} has no tickets subcollection. Creating...`);
          
          // Create a placeholder document to initialize the subcollection
          const placeholderTicketRef = doc(userTicketsRef, 'placeholder');
          await setDoc(placeholderTicketRef, {
            isPlaceholder: true,
            createdAt: new Date().toISOString(),
            note: "Placeholder ticket to initialize subcollection - can be deleted when real tickets are added"
          });
          
          console.log(`✅ Initialized tickets subcollection for user ${userId}`);
          results.usersInitialized++;
        } else {
          console.log(`✅ User ${userId} already has ${ticketsSnapshot.size} tickets`);
          results.usersWithTickets++;
        }

        // Fix user data if needed
        let needsUpdate = false;
        const updates = {};

        // Ensure user has required fields
        if (!userData.active && userData.active !== false) {
          updates.active = true;
          needsUpdate = true;
          console.log(`🔧 Setting active=true for user ${userId}`);
        }

        if (!userData.role) {
          updates.role = 'admin';
          needsUpdate = true;
          console.log(`🔧 Setting role=admin for user ${userId}`);
        }

        if (!userData.name && userData.email) {
          // Extract name from email if no name exists
          updates.name = userData.email.split('@')[0];
          needsUpdate = true;
          console.log(`🔧 Setting name=${updates.name} for user ${userId}`);
        }

        if (needsUpdate) {
          const userDocRef = doc(db, ...usersPath, userId);
          await setDoc(userDocRef, updates, { merge: true });
          console.log(`✅ Updated user ${userId} data`);
          results.usersFixed++;
        }

      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error);
        results.errors.push({ userId, error: error.message });
      }
    }

    console.log("\n🎉 INITIALIZATION COMPLETED!");
    console.log("📊 Results:", results);
    
    return results;
    
  } catch (error) {
    console.error("❌ Error during initialization:", error);
    throw error;
  }
};

export default initializeUserTickets;
