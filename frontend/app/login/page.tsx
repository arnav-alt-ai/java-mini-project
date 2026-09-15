"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getStoredSession, shouldUseBrowserAuth, signInWithBrowser } from "../../lib/clientAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginAs, setLoginAs] = useState<"user" | "admin">("user");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (shouldUseBrowserAuth()) {
      const user = getStoredSession();
      if (user) router.replace(user.role === "admin" ? "/dashboard" : "/");
      return;
    }

    void fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { user?: { role: "user" | "admin" } };
      })
      .then((result) => {
        if (result?.user) {
          router.replace(result.user.role === "admin" ? "/dashboard" : "/");
        }
      })
      .catch(() => undefined);
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (shouldUseBrowserAuth()) {
        const user = signInWithBrowser(email, password, loginAs);
        router.replace(user.role === "admin" ? "/dashboard" : "/");
        return;
      }
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, expectedRole: loginAs }),
      });
      const result = (await response.json()) as { role?: "user" | "admin"; error?: string };
      if (!response.ok || !result.role) throw new Error(result.error || "Unable to sign in");
      router.replace(result.role === "admin" ? "/dashboard" : "/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">Lifeline AI</p>
        <h1 className="mt-3 text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to access emergency assistance.</p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1">
          {[
            { value: "user", label: "Citizen" },
            { value: "admin", label: "Admin / Responder" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLoginAs(option.value as "user" | "admin")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                loginAs === option.value
                  ? "bg-red-500 text-white"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm text-slate-300">
            Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-red-400" />
          </label>
          <label className="block text-sm text-slate-300">
            Password
            <span className="relative mt-2 block">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 pr-12 outline-none focus:border-red-400"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 transition hover:text-white"
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </span>
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <button disabled={isSubmitting} className="w-full rounded-xl bg-red-500 px-4 py-3 font-semibold transition hover:bg-red-600 disabled:opacity-60">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New to Lifeline AI? <Link href="/signup" className="font-semibold text-red-400 hover:text-red-300">Create an account</Link>
        </p>
      </section>
    </main>
  );
}