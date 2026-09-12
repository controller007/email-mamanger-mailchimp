"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader } from "lucide-react";
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
import { createSender } from "../(dashboard)/domains/actions";

interface AddSenderDialogProps {
  domainId: string;
  domainName: string;
}

export function AddSenderDialog({
  domainId,
  domainName,
}: AddSenderDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
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
      const result = await createSender(domainId, name.trim(), username.trim());

      if (!result.success) {
        setError(result.error || "Failed to create sender");
      } else {
        setSuccess(`Sender ${result.sender?.email} created successfully!`);
        setTimeout(() => {
          setOpen(false);
          setName("");
          setUsername("");
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
        <Button size="sm" variant="default">
          <Plus className="mr-2 h-4 w-4" />
          Add Sender
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Sender Email</DialogTitle>
          <DialogDescription>
            Create a sender email for {domainName}
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
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="e.g., Jake Clever, Support Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500">
              This name will appear as the sender in emails
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Email Username</Label>
            <div className="flex items-center gap-2">
              <Input
                id="username"
                placeholder="info"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                disabled={isLoading}
                required
              />
              <span className="text-gray-600">@{domainName}</span>
            </div>
            <p className="text-xs text-gray-500">
              Common examples: info, hello, support, noreply
            </p>
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
                  Creating...
                </>
              ) : (
                "Create Sender"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
