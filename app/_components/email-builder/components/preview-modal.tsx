"use client";
import React, { useState } from "react";
import { Monitor, Smartphone, X } from "lucide-react";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  html: string;
}

export function PreviewModal({ open, onClose, html }: PreviewModalProps) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Email Preview</h2>
          <p className="text-xs text-gray-500">Accurate inbox rendering</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setMode("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "desktop" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>
            <button
              onClick={() => setMode("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "mobile" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-gray-200 p-8 flex justify-center items-start">
        <div
          className="transition-all duration-300"
          style={{
            width: mode === "mobile" ? 390 : "100%",
            maxWidth: mode === "mobile" ? 390 : 720,
          }}
        >
          {mode === "mobile" ? (
            <div className="relative bg-gray-900 rounded-[2.5rem] p-3 pb-5 shadow-2xl">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-700 rounded-full" />
              <div className="bg-white rounded-[2rem] overflow-hidden mt-4">
                <iframe
                  srcDoc={html}
                  title="Email preview mobile"
                  className="w-full border-0 block"
                  style={{ height: 620 }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  {["bg-red-400", "bg-yellow-400", "bg-green-400"].map(
                    (c, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${c}`}
                      />
                    ),
                  )}
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-0.5 text-xs text-gray-400">
                  Email Preview
                </div>
              </div>
              <iframe
                srcDoc={html}
                title="Email preview desktop"
                className="w-full border-0 block"
                style={{ height: 720 }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
