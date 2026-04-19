import { useMDXComponents as getThemeComponents } from "nextra-theme-blog";
import { CodeBlock } from "@/components/blogs/CodeBlock";
import { LightboxImage } from "@/components/blogs/LightboxImage";

const themeComponents = getThemeComponents();

export function useMDXComponents(components?: Record<string, unknown>) {
  return {
    ...themeComponents,
    pre: CodeBlock,
    img: LightboxImage,
    ...(components ?? {}),
  };
}
