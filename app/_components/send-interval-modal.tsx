// app/_components/send-interval-modal.tsx
// Simple modal to update the user's global send interval (seconds only).
// Called from the email-composer sidebar — no page navigation needed.

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { Timer, CheckCircle, AlertCircle, Zap, Clock } from "lucide-react";

interface SendIntervalModalProps {
  open: boolean;
  onClose: () => void;
  currentInterval: number;
  onSaved: (newInterval: number) => void;
}

const PRESETS = [
  { label: "No delay", value: 0, desc: "Fire as fast as Resend allows", icon: Zap },
  { label: "3 seconds", value: 3, desc: "Good for small lists", icon: Clock },
  { label: "5 seconds", value: 5, desc: "Balanced — recommended", icon: Clock },
  { label: "10 seconds", value: 10, desc: "Conservative, high deliverability", icon: Clock },
  { label: "30 seconds", value: 30, desc: "Very slow — for large lists", icon: Clock },
];

export function SendIntervalModal({
  open,
  onClose,
  currentInterval,
  onSaved,
}: SendIntervalModalProps) {
  const [value, setValue] = useState<string>(String(currentInterval));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const numValue = parseInt(value, 10);
  const isValid = !isNaN(numValue) && numValue >= 0 && numValue <= 300;

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/send-interval", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendIntervalSeconds: numValue }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      const data = await res.json();
      setSaved(true);
      onSaved(data.sendIntervalSeconds);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Estimate for current value
  const getEstimate = (secs: number) => {
    if (secs === 0) return "Instant";
    if (secs < 60) return `~${secs}s per email`;
    return `~${Math.round(secs / 60)}m per email`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-600" />
            Send Interval
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-1">
          Set the delay between each individual email send. This applies globally to all your campaigns.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Presets */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick Presets
          </Label>
          <div className="grid grid-cols-1 gap-1.5">
            {PRESETS.map((preset) => {
              const isSelected = numValue === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setValue(String(preset.value))}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-600" : "bg-gray-100"}`}>
                    <preset.icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isSelected ? "text-blue-900" : "text-gray-800"}`}>
                      {preset.label}
                    </p>
                    <p className="text-xs text-gray-400">{preset.desc}</p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-4 w-4 text-blue-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Custom (0–300 seconds)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={300}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded-xl text-center text-lg font-bold w-28"
            />
            <span className="text-sm text-gray-500">seconds</span>
            {isValid && (
              <span className="text-xs text-blue-600 font-medium ml-auto">
                {getEstimate(numValue)}
              </span>
            )}
          </div>
          {!isValid && value !== "" && (
            <p className="text-xs text-red-500">Must be between 0 and 300</p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl" disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4 mr-1.5" /> Saved!
              </>
            ) : isSaving ? (
              "Saving…"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
