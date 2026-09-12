"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/app/_lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  Globe2,
  Send,
  History,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Crown,
  BookTemplate,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contact Lists", href: "/contact-lists", icon: Users },
  { name: "Domains", href: "/domains", icon: Globe2 },
  { name: "Send Email", href: "/send-email", icon: Send },
  { name: "Templates", href: "/templates", icon: BookTemplate },
  { name: "Email History", href: "/email-history", icon: History },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-full flex-col transition-all duration-300 ease-in-out",
          "bg-[#0f172a] border-r border-white/5",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center shrink-0 border-b border-white/5",
            collapsed ? "justify-center" : "px-5 gap-3",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/30">
            <Crown className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white leading-none">
                {process.env.NEXT_PUBLIC_APP_NAME}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                Campaign Platform
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            const link = (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  collapsed ? "justify-center px-0 w-full" : "",
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0",
                    isActive ? "text-blue-400" : "text-slate-500",
                  )}
                  size={18}
                />
                {!collapsed && <span>{item.name}</span>}
                {!collapsed && isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="font-medium bg-slate-800 text-white border-slate-700"
                  >
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-4 space-y-0.5 border-t border-white/5 pt-3">
          {/* Collapse toggle */}
          <button
            onClick={toggle}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all w-full border border-transparent",
              collapsed ? "justify-center px-0" : "",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>

          {/* Logout */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center justify-center rounded-xl px-0 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all border border-transparent"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-800 text-white border-slate-700"
              >
                Logout
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all border border-transparent"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
