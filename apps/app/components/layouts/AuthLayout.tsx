'use client';

import React from 'react';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { Shield, Sparkles } from 'lucide-react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      {/* Background Subtle Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Top Header Controls */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6] text-white shadow-md">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-lg font-bold tracking-tight text-foreground">
            RoozyLabs <span className="text-[#8B5CF6]">Prism</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Universal AI Control Plane v2.1.0
          </span>
        </div>
      </div>

      {/* Auth Content Container */}
      <div className="z-10 w-full max-w-md">
        {children}
      </div>

      {/* Footer System Info */}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <span>© 2026 RoozyLabs Prism. Enterprise Security & Encryption Active.</span>
      </footer>
    </div>
  );
}
