"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Loader } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { updateSender } from "../(dashboard)/domains/actions";

interface EditSenderDialogProps {
  sender: {
    id: string;
    name: string;
    email: string;
  };
  domainName: string;
}

export function EditSenderDialog({
  sender,
  domainName,
}: EditSenderDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sender.name);
  const [username, setUsername] = useState(sender.email.split("@")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const result = await updateSender(sender.id, name, username, domainName);

      if (!result.success) {
        setError(result.error || "Failed to update sender");
      } else {
        setSuccess("Sender updated successfully!");
        setTimeout(() => {
          setOpen(false);
          setSuccess("");
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Sender</DialogTitle>
          <DialogDescription>
            Update sender information for {domainName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Display Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g., Jake Clever, Support Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-username">Email Username</Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-username"
                placeholder="info"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                disabled={isLoading}
                required
              />
              <span className="text-gray-600">@{domainName}</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Preview:</strong> {name || "Display Name"} &lt;
              {username || "username"}@{domainName}&gt;
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !username}>
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Sender"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
