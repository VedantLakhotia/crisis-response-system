import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ShieldAlert, LogIn, ArrowRight, UserSquare2, Home } from "lucide-react";
import { toast } from "sonner";

export default function LandingPage() {
  const navigate = useNavigate();
  
  // Staff Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Guest State
  const [room, setRoom] = useState("");

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // ProtectedRoute will verify allowlist upon navigating
      navigate("/staff");
    } catch (error) {
      toast.error("Login Failed", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEntry = (e) => {
    e.preventDefault();
    if (room.trim() === "") return;
    navigate(`/guest-safety?room=${encodeURIComponent(room.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="p-8 text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-2xl border border-red-500/20 mb-6 relative">
          <ShieldAlert size={32} className="text-red-500" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse ring-4 ring-[#0a0a0c]" />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Crisis Control Center</h1>
        <p className="text-slate-400 max-w-lg mx-auto">Select your portal to proceed. Authorized staff can access the central dashboard, while guests can access the emergency assistance system.</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          
          {/* Guest Portal Card */}
          <div className="glass p-8 rounded-3xl shadow-2xl border border-white/5 flex flex-col justify-between" style={{ background: "linear-gradient(160deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.4) 100%)" }}>
            <div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                <Home size={24} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Guest Safety Portal</h2>
              <p className="text-sm text-slate-400 mb-8">Access the emergency assistance portal. No password required, just enter your room number.</p>
            </div>

            <form onSubmit={handleGuestEntry} className="flex flex-col gap-4 mt-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Room Number</label>
                <input 
                  type="text" 
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/70 transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  placeholder="e.g. 302"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2"
              >
                Access Portal <ArrowRight size={18} />
              </button>
            </form>
          </div>

          {/* Staff Login Card */}
          <div className="glass p-8 rounded-3xl shadow-2xl border border-white/10 flex flex-col justify-between relative overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(22,22,28,0.8) 0%, rgba(14,14,18,0.9) 100%)" }}>
            {/* Subtle red glow for staff side */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none" />
            
            <div>
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-6 border border-red-500/20">
                <UserSquare2 size={24} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Staff Dashboard</h2>
              <p className="text-sm text-slate-400 mb-8">Secure login for authorized personnel to monitor and manage emergency situations.</p>
            </div>

            <form onSubmit={handleStaffLogin} className="flex flex-col gap-4 mt-auto relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/70 transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/70 transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                style={{
                  background: loading ? "#7f1d1d" : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  boxShadow: "0 8px 24px rgba(220,38,38,0.25)"
                }}
              >
                {loading ? (
                  <svg className="animate-spin w-5 h-5 text-red-200" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <>
                    <LogIn size={18} /> Staff Login
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
