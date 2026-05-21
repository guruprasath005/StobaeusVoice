"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);

      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await res.json();
      login(data.access_token, data.user);
      router.push(data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden">
      {/* dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #d4d4d2 1px, transparent 0)",
          backgroundSize: "22px 22px",
          opacity: 0.5,
        }}
      />

      <div className="relative w-full max-w-sm mx-4">
        <div
          className="bg-white rounded-xl p-7"
          style={{ border: "1.5px solid #1a1a1a", boxShadow: "4px 4px 0 #1a1a1a" }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#e11d48] text-white flex items-center justify-center font-bold text-lg">
              S
            </div>
            <span className="text-xl font-bold">
              Stobaeus<span className="text-[#e11d48]">Voice</span>
            </span>
          </div>
          <p className="text-center text-xs text-gray-500 mb-6">
            Voice-first cardiac documentation for cardiologists
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@apollochennai.in"
                className="w-full border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e11d48]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-dashed border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#e11d48]"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e11d48] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#be123c] transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Access is by invitation only.{" "}
            <span className="text-gray-500">Contact your Hospital Admin to get access.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
