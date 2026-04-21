import { useMDXComponents as getThemeComponents } from "nextra-theme-blog";
import { CodeBlock } from "@/components/blogs/CodeBlock";
import { LightboxImage } from "@/components/blogs/LightboxImage";

const themeComponents = getThemeComponents();

function Table(props: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="blog-prose-table-wrap">
      <table {...props} />
    </div>
  );
}

export function useMDXComponents(components?: Record<string, unknown>) {
  return {
    ...themeComponents,
    pre: CodeBlock,
    img: LightboxImage,
    table: Table,
    ...(components ?? {}),
  };
}
