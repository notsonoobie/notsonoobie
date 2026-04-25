import type { ReactNode } from "react";
import { Footer } from "@/components/footer/Footer";
// Re-uses the same prose styles the blog system ships — both render
// long-form markdown into a .blog-prose wrapper, so there's no value in
// duplicating the rules into a courses.css. Next dedupes the import.
import "../blogs/blogs.css";

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas text-ink min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
