import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "sonner";

// Hardcoded allowlist of authorized staff emails
const ALLOWLIST = [
  "vedant.lakhotia@iips.edu",
  // add more here if needed
];

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (ALLOWLIST.includes(currentUser.email)) {
          setUser(currentUser);
        } else {
          // Unauthorized email, log them out immediately
          await signOut(auth);
          toast.error("Security Alert: Unauthorized Access", {
            description: "Your email is not on the authorized staff allowlist."
          });
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
