// src/firebase/migrateUsersToAdmin.js

import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { database } from "./config";

const migrateUsersToAdmin = async () => {
  try {
    console.log("🔥 MIGRATION STARTED");

    const oldPath = ["mainData", "Billuload", "users"];
    const newPath = ["mainData", "Billuload", "Admin"];

    const oldUsersRef = collection(database, ...oldPath);
    const newAdminRef = collection(database, ...newPath);

    console.log("📁 Reading users from:", oldPath.join("/"));

    const snapshot = await getDocs(oldUsersRef);

    console.log("📌 Users found:", snapshot.size);

    if (snapshot.empty) {
      console.warn("⚠ No users found at old path!");
      return;
    }

    for (const docSnap of snapshot.docs) {
      const id = docSnap.id;
      const data = docSnap.data();

      console.log(`➡ Migrating user ${id} ...`);

      await setDoc(doc(newAdminRef, id), data);

      console.log(`✔ User ${id} migrated to Admin`);
    }

    console.log("🎉 MIGRATION COMPLETED");

  } catch (err) {
    console.error("❌ MIGRATION ERROR:", err);
  }
};

export default migrateUsersToAdmin;
