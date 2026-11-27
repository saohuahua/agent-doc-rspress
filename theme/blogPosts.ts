import { removeBase, usePageData } from 'rspress/runtime';

export type SitePage = ReturnType<typeof usePageData>['siteData']['pages'][number];

/** Match individual blog article routes while excluding the blog index page. */
export function isBlogPost({ routePath }: Pick<SitePage, 'routePath'>): boolean {
  return /^\/blog\/(?!index(?:\.html)?$).+/.test(removeBase(routePath));
}

/** Extract ISO date string from blog post frontmatter when present. */
export function getPostDate({ frontmatter }: SitePage): string | undefined {
  return typeof frontmatter.date === 'string' ? frontmatter.date : undefined;
}

/** Extract normalized string tags from page frontmatter. */
export function getPostTags({ frontmatter }: SitePage): string[] {
  return Array.isArray(frontmatter.tags)
    ? frontmatter.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
}

/** Return blog posts sorted newest-first by date, falling back to route path. */
export function getBlogPosts(pages: SitePage[]): SitePage[] {
  return pages.filter(isBlogPost).sort((a, b) => (
    (getPostDate(b) ?? '').localeCompare(getPostDate(a) ?? '') || a.routePath.localeCompare(b.routePath)
  ));
}
