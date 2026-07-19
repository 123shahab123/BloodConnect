import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "../../services/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      toast.error("Email and password required");
      return;
    }
    setLoading(true);
    try {
      const res = await adminApi.login(form.email, form.password);
      console.log(res.data);
      // const { token, admin } = res.data.data;
      // localStorage.setItem("bc_admin_token", token);
      // localStorage.setItem("bc_admin", JSON.stringify(admin));
      const { access_token, admin } = res.data.data;
      localStorage.setItem("bc_admin_token", access_token);
      localStorage.setItem("bc_admin", JSON.stringify(admin));
      console.log("Stored token:", localStorage.getItem("bc_admin_token"));

      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-dark to-gray-800 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blood flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">BloodConnect</h1>
          <p className="text-white/60 text-sm mt-1">Admin Dashboard</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-lg font-bold text-neutral-dark mb-5">Sign In</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="admin@bloodconnect.af"
                className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 pe-10 text-sm font-medium outline-none transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-5 w-full py-3.5 rounded-xl bg-blood text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-4">
            Default: admin@bloodconnect.af / BloodConnect@Admin2026!
          </p>
        </div>
      </div>
    </div>
  );
}
