"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  EyeOff,
  Eye,
} from "lucide-react";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Brand Panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 bg-[#0f172a] relative overflow-hidden p-12">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-blue-600 opacity-10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 w-64 h-64 rounded-full bg-indigo-600 opacity-10 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-900/40">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">
            {process.env.NEXT_PUBLIC_APP_NAME}
          </span>
        </div>

        {/* Hero text */}
        <div className="relative mt-auto mb-12">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Send smarter
            <br />
            campaigns.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            The email campaign platform built for high deliverability, deep
            analytics, and real personalisation at scale.
          </p>
        </div>

        {/* Features */}
        <div className="relative space-y-4">
          {[
            {
              icon: Sparkles,
              label: "Visual email builder — drag & drop blocks",
            },
            { icon: Zap, label: "Batch sends via system with tracking" },
            { icon: Shield, label: "SPF/DKIM domain verification built-in" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-sm text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Form Panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">
              {process.env.NEXT_PUBLIC_APP_NAME}
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">
                Sign in to your account to continue
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all disabled:opacity-60 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"} // Dynamic input masking
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all disabled:opacity-60 placeholder:text-gray-400"
                  />
                  {/* Visibility toggle icon button */}
                  <button
                    type="button" // Prevents form submission on enter/click
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
                    tabIndex={-1} // Skips button in standard keyboard tab focus sequences
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-sm shadow-blue-200 mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
