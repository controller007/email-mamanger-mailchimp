"use client";

import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState } from "react";

export function EmailHistoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "all");

  const updateFilters = (newSearch?: string, newStatus?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch !== undefined) {
      newSearch ? params.set("search", newSearch) : params.delete("search");
    }
    if (newStatus !== undefined) {
      newStatus && newStatus !== "all"
        ? params.set("status", newStatus)
        : params.delete("status");
    }
    params.delete("page");
    router.push(`/email-history?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(search, status);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    router.push("/email-history");
  };

  const hasActiveFilters = search || (status && status !== "all");

  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Sent", value: "sent" },
    { label: "Failed", value: "failed" },
    { label: "Queued", value: "queued" },
    { label: "Sending", value: "sending" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search subject or list name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
        >
          Search
        </button>
      </form>

      {/* Status pills */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatus(opt.value);
              updateFilters(search, opt.value);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              status === opt.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors shadow-sm"
          title="Clear filters"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
