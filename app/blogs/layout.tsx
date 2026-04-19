import type { ReactNode } from "react";
import { Footer } from "@/components/footer/Footer";
import "./blogs.css";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas text-ink min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
