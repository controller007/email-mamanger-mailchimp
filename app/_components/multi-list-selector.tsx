// app/_components/multi-list-selector.tsx
// Multi contact list selector with:
//   - Full text search
//   - Selected items always pinned to the top
//   - Persists selection order (first selected = first shown)

"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Input } from "@/app/_components/ui/input";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Users,
  Globe,
  Search,
  X,
  ChevronRight,
  CheckCircle,
  Send,
} from "lucide-react";

interface ContactList {
  id: string;
  name: string;
  description?: string | null;
  emails: string[];
  domainId: string;
  domain: { id: string; domain: string; status: string };
  _count?: { contacts: number; emailHistory: number };
}

interface MultiListSelectorProps {
  contactLists: ContactList[];
  selectedListIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

function getCount(list: ContactList) {
  return list._count?.contacts ?? list.emails.length;
}

function getCampaignCount(list: ContactList) {
  return list._count?.emailHistory ?? 0;
}

export function MultiListSelector({
  contactLists,
  selectedListIds,
  onChange,
  disabled = false,
}: MultiListSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (id: string) => {
    if (selectedListIds.includes(id)) {
      onChange(selectedListIds.filter((x) => x !== id));
    } else {
      if (selectedListIds.length >= 10) return;
      // A list with zero contacts can't actually be sent to — the backend
      // rejects it too (see /api/send-email's notReadyLists check), but
      // blocking it here means a doomed send never even reaches submit.
      const list = contactLists.find((l) => l.id === id);
      if (list && getCount(list) === 0) return;
      onChange([...selectedListIds, id]);
    }
  };

  // Selected lists in selection order
  const selectedLists = selectedListIds
    .map((id) => contactLists.find((l) => l.id === id))
    .filter(Boolean) as ContactList[];

  // Unselected lists, filtered by search, sorted by campaign count
  // ascending (lists with fewer campaigns sent surface first — these
  // are good candidates for a new campaign).
  const unselectedFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return contactLists
      .filter((l) => {
        if (selectedListIds.includes(l.id)) return false;
        if (!q) return true;
        return (
          l.name.toLowerCase().includes(q) ||
          l.domain.domain.toLowerCase().includes(q) ||
          (l.description?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => getCampaignCount(a) - getCampaignCount(b));
  }, [contactLists, selectedListIds, search]);

  // Selected lists also filtered by search (so search works across all)
  const selectedFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return selectedLists;
    return selectedLists.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.domain.domain.toLowerCase().includes(q) ||
        (l.description?.toLowerCase().includes(q) ?? false),
    );
  }, [selectedLists, search]);

  const totalRecipients = selectedLists.reduce(
    (sum, l) => sum + getCount(l),
    0,
  );

  const noResults =
    search && selectedFiltered.length === 0 && unselectedFiltered.length === 0;

  return (
    <>
      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl text-sm hover:border-blue-400 hover:bg-blue-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 text-gray-400 shrink-0" />
          {selectedListIds.length === 0 ? (
            <span className="text-gray-400">Select contact lists…</span>
          ) : (
            <span className="text-gray-700 font-medium truncate">
              {selectedListIds.length === 1
                ? selectedLists[0]?.name
                : `${selectedListIds.length} lists selected`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {selectedListIds.length > 0 && (
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
              {totalRecipients.toLocaleString()} contacts
            </Badge>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        </div>
      </button>

      {/* Selected pills (when multiple) */}
      {selectedLists.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedLists.map((list) => (
            <div
              key={list.id}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium"
            >
              <span className="truncate max-w-[140px]">{list.name}</span>
              <span className="text-blue-400 text-[10px]">
                {getCount(list).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => toggle(list.id)}
                disabled={disabled}
                className="ml-0.5 hover:text-blue-900 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Picker dialog ───────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl min-w-[600px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-lg">Select Contact Lists</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Up to 10 lists. Campaign sends to all simultaneously.
            </p>
          </DialogHeader>

          {/* Search */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                autoFocus
                placeholder="Search by name or domain…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl text-sm h-11"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[28rem] px-4 py-3 space-y-1.5">
            {noResults ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No lists match "{search}"
              </div>
            ) : (
              <>
                {/* ── Selected items pinned to top ── */}
                {selectedFiltered.length > 0 && (
                  <>
                    {!search && (
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 pt-1 pb-0.5">
                        Selected ({selectedFiltered.length})
                      </p>
                    )}
                    {selectedFiltered.map((list) => (
                      <ListRow
                        key={list.id}
                        list={list}
                        isSelected
                        onToggle={() => toggle(list.id)}
                      />
                    ))}
                    {unselectedFiltered.length > 0 && (
                      <div className="border-t border-gray-100 my-1.5" />
                    )}
                  </>
                )}

                {/* ── Unselected items ── */}
                {unselectedFiltered.length > 0 && (
                  <>
                    {!search && selectedFiltered.length > 0 && (
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 pt-1 pb-0.5">
                        All Lists
                      </p>
                    )}
                    {unselectedFiltered.map((list) => {
                      const isEmpty = getCount(list) === 0;
                      const atMax =
                        selectedListIds.length >= 10 &&
                        !selectedListIds.includes(list.id);
                      return (
                        <ListRow
                          key={list.id}
                          list={list}
                          isSelected={false}
                          onToggle={() => toggle(list.id)}
                          disabled={atMax || isEmpty}
                          disabledReason={isEmpty ? "No contacts" : undefined}
                        />
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/60">
            <p className="text-sm text-gray-500">
              {selectedListIds.length > 0 ? (
                <>
                  <span className="font-semibold text-blue-700">
                    {selectedListIds.length}
                  </span>{" "}
                  list{selectedListIds.length !== 1 ? "s" : ""} ·{" "}
                  <span className="font-semibold text-blue-700">
                    {totalRecipients.toLocaleString()}
                  </span>{" "}
                  contacts
                </>
              ) : (
                "No lists selected"
              )}
            </p>
            <Button
              onClick={() => setOpen(false)}
              disabled={selectedListIds.length === 0}
              className="rounded-lg"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Individual row ────────────────────────────────────────────────────────────

function ListRow({
  list,
  isSelected,
  onToggle,
  disabled = false,
  disabledReason,
}: {
  list: ContactList;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const count = getCount(list);
  const campaignCount = getCampaignCount(list);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={disabledReason}
      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left transition-all ${
        isSelected
          ? "bg-blue-50 border border-blue-200"
          : disabled
            ? "opacity-40 cursor-not-allowed border border-transparent"
            : "border border-transparent hover:bg-gray-50 hover:border-gray-200"
      }`}
    >
      {/* Checkbox */}
      <div
        className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
        }`}
      >
        {isSelected && (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Avatar */}
      <div
        className={`h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 ${
          isSelected
            ? "bg-blue-600"
            : "bg-gradient-to-br from-indigo-400 to-indigo-600"
        }`}
      >
        {list.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${isSelected ? "text-blue-900" : "text-gray-800"}`}
        >
          {list.name}
        </p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Globe className="h-2.5 w-2.5" />
          {list.domain.domain}
          <span className="text-gray-300 mx-1">·</span>
          {count === 0 ? (
            <span className="text-red-400 font-medium">No contacts</span>
          ) : (
            `${count.toLocaleString()} contacts`
          )}
        </p>
      </div>

      {/* Campaign count badge */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shrink-0">
        <Send className="h-3 w-3" />
        {campaignCount.toLocaleString()}
      </div>

      {isSelected && <CheckCircle className="h-4 w-4 text-blue-600 shrink-0" />}
    </button>
  );
}
