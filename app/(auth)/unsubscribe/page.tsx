// app/unsubscribe/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const listId = searchParams.get("listId") || "";
  const historyId = searchParams.get("historyId") || "";

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams({ email });
      if (listId) params.set("listId", listId);
      if (historyId) params.set("historyId", historyId);

      const res = await fetch(`/api/unsubscribe?${params.toString()}`, {
        method: "POST",
      });

      if (res.ok) {
        setStatus("done");
        setMessage("You've been successfully unsubscribed.");
      } else {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center">
        {status === "done" ? (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Unsubscribed
            </h1>
            <p className="text-gray-600 mb-2">{message}</p>
            <p className="text-sm text-gray-400">
              You will no longer receive marketing emails at{" "}
              <strong>{email}</strong>.
            </p>
          </>
        ) : status === "error" ? (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Error</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button onClick={handleUnsubscribe} variant="outline">
              Try again
            </Button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Unsubscribe
            </h1>
            <p className="text-gray-600 mb-2">
              You're about to unsubscribe{" "}
              <strong className="text-gray-900">{email}</strong> from this
              mailing list.
            </p>
            <p className="text-sm text-gray-400 mb-8">
              You can re-subscribe at any time by contacting the sender.
            </p>
            <Button
              onClick={handleUnsubscribe}
              disabled={status === "loading"}
              className="w-full"
            >
              {status === "loading" ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Unsubscribe"
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
