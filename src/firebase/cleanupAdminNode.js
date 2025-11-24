import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "./config";

/**
 * Cleanup utility to remove the unused Admin node
 * Decision: Keep /users/ for admins, remove /Admin/ node to avoid confusion
 */
const cleanupAdminNode = async () => {
  try {
    console.log("🧹 CLEANUP STARTED: Removing unused Admin node");

    const adminPath = ["mainData", "Billuload", "Admin"];
    const adminRef = collection(db, ...adminPath);

    console.log("📁 Checking Admin node at:", adminPath.join("/"));

    const snapshot = await getDocs(adminRef);

    console.log("📌 Admin documents found:", snapshot.size);

    if (snapshot.empty) {
      console.log("✅ Admin node is already empty or doesn't exist");
      return;
    }

    // Delete all documents in Admin collection
    for (const docSnap of snapshot.docs) {
      const docId = docSnap.id;
      console.log(`🗑️ Deleting Admin document: ${docId}`);
      
      const docRef = doc(db, ...adminPath, docId);
      await deleteDoc(docRef);
      
      console.log(`✅ Deleted: ${docId}`);
    }

    console.log("🎉 CLEANUP COMPLETED: Admin node cleaned up");
    console.log("📋 DECISION: Using /users/ for admins, /Admin/ node removed");
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
};

export default cleanupAdminNode;
