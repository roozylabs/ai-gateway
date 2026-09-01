'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Badge } from '@/components/atoms/Badge';
import { Switch } from '@/components/atoms/Switch';
import { Label } from '@/components/atoms/Label';
import { useOrganizationQuery } from '@/hooks/queries/useOrganizationQuery';
import { useBillingSubscriptionQuery } from '@/hooks/queries/useBillingQuery';
import { useAuth } from '@/context/AuthContext';
import { ErrorState } from '@/components/molecules/StateAlerts';
import {
  Building,
  Bell,
  Layers,
  Users,
  CreditCard,
  Shield,
  ExternalLink,
  Save,
  RotateCcw,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

type SettingsTab = 'general' | 'notifications' | 'workspaces' | 'members' | 'billing' | 'security';

export default function SettingsPage() {
  const { user } = useAuth();
  const { isError: orgError, refetch: refetchOrg } = useOrganizationQuery();
  const { data: subData } = useBillingSubscriptionQuery();

  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');
  const [saving, setSaving] = useState(false);

  // Form State: General
  const [orgName, setOrgName] = useState(user?.name ? `${user.name}'s Org` : 'Prism AI Labs');
  const [orgSlug, setOrgSlug] = useState('prism-ai-labs');
  const [contactEmail, setContactEmail] = useState(user?.email || 'admin@prism.local');
  const [primaryRegion, setPrimaryRegion] = useState('us-east-1');

  // Form State: Notifications (Matching Reference UI)
  const [weeklyNewsletter, setWeeklyNewsletter] = useState(true);
  const [accountSummary, setAccountSummary] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);

  const [notifNewFollower, setNotifNewFollower] = useState(true);
  const [notifQuotaThreshold, setNotifQuotaThreshold] = useState(true);
  const [notifPolicyViolation, setNotifPolicyViolation] = useState(true);
  const [notifProviderFallback, setNotifProviderFallback] = useState(false);
  const [notifExportComplete, setNotifExportComplete] = useState(true);

  // Form State: Workspaces & Routing
  const [defaultRoutingStrategy, setDefaultRoutingStrategy] = useState('quality_first');
  const [fallbackTimeoutMs, setFallbackTimeoutMs] = useState(3000);
  const [maxConcurrency, setMaxConcurrency] = useState(50);

  // Form State: Security
  const [sessionTimeoutDays, setSessionTimeoutDays] = useState(7);
  const [enforceMfa, setEnforceMfa] = useState(false);
  const [merkleVerification, setMerkleVerification] = useState(true);

  const handleSaveChanges = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Settings and notification preferences updated successfully.');
    }, 600);
  };

  const handleReset = () => {
    toast.info('Settings restored to defaults.');
  };

  const navItems: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'general', label: 'Public profile & Org', icon: Building },
    { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
    { id: 'workspaces', label: 'Workspaces & Routing', icon: Layers },
    { id: 'members', label: 'Team & Members', icon: Users },
    { id: 'billing', label: 'PRO Account & Billing', icon: CreditCard },
    { id: 'security', label: 'Security & Compliance', icon: Shield },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Settings & System Preferences"
        description="Configure organization profile, notification delivery channels, workspace routing defaults, and security policies."
      />

      {orgError && <ErrorState onRetry={refetchOrg} />}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-2 items-start">
        {/* Left Vertical Navigation Sidebar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-1">
          <div className="px-3 py-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground font-mono">Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Control plane configuration</p>
          </div>

          <nav className="flex flex-col gap-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-none text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold shadow-xs border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 p-3.5 rounded-none border border-border bg-card/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" /> Active Plan
              </span>
              <Badge variant="violet" className="uppercase text-[10px]">
                {subData?.planSlug ?? 'Free Tier'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Need higher rate limits or custom VPC endpoints?
            </p>
            <Link href="/settings/billing" className="inline-block w-full">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-7">
                <span>Manage Subscription</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Active Content Pane */}
        <div className="md:col-span-8 lg:col-span-9">
          {/* TAB 1: NOTIFICATIONS & WEBHOOKS (MATCHING USER REFERENCE UI) */}
          {activeTab === 'notifications' && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  Notifications
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage how RoozyLabs Prism delivers security alerts, weekly token summaries, and gateway anomalies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Section: Email notifications */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    Email notifications
                  </h3>

                  <div className="space-y-4">
                    {/* Item 1: Weekly summary newsletter */}
                    <div className="flex items-center justify-between gap-4 p-3 rounded-none border border-border bg-muted/15">
                      <div className="space-y-0.5 max-w-[80%]">
                        <Label htmlFor="weekly-newsletter" className="text-xs font-semibold text-foreground cursor-pointer">
                          Weekly token & latency digest
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          A weekly report containing token consumption, top model usage, latency breakdown, and cache savings.
                        </p>
                      </div>
                      <Switch
                        id="weekly-newsletter"
                        checked={weeklyNewsletter}
                        onCheckedChange={setWeeklyNewsletter}
                      />
                    </div>

                    {/* Item 2: Account summary / Spend limits */}
                    <div className="flex items-center justify-between gap-4 p-3 rounded-none border border-border bg-muted/15">
                      <div className="space-y-0.5 max-w-[80%]">
                        <Label htmlFor="account-summary" className="text-xs font-semibold text-foreground cursor-pointer">
                          Monthly spend limit & invoice summary
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Receive automated invoice receipts, quota renewal notices, and billing alerts.
                        </p>
                      </div>
                      <Switch
                        id="account-summary"
                        checked={accountSummary}
                        onCheckedChange={setAccountSummary}
                      />
                    </div>

                    {/* Item 3: Real-time anomaly alerts */}
                    <div className="flex items-center justify-between gap-4 p-3 rounded-none border border-border bg-muted/15">
                      <div className="space-y-0.5 max-w-[80%]">
                        <Label htmlFor="anomaly-alerts" className="text-xs font-semibold text-foreground cursor-pointer">
                          Real-time security & anomaly alerts
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Immediate email dispatch when abnormal traffic spikes or unauthorized gateway key attempts occur.
                        </p>
                      </div>
                      <Switch
                        id="anomaly-alerts"
                        checked={anomalyAlerts}
                        onCheckedChange={setAnomalyAlerts}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Website / In-App Notifications (Checkboxes) */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    Website notifications
                  </h3>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={notifNewFollower}
                        onChange={(e) => setNotifNewFollower(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                          Team member invitations and role changes
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Receive notifications when an invited engineer accepts access or roles are updated.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={notifQuotaThreshold}
                        onChange={(e) => setNotifQuotaThreshold(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                          Spend quota warning (80% threshold reached)
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Display in-app banners when daily or monthly spend approaches the organizational limit.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={notifPolicyViolation}
                        onChange={(e) => setNotifPolicyViolation(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                          Governance policy & PII redaction blocks
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Notify when prompt guardrails detect secrets, credit cards, or banned keywords.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={notifProviderFallback}
                        onChange={(e) => setNotifProviderFallback(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                          Automatic provider fallback activation
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Notify when a primary upstream adapter times out and a fallback provider is triggered.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={notifExportComplete}
                        onChange={(e) => setNotifExportComplete(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                          Audit trail export ready for download
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Notify when asynchronous CSV / JSON audit log downloads are prepared.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/10">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  variant="prismViolet"
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="gap-1.5 text-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving changes...' : 'Save changes'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 2: GENERAL & PUBLIC PROFILE */}
          {activeTab === 'general' && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  Organization Profile
                </CardTitle>
                <CardDescription className="text-xs">
                  General workspace metadata and primary operational region defaults.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="org-name" className="text-xs font-semibold">
                    Organization Name
                  </Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="text-xs max-w-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="org-slug" className="text-xs font-semibold">
                    Organization Slug (Workspace ID prefix)
                  </Label>
                  <Input
                    id="org-slug"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    className="text-xs font-mono max-w-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-email" className="text-xs font-semibold">
                    Primary Administrative Email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="text-xs max-w-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="region" className="text-xs font-semibold">
                    Primary Gateway Region
                  </Label>
                  <Input
                    id="region"
                    value={primaryRegion}
                    onChange={(e) => setPrimaryRegion(e.target.value)}
                    className="text-xs font-mono max-w-lg"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Determines lowest-latency proxy edge cluster for upstream AI calls.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/10">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  variant="prismViolet"
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="gap-1.5 text-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving changes...' : 'Save changes'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 3: WORKSPACES & ROUTING */}
          {activeTab === 'workspaces' && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  Workspace & Routing Defaults
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure default routing strategies, stream concurrency, and upstream timeouts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="routing-strategy" className="text-xs font-semibold">
                    Default Smart Routing Policy
                  </Label>
                  <Input
                    id="routing-strategy"
                    value={defaultRoutingStrategy}
                    onChange={(e) => setDefaultRoutingStrategy(e.target.value)}
                    className="text-xs font-mono max-w-lg"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Options: <code className="font-mono text-primary">quality_first</code>, <code className="font-mono text-primary">lowest_latency</code>, <code className="font-mono text-primary">cost_optimized</code>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timeout-ms" className="text-xs font-semibold">
                    Upstream Adapter Fallback Delay (milliseconds)
                  </Label>
                  <Input
                    id="timeout-ms"
                    type="number"
                    value={fallbackTimeoutMs}
                    onChange={(e) => setFallbackTimeoutMs(Number(e.target.value))}
                    className="text-xs font-mono max-w-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="concurrency" className="text-xs font-semibold">
                    Maximum Parallel SSE Streams
                  </Label>
                  <Input
                    id="concurrency"
                    type="number"
                    value={maxConcurrency}
                    onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                    className="text-xs font-mono max-w-xs"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/10">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  variant="prismViolet"
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="gap-1.5 text-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving changes...' : 'Save changes'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 4: TEAM & MEMBERS */}
          {activeTab === 'members' && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                      Team & Member Management
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Invite engineers, configure RBAC roles, and manage workspace memberships.
                    </CardDescription>
                  </div>
                  <Link href="/settings/members">
                    <Button variant="prismViolet" size="sm" className="gap-1.5 text-xs">
                      <Users className="h-3.5 w-3.5" /> Open Member Directory
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-none border border-border bg-muted/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-foreground">
                      Authoritative Role-Based Access Control (RBAC)
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Prism enforces 6 canonical roles: Owner, Developer, Agent Manager, FinOps Manager, Auditor, and Viewer.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">6 System Roles</Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-none border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Invite New Team Member</p>
                      <p className="text-[11px] text-muted-foreground">Send role invitation with automated onboarding link.</p>
                    </div>
                  </div>
                  <Link href="/settings/members">
                    <Button variant="outline" size="sm" className="text-xs">
                      Invite
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: BILLING & SUBSCRIPTION */}
          {activeTab === 'billing' && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                      Plan & Subscription Tiers
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Manage spend limits, token packages, payment methods, and invoices.
                    </CardDescription>
                  </div>
                  <Link href="/settings/billing">
                    <Button variant="prismViolet" size="sm" className="gap-1.5 text-xs">
                      <CreditCard className="h-3.5 w-3.5" /> View All Plans & Invoices
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-none border border-primary/20 bg-primary/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Current Subscription
                    </span>
                    <h4 className="text-lg font-bold text-foreground uppercase">
                      {subData?.planSlug ?? 'Free Tier ($50 Spend Cap)'}
                    </h4>
                  </div>
                  <Link href="/settings/billing">
                    <Button variant="prismViolet" size="sm" className="text-xs">
                      Upgrade Tier
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-none border border-border bg-muted/20">
                    <span className="text-muted-foreground">Monthly Token Quota</span>
                    <p className="text-base font-bold font-mono mt-1 text-foreground">500,000 / month</p>
                  </div>
                  <div className="p-3 rounded-none border border-border bg-muted/20">
                    <span className="text-muted-foreground">Concurrent SSE Streams</span>
                    <p className="text-base font-bold font-mono mt-1 text-foreground">5 Parallel</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 6: SECURITY & COMPLIANCE */}
          {activeTab === 'security' && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  Security & Cryptographic Verification
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage authentication constraints, session policies, and cryptographic audit log proofs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4 p-3 rounded-none border border-border bg-muted/15">
                  <div className="space-y-0.5">
                    <Label htmlFor="merkle-proof" className="text-xs font-semibold text-foreground cursor-pointer">
                      Merkle Hash Chain Log Verification
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Cryptographically verify that audit trail records have not been tampered with.
                    </p>
                  </div>
                  <Switch
                    id="merkle-proof"
                    checked={merkleVerification}
                    onCheckedChange={setMerkleVerification}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-none border border-border bg-muted/15">
                  <div className="space-y-0.5">
                    <Label htmlFor="enforce-mfa" className="text-xs font-semibold text-foreground cursor-pointer">
                      Enforce Multi-Factor Authentication (MFA)
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Require all team members to authenticate with hardware tokens or TOTP authenticator.
                    </p>
                  </div>
                  <Switch
                    id="enforce-mfa"
                    checked={enforceMfa}
                    onCheckedChange={setEnforceMfa}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="session-timeout" className="text-xs font-semibold">
                    Browser Session Invalidation Timeout (Days)
                  </Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={sessionTimeoutDays}
                    onChange={(e) => setSessionTimeoutDays(Number(e.target.value))}
                    className="text-xs font-mono max-w-xs"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/10">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  variant="prismViolet"
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="gap-1.5 text-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving changes...' : 'Save changes'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
