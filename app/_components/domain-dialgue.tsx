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
import { createDomain } from "../(dashboard)/domains/actions";
import { DnsRecordsDisplay } from "./dns-record-display";

export function AddDomainDialog() {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [domainId, setDomainId] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Clean domain input
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

      // Show DNS records
      setDnsRecords(result.domain?.records || []);
      setDomainId(result.domain?.id || "");

      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDomain("");
    setError("");
    setDnsRecords([]);
    setDomainId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Domain
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {dnsRecords.length > 0 ? "Configure DNS Records" : "Add New Domain"}
          </DialogTitle>
          <DialogDescription>
            {dnsRecords.length > 0
              ? "Add these DNS records to your domain provider"
              : "Enter the domain you want to use for sending emails"}
          </DialogDescription>
        </DialogHeader>

        {dnsRecords.length === 0 ? (
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
        ) : (
          <DnsRecordsDisplay
            records={dnsRecords}
            domain={domain}
            domainId={domainId}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
