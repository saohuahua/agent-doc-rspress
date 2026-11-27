import type { ComponentProps } from 'react';
import { isEqualPath, removeBase, usePageData } from 'rspress/runtime';
import Theme, { Link } from 'rspress/theme';
import { getBlogPosts, getPostDate, getPostTags, isBlogPost, type SitePage } from './blogPosts';
import './blog.css';

function PostMeta({ post, showReadingTime = false }: { post: SitePage; showReadingTime?: boolean }) {
  const date = getPostDate(post);
  const minutes = post.frontmatter.readingMinutes;
  const tags = getPostTags(post);

  return (
    <div className="blog-post-meta">
      {date && <time dateTime={date}>{date.replaceAll('-', '.')}</time>}
      {showReadingTime && typeof minutes === 'number' && <span>约 {minutes} 分钟阅读</span>}
      {tags.length > 0 && <span>{tags.join(' · ')}</span>}
    </div>
  );
}

function PostLink({ post, featured = false }: { post: SitePage; featured?: boolean }) {
  return (
    <Link className={featured ? 'blog-post-link blog-post-link--featured' : 'blog-post-link'} href={removeBase(post.routePath)}>
      <div>
        <PostMeta post={post} />
        <h3>{post.title}</h3>
        {post.frontmatter.description && <p>{post.frontmatter.description}</p>}
      </div>
      <span className="blog-post-link__arrow" aria-hidden="true">↗</span>
    </Link>
  );
}

export function BlogIndex() {
  const { siteData } = usePageData();
  const posts = getBlogPosts(siteData.pages);
  const featured = posts.find((post) => post.frontmatter.featured === true) ?? posts[0];
  const remaining = posts.filter((post) => post !== featured);

  return (
    <main className="blog-index">
      <header className="blog-index__header">
        <h1>Blog</h1>
        <p>记录 Agent 开发、全栈项目里的尝试、取舍和复盘。</p>
      </header>

      {featured && (
        <section className="blog-index__section" aria-labelledby="blog-featured-title">
          <h2 id="blog-featured-title">推荐阅读</h2>
          <PostLink post={featured} featured />
        </section>
      )}

      {remaining.length > 0 && (
        <section className="blog-index__section" aria-labelledby="blog-archive-title">
          <h2 id="blog-archive-title">文章</h2>
          <ul className="blog-index__archive">
            {remaining.map((post) => <li key={post.routePath}><PostLink post={post} /></li>)}
          </ul>
        </section>
      )}
    </main>
  );
}

function BlogHeading(props: ComponentProps<'h1'>) {
  const { page, siteData } = usePageData();
  const post = siteData.pages.find((entry) => isEqualPath(entry.routePath, page.routePath)) ?? page;

  return (
    <header className="blog-post-heading">
      <PostMeta post={post} showReadingTime />
      <h1 {...props} />
      {page.frontmatter.description && <p>{page.frontmatter.description}</p>}
    </header>
  );
}

const blogComponents = { h1: BlogHeading };

function PostPagination({ posts, currentPath }: { posts: SitePage[]; currentPath: string }) {
  const index = posts.findIndex((post) => isEqualPath(post.routePath, currentPath));
  if (index < 0) return null;

  const previous = posts[index + 1];
  const next = posts[index - 1];
  if (!previous && !next) return null;

  return (
    <nav className="blog-article__pagination" aria-label="相邻文章">
      {previous && (
        <Link className="blog-article__neighbor" rel="prev" href={removeBase(previous.routePath)}>
          <span>← 上一篇</span>
          <strong>{previous.title}</strong>
        </Link>
      )}
      {next && (
        <Link className="blog-article__neighbor blog-article__neighbor--next" rel="next" href={removeBase(next.routePath)}>
          <span>下一篇 →</span>
          <strong>{next.title}</strong>
        </Link>
      )}
    </nav>
  );
}

export function BlogLayout() {
  const { page, siteData } = usePageData();
  if (!isBlogPost(page)) return <Theme.Layout />;

  return (
    <div className="blog-article" id="blog-article-top" key={page.routePath}>
      <Theme.Layout
        uiSwitch={{ showSidebar: false, showAside: true, showDocFooter: false }}
        beforeDocContent={<Link className="blog-article__back" href="/blog/">← 返回 Blog</Link>}
        afterDocFooter={<PostPagination posts={getBlogPosts(siteData.pages)} currentPath={page.routePath} />}
        components={blogComponents}
      />
      <a className="blog-article__to-top" href="#blog-article-top" aria-label="回到顶部">
        <span className="blog-article__top-icon" aria-hidden="true" />
        <span className="blog-article__top-label" aria-hidden="true">回到顶部</span>
      </a>
    </div>
  );
}
