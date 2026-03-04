"use client";

import { NavBar } from "./NavBar";
import { useUser } from "./UserContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, onLogin, onLogout } = useUser();
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-800 antialiased">
      <NavBar user={user} onLogin={onLogin} onLogout={onLogout} />
      <main className="flex-grow pt-16 pb-20 md:pb-6">{children}</main>
    </div>
  );
}
