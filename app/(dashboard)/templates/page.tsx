// app/templates/page.tsx
import { getSession } from "@/app/_lib/auth/session";
import { redirect } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { TemplatesManager } from "../../_components/templates-manager";
import DashboardLayout from "../../_components/dashboard-layout";

export const metadata = {
  title: "Email Templates",
  description: "Manage your reusable email templates",
};

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      {/* Page header */}
      {/* <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutTemplate className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Email Templates
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Create and manage reusable email templates. Pick from built-in
              designs or build your own.
            </p>
          </div>
        </div> */}

      <TemplatesManager />
    </div>
  );
}
