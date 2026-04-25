"use server";

import { searchBlogs, type SearchResult } from "@/lib/blogs";

/**
 * Server action that the `BlogsGrid` client component invokes when
 * the user clicks "load more". Re-runs the same search query the
 * server-rendered first page used, just at a higher page index.
 *
 * Page size is fixed (9, matching the 3×3 grid) so the action never
 * has to negotiate the layout with the caller.
 */
export async function loadMoreBlogs(input: {
  q?: string;
  tags?: string[];
  page: number;
}): Promise<SearchResult> {
  return searchBlogs({
    q: input.q,
    tags: input.tags,
    page: input.page,
    pageSize: 9,
  });
}
