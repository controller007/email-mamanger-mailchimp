"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader, Mail, CheckCircle2, Copy, Check } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [addedDomainId, setAddedDomainId] = useState("");
  const [mandrillTxtKey, setMandrillTxtKey] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
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

      const result = await createDomain(cleanDomain, email.trim());

      if (!result.success) {
        setError(result.error || "Failed to add domain");
        setIsLoading(false);
        return;
      }

      setAddedDomainId(result.domain?.id || "");
      setMandrillTxtKey(result.domain?.mandrillVerifyTxtKey);
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
    setEmail("");
    setError("");
    setAddedDomainId("");
    setMandrillTxtKey(undefined);
    setCode("");
    setVerified(false);
  };

  const copyTxtValue = () => {
    if (!mandrillTxtKey) return;
    navigator.clipboard.writeText(mandrillTxtKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                ? "Verify Domain"
                : "Add New Domain"}
          </DialogTitle>
          <DialogDescription>
            {verified
              ? "This domain can now be used to add senders and send campaigns."
              : addedDomainId
                ? `Verify ${domain} for Marketing sends now, and/or set up Transactional verification below.`
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

            <div className="space-y-2">
              <Label htmlFor="email">Verification Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500">
                Mailchimp Marketing sends a verification code to this address
                — it doesn't need to be @{domain || "yourdomain.com"}.
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
              <Button type="submit" disabled={isLoading || !domain || !email}>
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
          <div className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ── Marketing verification (code) ── */}
            <form onSubmit={handleVerify} className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Marketing verification
              </p>
              <Alert className="border-blue-200 bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  A verification code was emailed to {email}.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter the code from your email"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isVerifying}
                />
                <Button type="submit" disabled={isVerifying || !code} className="shrink-0">
                  {isVerifying ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </form>

            {/* ── Transactional verification (TXT record) ── */}
            {mandrillTxtKey && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Transactional verification (optional)
                </p>
                <p className="text-xs text-gray-500">
                  Add this TXT record at your DNS provider to verify {domain}{" "}
                  for Mandrill/Transactional sends:
                </p>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1 font-mono text-xs">
                  <p>
                    <span className="text-gray-400">Name:</span>{" "}
                    mandrill_verify.{domain}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Value:</span>
                    <span className="truncate">{mandrillTxtKey}</span>
                    <button
                      type="button"
                      onClick={copyTxtValue}
                      className="p-1 rounded hover:bg-gray-200 transition-colors shrink-0"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  DNS changes can take up to 48 hours to propagate. Click
                  "Verify Domain" on the domain list once it's added to check.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Done for now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
