'use client';

import Link from 'next/link';
import { AuthBackgroundAnimation } from '@/components/molecules/AuthBackgroundAnimation';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { ShieldAlert, Home, ArrowLeft, Lock } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Dynamic AI & Mesh Animated Background */}
      <AuthBackgroundAnimation />

      {/* Top Header Controls */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Brand Header */}
      <div className="relative z-10 mb-6 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-none bg-amber-600 text-white shadow-md border border-amber-400/30">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-lg font-bold tracking-tight text-foreground">
            RoozyLabs <span className="text-amber-400">Prism</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Role-Based Access Control
          </span>
        </div>
      </div>

      {/* 403 Main Card */}
      <div className="relative z-10 w-full max-w-lg">
        <Card className="border-amber-500/30 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="flex justify-center mb-1">
              <Badge variant="warning" className="font-mono text-xs px-3 py-0.5 gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/30">
                <Lock className="h-3.5 w-3.5" />
                <span>HTTP 403 • ACCESS RESTRICTED</span>
              </Badge>
            </div>
            <div className="relative py-2">
              <span className="text-7xl font-extrabold font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 select-none drop-shadow-sm">
                403
              </span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Insufficient Privileges
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your active role or organization membership does not have permission to execute operations on this surface.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-none border border-amber-500/20 bg-amber-500/5 p-3 font-mono text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="uppercase font-semibold text-amber-400">Security Policy:</span>
                <span className="text-muted-foreground">TENANT_POLICY_REJECT</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                To view or edit these resources, request an elevated role (e.g. <span className="text-foreground font-semibold">Owner</span> or <span className="text-foreground font-semibold">Admin</span>) from your organization administrator.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
            <Button asChild variant="outline" className="w-full sm:w-1/2 gap-2 text-xs" onClick={() => window.history.back()}>
              <button type="button">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </Button>
            <Button asChild variant="prismViolet" className="w-full sm:w-1/2 gap-2 text-xs">
              <Link href="/">
                <Home className="h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Footer System Info */}
      <footer className="relative z-10 mt-8 text-center text-xs text-muted-foreground font-mono">
        <span>© 2026 RoozyLabs Prism. Enterprise RBAC & Security Isolation.</span>
      </footer>
    </div>
  );
}
