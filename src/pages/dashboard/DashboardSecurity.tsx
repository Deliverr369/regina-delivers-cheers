import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ExternalLink } from "lucide-react";

type Status = "pass" | "warn" | "accepted";

type Finding = {
  id: string;
  title: string;
  category: string;
  status: Status;
  description: string;
  evidence?: string;
  reference?: string;
};

const findings: Finding[] = [
  {
    id: "rls_profiles",
    title: "User profiles protected by row-level security",
    category: "Database access",
    status: "pass",
    description:
      "Each signed-in user can only view and edit their own profile row. Anonymous visitors cannot access profiles at all.",
    evidence: "profiles policies restricted to the authenticated role with auth.uid() = id.",
  },
  {
    id: "stripe_isolation",
    title: "Stripe customer IDs stored server-side only",
    category: "Payments",
    status: "pass",
    description:
      "stripe_customer_id has been moved out of the user-readable profiles table into a server-only customer_billing table that has no client access policies.",
    evidence: "customer_billing has RLS enabled with no policies for anon or authenticated roles.",
  },
  {
    id: "promo_validation",
    title: "Promo code validation handled server-side",
    category: "Server functions",
    status: "pass",
    description:
      "The promo_codes table is not readable by clients. Validation runs through the validate_promo_code RPC, which only returns the minimal validation result for the requested code.",
    evidence: "RPC executable by authenticated role only; anon and PUBLIC have been revoked.",
  },
  {
    id: "rls_helper_locked",
    title: "Internal role-check helper locked down",
    category: "Server functions",
    status: "pass",
    description:
      "The has_role helper used by access rules is no longer callable from the API. It only runs internally when policies are evaluated.",
    evidence: "EXECUTE on public.has_role revoked from PUBLIC, anon, and authenticated.",
  },
  {
    id: "realtime_topics",
    title: "Realtime channels scoped to the owning user",
    category: "Realtime",
    status: "pass",
    description:
      "Channel subscriptions and writes are restricted to topics whose names start with one of the approved prefixes followed by the caller's own user id. Admins keep full access.",
    evidence:
      "realtime.messages policies use exact / prefix-anchored matches: notifications:<uid>, orders-<uid>, order-confirmation-<uid>-%.",
  },
  {
    id: "pg_net_schema",
    title: "Database extensions outside the public schema",
    category: "Database hygiene",
    status: "pass",
    description:
      "The pg_net extension lives in a dedicated extensions schema instead of public, following Supabase security best practices.",
  },
  {
    id: "admin_via_user_roles",
    title: "Admin role stored in a separate table",
    category: "Authorization",
    status: "pass",
    description:
      "Admin access is granted via the user_roles table and checked through has_role(), not via a flag on profiles. This blocks privilege-escalation attacks where a user edits their own profile to become admin.",
  },
  {
    id: "orders_no_user_update",
    title: "Customers cannot tamper with placed orders",
    category: "Order integrity",
    status: "pass",
    description:
      "After an order is placed, signed-in shoppers can no longer edit any of its fields from the client. Status changes, payment-status updates, totals, and store assignments go exclusively through the admin dashboard and backend payment functions.",
    evidence:
      "The 'Users can update their own orders' policy has been removed from public.orders. Only admins (and service-role edge functions) can UPDATE.",
  },
  {
    id: "order_items_scoped_insert",
    title: "Order items can only be added to your own order",
    category: "Order integrity",
    status: "pass",
    description:
      "Inserting an order_item is only allowed when the parent order's user_id matches the caller, so a user cannot inject items into another shopper's order.",
  },
  {
    id: "validate_promo_definer",
    title: "validate_promo_code is intentionally callable by signed-in users",
    category: "Accepted risk",
    status: "accepted",
    description:
      "This SECURITY DEFINER function is the entire mechanism used to validate a promo code at checkout. It must be callable by signed-in shoppers; anonymous and public access have been revoked. The function returns only a minimal validation result and does not expose other promo codes.",
    reference: "Linter id 0029 — accepted as documented in the security memory.",
  },
  {
    id: "age_gate_client_only",
    title: "19+ age gate is a client-side UX control only",
    category: "Accepted risk",
    status: "accepted",
    description:
      "The age gate stored in localStorage can be bypassed in the browser. The legal control is the in-person ID check the delivery driver performs at the door, which compensates for the client-side bypass.",
  },
];

const statusMeta: Record<Status, { label: string; tone: string; icon: typeof ShieldCheck }> = {
  pass: {
    label: "Pass",
    tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: ShieldCheck,
  },
  warn: {
    label: "Action needed",
    tone: "bg-destructive/10 text-destructive border-destructive/20",
    icon: ShieldAlert,
  },
  accepted: {
    label: "Accepted risk",
    tone: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: ShieldQuestion,
  },
};

export default function DashboardSecurity() {
  const counts = useMemo(() => {
    return findings.reduce(
      (acc, f) => {
        acc[f.status] += 1;
        return acc;
      },
      { pass: 0, warn: 0, accepted: 0 } as Record<Status, number>,
    );
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security</h1>
        <p className="text-muted-foreground mt-1">
          A curated overview of the platform's current security posture. Updated as findings are
          remediated.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Passing checks</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{counts.pass}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Action needed</CardDescription>
            <CardTitle className="text-3xl text-destructive">{counts.warn}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accepted risks</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{counts.accepted}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>
            Each item reflects a concrete control verified against the live database and
            application code.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {findings.map((f, idx) => {
            const meta = statusMeta[f.status];
            const Icon = meta.icon;
            return (
              <div key={f.id} className={`flex gap-4 py-4 ${idx === 0 ? "pt-0" : ""}`}>
                <div
                  className={`h-10 w-10 shrink-0 rounded-full border flex items-center justify-center ${meta.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{f.title}</h3>
                    <Badge variant="outline" className={meta.tone}>
                      {meta.label}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {f.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
                  {f.evidence && (
                    <p className="text-xs text-muted-foreground/80 mt-2 font-mono">
                      {f.evidence}
                    </p>
                  )}
                  {f.reference && (
                    <p className="text-xs text-muted-foreground/80 mt-2 italic">{f.reference}</p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Where to look next</CardTitle>
          <CardDescription>
            For the live, automated scanner output (including any new findings), open the Security
            view from the project header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="https://docs.lovable.dev/features/security"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Lovable security documentation
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
