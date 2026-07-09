import { useState } from "react";
import { supabase } from "./lib/supabase";
import { BRAND } from "./brand";
import { Mail, Lock, User, Loader2, AlertCircle } from "lucide-react";

const C = {
  teal: "#5eead4", tealDark: "#2dd4bf",
  blue: "#818cf8", blueDark: "#6366f1",
  purple: "#a78bfa", purpleDark: "#8b5cf6",
  green: "#10b981", amber: "#f59e0b", red: "#ef4444",
  bg: "#0a0a14", bgCard: "#12121e", bgHover: "#1a1a2e",
  border: "#1e1e32", borderLight: "#2a2a44",
  text: "#f0f0f8", textMuted: "#8888a8", textDim: "#55557a",
};

const TriskopeLogo = ({ size = 64 }) => {
  if (BRAND.key === "marketedge") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M14 90 L14 12 L52 52 L88 14 L88 34" fill="none" stroke="#c6a15b" strokeWidth="11" strokeLinejoin="miter" />
        <rect x="57" y="46" width="31" height="10" fill="#f4f0e6" />
        <rect x="57" y="62" width="31" height="10" fill="#f4f0e6" />
        <rect x="57" y="78" width="31" height="10" fill="#f4f0e6" />
      </svg>
    );
  }
  const r = size * 0.22;
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy - r * 0.7} r={r} fill="none" stroke={C.teal} strokeWidth={1.5} opacity={0.9} />
      <circle cx={cx - r * 0.65} cy={cy + r * 0.45} r={r} fill="none" stroke={C.blue} strokeWidth={1.5} opacity={0.9} />
      <circle cx={cx + r * 0.65} cy={cy + r * 0.45} r={r} fill="none" stroke={C.purple} strokeWidth={1.5} opacity={0.9} />
    </svg>
  );
};

const inputStyle = {
  width: "100%", padding: "12px 14px 12px 40px",
  background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 10, color: C.text, fontSize: 14, outline: "none",
  transition: "border-color 0.15s ease",
};

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setInfo("");
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split("@")[0] } },
        });
        if (err) throw err;
        setInfo("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: `radial-gradient(circle at top right, ${C.blue}10, transparent 50%), radial-gradient(circle at bottom left, ${C.teal}08, transparent 50%), ${C.bg}`,
      color: C.text, fontFamily: "-apple-system, system-ui, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <style>{`
        @keyframes tk-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 420,
        background: C.bgCard, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 32,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        animation: "tk-fade-in 0.3s ease",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <TriskopeLogo size={64} />
          <div style={{ fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: "0.05em", marginTop: 12 }}>
            {BRAND.wordmarkParts
              ? <>{BRAND.wordmarkParts[0]}&nbsp;<span style={{ color: "#c6a15b" }}>{BRAND.wordmarkParts[1]}</span></>
              : BRAND.wordmark}
          </div>
          <div style={{ fontSize: 12, color: C.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 4 }}>
            see everything together
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: "center", padding: "10px 12px" }}>
            Sign in to your workspace
          </div>
        </div>

        <form onSubmit={submit}>
          {false && mode === "signup" && (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <User size={16} color={C.textDim} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text" value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name (optional)"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ position: "relative", marginBottom: 12 }}>
            <Mail size={16} color={C.textDim} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email" required
              style={inputStyle}
            />
          </div>

          <div style={{ position: "relative", marginBottom: 16 }}>
            <Lock size={16} color={C.textDim} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6} required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: 12, marginBottom: 12,
              background: C.red + "15", border: `1px solid ${C.red}40`,
              borderRadius: 8, color: C.red, fontSize: 13,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div style={{
              padding: 12, marginBottom: 12,
              background: C.teal + "15", border: `1px solid ${C.teal}40`,
              borderRadius: 8, color: C.teal, fontSize: 13,
            }}>
              {info}
            </div>
          )}

          <button type="submit" disabled={loading || !email || !password} style={{
            width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
            color: "#0a0a14", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer",
            opacity: (loading || !email || !password) ? 0.65 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            minHeight: 48, transition: "transform 0.15s ease, opacity 0.15s ease",
          }}>
            {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            Sign in
          </button>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </form>

        <div style={{
          marginTop: 20, fontSize: 11, color: C.textDim, textAlign: "center", lineHeight: 1.6,
        }}>
          By continuing you agree to {BRAND.name}'s terms and acknowledge our privacy policy.
        </div>
        {BRAND.key === "marketedge" && (
          <a href="https://triskope.com" target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            marginTop: 16, fontSize: 10, color: C.textDim, letterSpacing: "0.16em",
            textTransform: "uppercase", textDecoration: "none",
          }}>
            <svg width={16} height={16} viewBox="0 0 16 16">
              <circle cx="8" cy="5.5" r="2.6" fill="none" stroke="#5eead4" strokeWidth="1.1" opacity="0.9" />
              <circle cx="6.3" cy="8.7" r="2.6" fill="none" stroke="#818cf8" strokeWidth="1.1" opacity="0.9" />
              <circle cx="9.7" cy="8.7" r="2.6" fill="none" stroke="#a78bfa" strokeWidth="1.1" opacity="0.9" />
            </svg>
            Powered by Triskope
          </a>
        )}
      </div>
    </div>
  );
}
