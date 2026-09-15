"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { shouldUseBrowserAuth, signUpWithBrowser } from "../../lib/clientAuth";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", inviteCode: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [signupAs, setSignupAs] = useState<"user" | "admin">("user");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (shouldUseBrowserAuth()) {
        const user = signUpWithBrowser({ ...form, role: signupAs });
        router.replace(user.role === "admin" ? "/dashboard" : "/");
        return;
      }
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: signupAs }),
      });
      const result = (await response.json()) as { role?: "user" | "admin"; error?: string };
      if (!response.ok || !result.role) throw new Error(result.error || "Unable to create account");
      router.replace(result.role === "admin" ? "/dashboard" : "/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">Lifeline AI</p>
        <h1 className="mt-3 text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-slate-400">Set up secure access to emergency tools.</p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1">
          {[
            { value: "user", label: "Citizen" },
            { value: "admin", label: "Admin / Responder" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSignupAs(option.value as "user" | "admin")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                signupAs === option.value
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
            Full name
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-red-400" />
          </label>
          <label className="block text-sm text-slate-300">
            Email
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-red-400" />
          </label>
          <label className="block text-sm text-slate-300">
            Password
            <span className="relative mt-2 block">
              <input
                required
                minLength={8}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
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
            <span className="mt-1 block text-xs text-slate-500">Use at least 8 characters.</span>
          </label>
          {signupAs === "admin" && (
            <label className="block text-sm text-slate-300">
              Invite Code
              <input
                required
                type="password"
                placeholder="Invite code"
                value={form.inviteCode}
                onChange={(event) => setForm({ ...form, inviteCode: event.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none"
              />
            </label>
          )}
          {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <button disabled={isSubmitting} className="w-full rounded-xl bg-red-500 px-4 py-3 font-semibold transition hover:bg-red-600 disabled:opacity-60">
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already registered? <Link href="/login" className="font-semibold text-red-400 hover:text-red-300">Sign in</Link>
        </p>
      </section>
    </main>
  );
}