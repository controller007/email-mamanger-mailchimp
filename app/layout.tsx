import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import "./editor.css";
import Loader from "./_components/loader";
import { Toaster } from "./_components/ui/sonner";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Email Manager",
  description: "",
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className}`}>
        <Toaster />
        <Loader />
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
