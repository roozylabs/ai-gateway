'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Box,
  Server,
  Key,
  Layers,
  Workflow,
  KeyRound,
  Wrench,
  Database,
  Globe,
  Bot,
  Users,
  ScrollText,
  Activity,
  Wallet,
  Play,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { StatusDot } from '@/components/atoms/Badge';
import { TenantSelector } from '@/components/TenantSelector';
import { PermissionProvider } from '@/components/PermissionProvider';
import { ModelActivityWidget } from '@/components/molecules/ModelActivityWidget';
import { Avatar, AvatarFallback } from '@/components/atoms/Avatar';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useSystemStore } from '@/stores/useSystemStore';
import { AppRoutes } from '@/constants/routes';

interface NavItem {
  key: string;
  label: string;
  href: AppRoutes;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { key: AppRoutes.HOME, label: 'Dashboard', href: AppRoutes.HOME, icon: <LayoutDashboard className="h-4 w-4" /> },
      { key: AppRoutes.SANDBOX, label: 'AI Sandbox', href: AppRoutes.SANDBOX, icon: <Box className="h-4 w-4" /> },
    ],
  },
  {
    title: 'AI INFRASTRUCTURE',
    items: [
      { key: AppRoutes.PROVIDERS, label: 'Providers', href: AppRoutes.PROVIDERS, icon: <Server className="h-4 w-4" /> },
      { key: AppRoutes.CREDENTIALS, label: 'Credentials', href: AppRoutes.CREDENTIALS, icon: <Key className="h-4 w-4" /> },
      { key: AppRoutes.MODELS, label: 'Models', href: AppRoutes.MODELS, icon: <Layers className="h-4 w-4" /> },
      { key: AppRoutes.POLICIES, label: 'Routing Policies', href: AppRoutes.POLICIES, icon: <Workflow className="h-4 w-4" /> },
    ],
  },
  {
    title: 'GATEWAYS',
    items: [
      { key: AppRoutes.GATEWAY_KEYS, label: 'Gateway Keys', href: AppRoutes.GATEWAY_KEYS, icon: <KeyRound className="h-4 w-4" /> },
      { key: AppRoutes.TOOLS, label: 'Tool Gateway', href: AppRoutes.TOOLS, icon: <Wrench className="h-4 w-4" /> },
      { key: AppRoutes.RESOURCES, label: 'Resource Gateway', href: AppRoutes.RESOURCES, icon: <Database className="h-4 w-4" /> },
      { key: AppRoutes.MCP, label: 'MCP Gateway', href: AppRoutes.MCP, icon: <Globe className="h-4 w-4" /> },
      { key: AppRoutes.AGENTS, label: 'Agent Gateway', href: AppRoutes.AGENTS, icon: <Bot className="h-4 w-4" /> },
    ],
  },
  {
    title: 'GOVERNANCE',
    items: [
      { key: AppRoutes.GOVERNANCE, label: 'Governance & RBAC', href: AppRoutes.GOVERNANCE, icon: <Users className="h-4 w-4" /> },
      { key: AppRoutes.AUDIT_TRAIL, label: 'Audit Trail', href: AppRoutes.AUDIT_TRAIL, icon: <ScrollText className="h-4 w-4" /> },
    ],
  },
  {
    title: 'OPERATIONS & SYSTEM',
    items: [
      { key: AppRoutes.LOGS, label: 'Request Logs', href: AppRoutes.LOGS, icon: <Activity className="h-4 w-4" /> },
      { key: AppRoutes.BUDGETS, label: 'Budgets & Quotas', href: AppRoutes.BUDGETS, icon: <Wallet className="h-4 w-4" /> },
      { key: AppRoutes.PLAYGROUND, label: 'Playground', href: AppRoutes.PLAYGROUND, icon: <Play className="h-4 w-4" /> },
      { key: AppRoutes.BILLING, label: 'Billing & Plans', href: AppRoutes.BILLING, icon: <CreditCard className="h-4 w-4" /> },
      { key: AppRoutes.SETTINGS, label: 'Settings', href: AppRoutes.SETTINGS, icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebarStore();
  const { status: systemStatus } = useSystemStore();

  return (
    <PermissionProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed bottom-0 top-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-200',
            collapsed ? 'w-[72px]' : 'w-[248px]'
          )}
        >
          {/* Sidebar Header Brand */}
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <Link href={AppRoutes.HOME} className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none bg-[#8B5CF6] text-white shadow-sm">
                <Shield className="h-4 w-4" />
              </div>
              {!collapsed && (
                <span className="font-mono text-base font-bold tracking-tight text-foreground truncate">
                  PRISM <span className="text-xs font-normal text-muted-foreground">v2.1.0</span>
                </span>
              )}
            </Link>

            <button
              onClick={toggleCollapsed}
              className="flex h-6 w-6 items-center justify-center rounded-none text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Groups */}
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!collapsed && (
                  <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.title}
                  </h4>
                )}
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== AppRoutes.HOME && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-none px-3 py-2 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] font-semibold'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {/* Left Active Line Indicator */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r bg-[#8B5CF6]" />
                      )}
                      <span className={cn('shrink-0', isActive ? 'text-[#8B5CF6]' : 'text-muted-foreground group-hover:text-foreground')}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Active Model Activity Widget */}
          <div className="px-3 py-2 border-t border-border/60">
            <ModelActivityWidget collapsed={collapsed} />
          </div>

          {/* Sidebar Footer User Section */}
          {!collapsed && (
            <div className="border-t border-border p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-bold">
                    RP
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-medium text-foreground truncate">Platform Admin</span>
                  <span className="text-[10px] text-muted-foreground truncate">admin@roozylabs.dev</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div className={cn('flex flex-1 flex-col transition-all duration-200', collapsed ? 'pl-[72px]' : 'pl-[248px]')}>
          {/* Topbar Header */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
            <div className="flex items-center gap-4">
              <TenantSelector />
              <StatusDot status={systemStatus} label={`System ${systemStatus}`} />
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#8B5CF6] text-white text-xs font-bold">
                  PA
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </PermissionProvider>
  );
}
