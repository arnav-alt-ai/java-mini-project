"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession, shouldUseBrowserAuth } from "../lib/clientAuth";

type ProtectedRouteProps = { children: ReactNode; role?: "user" | "admin" };

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    if (shouldUseBrowserAuth()) {
      const user = getStoredSession();
      if (!user) {
        router.replace("/login");
        return () => {
          active = false;
        };
      }
      if (role && user.role !== role) {
        router.replace(user.role === "admin" ? "/dashboard" : "/");
        return () => {
          active = false;
        };
      }
      window.setTimeout(() => {
        if (active) setAuthorized(true);
      }, 0);
      return () => {
        active = false;
      };
    }
    void fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unauthenticated");
        return (await response.json()) as { user: { role: "user" | "admin" } };
      })
      .then(({ user }) => {
        if (!active) return;
        if (role && user.role !== role) {
          router.replace(user.role === "admin" ? "/dashboard" : "/");
          return;
        }
        setAuthorized(true);
      })
      .catch(() => router.replace("/login"));
    return () => {
      active = false;
    };
  }, [role, router]);

  if (!authorized) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Checking access...</div>;
  }
  return children;
}