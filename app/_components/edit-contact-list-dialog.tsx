"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { AlertCircle, Save } from "lucide-react";
import type { ContactList } from "@prisma/client";

interface EditContactListDialogProps {
  children: React.ReactNode;
  contactList: ContactList & { description?: string | null };
}

export function EditContactListDialog({
  children,
  contactList,
}: EditContactListDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(contactList.name);
  const [description, setDescription] = useState(
    (contactList as any).description || "",
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setName(contactList.name);
      setDescription((contactList as any).description || "");
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("List name is required.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/contact-lists/${contactList.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update contact list");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Contact List</DialogTitle>
          <DialogDescription>
            Update the list name or description. To add, edit, or remove
            contacts, open the contact detail page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">List Name *</Label>
            <Input
              id="edit-name"
              placeholder="e.g., Newsletter Subscribers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">
              Description{" "}
              <span className="text-gray-400 font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              id="edit-description"
              placeholder="Brief description of this list..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isLoading}
              maxLength={500}
            />
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
            💡 To manage contacts (add, edit, remove), visit the{" "}
            <strong>Contact Detail</strong> page by clicking "View Contacts" on
            the list card.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
