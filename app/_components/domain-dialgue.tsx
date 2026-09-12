"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader, Mail, CheckCircle2 } from "lucide-react";
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
import { createDomain, verifyDomain } from "../(dashboard)/domains/actions";

export function AddDomainDialog() {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [addedDomainId, setAddedDomainId] = useState("");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const cleanDomain = domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "");

      const result = await createDomain(cleanDomain);

      if (!result.success) {
        setError(result.error || "Failed to add domain");
        setIsLoading(false);
        return;
      }

      setAddedDomainId(result.domain?.id || "");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsVerifying(true);

    try {
      const result = await verifyDomain(addedDomainId, code);
      if (!result.success) {
        setError(result.error || result.message || "Verification failed");
        setIsVerifying(false);
        return;
      }
      setVerified(true);
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDomain("");
    setError("");
    setAddedDomainId("");
    setCode("");
    setVerified(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Domain
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {verified
              ? "Domain Verified"
              : addedDomainId
                ? "Enter Verification Code"
                : "Add New Domain"}
          </DialogTitle>
          <DialogDescription>
            {verified
              ? "This domain can now be used to add senders and send campaigns."
              : addedDomainId
                ? `Mailchimp emailed a verification code for ${domain} — enter it below to confirm ownership.`
                : "Enter the domain you want to use for sending emails"}
          </DialogDescription>
        </DialogHeader>

        {!addedDomainId ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500">
                Enter your domain without http:// or www
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !domain}>
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Domain"
                )}
              </Button>
            </div>
          </form>
        ) : verified ? (
          <div className="space-y-4">
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                {domain} is verified and ready to use.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert className="border-blue-200 bg-blue-50">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Check the inbox for an address on {domain} for an email from
                Mailchimp with your verification code. Didn't get it? You can
                close this and click "Verify Domain" on the domain list later
                — the code stays valid.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                placeholder="Enter the code from your email"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isVerifying}
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                I'll verify later
              </Button>
              <Button type="submit" disabled={isVerifying || !code}>
                {isVerifying ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
