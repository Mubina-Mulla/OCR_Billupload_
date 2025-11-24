import { getAuth, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";

/**
 * Reset password for a user who can't login
 * This will send a password reset email to the user
 */
const resetUserPassword = async (email) => {
  try {
    console.log(`🔐 RESETTING PASSWORD for: ${email}`);
    
    const auth = getAuth();
    
    // First check if the email exists in Firebase Auth
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      if (signInMethods.length === 0) {
        console.log(`❌ Email ${email} not found in Firebase Auth`);
        return {
          success: false,
          error: "Email not found in Firebase Authentication. User may need to be created first."
        };
      }
      
      console.log(`✅ Email ${email} found with sign-in methods:`, signInMethods);
    } catch (error) {
      console.log(`❌ Error checking email ${email}:`, error.message);
      return {
        success: false,
        error: `Error checking email: ${error.message}`
      };
    }
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    
    console.log(`✅ Password reset email sent to: ${email}`);
    
    return {
      success: true,
      message: `Password reset email sent to ${email}. Check inbox and spam folder.`
    };
    
  } catch (error) {
    console.error(`❌ Error resetting password for ${email}:`, error);
    
    let errorMessage = error.message;
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      errorMessage = "User not found in Firebase Authentication";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Invalid email address";
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = "Too many requests. Try again later.";
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

export default resetUserPassword;
