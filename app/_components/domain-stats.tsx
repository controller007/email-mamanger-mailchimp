"use client";



import {
  Globe,
  CheckCircle2,
  Clock,
  ShieldHalf,
  MousePointerClick,
} from "lucide-react";

interface DomainShape {
  status: string;
  trackingStatus?: string | null;
}

interface DomainsStatsProps {
  domains: DomainShape[];
}

export function DomainsStats({ domains }: DomainsStatsProps) {
  const total = domains.length;

  // Fully verified = domain verified + tracking verified
  const fullyVerified = domains.filter(
    (d) => d.status === "verified" && d.trackingStatus === "verified",
  ).length;

  // Partially verified = domain verified but tracking NOT yet verified
  const partiallyVerified = domains.filter(
    (d) => d.status === "verified" && d.trackingStatus !== "verified",
  ).length;

  // Pending = domain not yet verified at all
  const pending = domains.filter((d) => d.status !== "verified").length;

  const cards = [
    {
      label: "Total Domains",
      value: total,
      icon: Globe,
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-700",
      iconBg: "bg-gray-100",
      iconText: "text-gray-500",
    },
    {
      label: "Fully Verified",
      value: fullyVerified,
      icon: CheckCircle2,
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      tooltip: "Domain verified + click & open tracking active",
    },
    {
      label: "Partially Verified",
      value: partiallyVerified,
      icon: ShieldHalf,
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
      tooltip: "Domain verified but tracking DNS record not yet added",
      // Show a subtle nudge badge when there are partially verified domains
      nudge: partiallyVerified > 0,
    },
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      tooltip: "Domain DNS not yet verified",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(
        ({
          label,
          value,
          icon: Icon,
          bg,
          border,
          text,
          iconBg,
          iconText,
          tooltip,
          nudge,
        }) => (
          <div
            key={label}
            title={tooltip}
            className={`${bg} ${border} border rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden`}
          >
            {/* Background decoration */}
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full border-8 border-white/30" />

            <div className={`p-2.5 ${iconBg} rounded-xl shrink-0`}>
              <Icon className={`h-4 w-4 ${iconText}`} />
            </div>

            <div className="min-w-0">
              <p className={`text-xl font-bold ${text}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium leading-tight">
                {label}
              </p>
            </div>

            {/* Nudge indicator for partially verified */}
            {nudge && (
              <div className="absolute top-2.5 right-2.5">
                <div className="flex items-center gap-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  <MousePointerClick className="h-2.5 w-2.5" />
                  Setup
                </div>
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}
