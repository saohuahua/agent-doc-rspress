import { removeBase, usePageData } from 'rspress/runtime';
import { Link } from 'rspress/theme';
import { getBlogPosts, getPostDate, getPostTags } from './blogPosts';
import './personal-home.css';

const flagshipProjects = [
  {
    eyebrow: '01 · 工程项目',
    title: 'pi-web-vue',
    description:
      '给终端里的 Pi Coding Agent 打造 Web 工作台。Node 服务端嵌入 SDK 经 SSE 推流，前端用纯函数 reducer 组装流式消息并做三层竞态校验。',
    flow: ['Pi SDK', 'SSE 事件流', 'Vue Reducer'],
    action: '前往 GitHub 仓库',
    href: 'https://github.com/saohuahua/pi-web-vue',
    external: true,
  },
  {
    eyebrow: '02 · 知识库',
    title: 'Agent 与 Pi 源码笔记',
    description:
      '从最小 Agent Loop 讲起，沿着一次编码任务拆解 Pi 的消息管线、工具系统、上下文压缩与扩展边界，并收录面经与实践记录。',
    flow: ['输入管线', 'Agent Loop', '工具执行'],
    action: '浏览技术笔记总览',
    href: '/notes/',
    external: false,
  },
];

const learningTopics = [
  {
    title: 'Agent Harness 与任务续跑',
    description: '把任务进度和验证结果留在会话之外。Agent 中断后，可以先检查已有成果，再接着做。',
    noteHref: '/pi/principle/03-agent-loop/termination',
    sourceHref: 'https://www.anthropic.com/research/effective-harnesses-for-long-running-agents',
  },
  {
    title: '上下文工程',
    description: '按当前任务加载项目规则和工具结果。压缩历史时，保留关键决定、待解决的问题和必要证据。',
    noteHref: '/learn/11-context-engineering',
    sourceHref: 'https://www.anthropic.com/research/effective-context-engineering-for-ai-agents',
  },
  {
    title: 'Agent 评测与执行轨迹',
    description: '先用真实结果判断任务是否完成，再回看工具调用定位失败，把典型失败做成回归用例。',
    noteHref: '/interview/agent/07-agent-evaluation',
    sourceHref: 'https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop',
  },
];

const readingPaths = [
  {
    index: '01',
    title: '从零理解 Agent',
    description: '从普通聊天讲到 Agent Loop、工具调用和上下文。',
    href: '/learn/',
  },
  {
    index: '02',
    title: '读 Pi 源码',
    description: '沿着一次编码任务，追踪消息、工具和会话状态。',
    href: '/pi/principle/',
  },
  {
    index: '03',
    title: '实验与扩展',
    description: '看看基于 Pi 的扩展尝试、实验室记录和边界验证。',
    href: '/pi/lab/',
  },
  {
    index: '04',
    title: '前端与 Agent 面经',
    description: '按主题梳理 Agent 架构、项目取舍与前端高频问题。',
    href: '/interview/',
  },
];

export default function PersonalHome() {
  const { siteData } = usePageData();
  const latestPosts = getBlogPosts(siteData.pages).slice(0, 4);

  return (
    <main className="personal-home">
      <section className="personal-home__hero" aria-labelledby="personal-home-title">
        <div className="personal-home__sky" aria-hidden="true" />
        <div className="personal-home__hero-content">
          <h1 id="personal-home-title" className="personal-home__title">
            <span className="personal-home__greeting">你好，我是</span>{' '}
            <span className="personal-home__name">saohuahua</span>
          </h1>
          <p className="personal-home__tagline">
            研究 Agent 运行机制与全栈工程实践，有过两段 Agent 与全栈开发实习。
            <br />
            这里记录读 Pi 源码的拆解笔记，以及真实开发里的取舍和复盘。
          </p>
          <div className="personal-home__actions">
            <Link className="personal-home__button" href="/blog/">
              <span>阅读 Blog</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="personal-home__button personal-home__button--outline" href="/notes/">
              <span>浏览技术笔记</span>
            </Link>
          </div>
          <nav className="personal-home__quick-links" aria-label="快捷入口">
            <a href="#projects">代表项目</a>
            <span aria-hidden="true">·</span>
            <Link href="/about/">关于我</Link>
            <span aria-hidden="true">·</span>
            <a href="https://github.com/saohuahua" target="_blank" rel="noopener noreferrer">
              GitHub <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </div>
      </section>

      <div className="personal-home__content">
        <section id="projects" className="personal-home__section" aria-labelledby="projects-title">
          <div className="personal-home__section-head">
            <h2 id="projects-title">代表工作</h2>
            <Link className="personal-home__more" href="/projects/">
              全部项目 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="personal-home__projects">
            {flagshipProjects.map(({ eyebrow, title, description, flow, action, href, external }) => {
              const content = (
                <>
                  <span className="personal-home__eyebrow">{eyebrow}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <ol className="personal-home__flow" aria-label={`${title}核心流程`}>
                    {flow.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <span className="personal-home__project-action">
                    <span>{action}</span>
                    <span
                      className={external ? 'personal-home__arrow personal-home__arrow--external' : 'personal-home__arrow'}
                      aria-hidden="true"
                    >
                      {external ? '↗' : '→'}
                    </span>
                  </span>
                </>
              );

              return external ? (
                <a
                  key={href}
                  className="personal-home__project"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content}
                </a>
              ) : (
                <Link key={href} className="personal-home__project" href={href}>
                  {content}
                </Link>
              );
            })}
          </div>
        </section>

        {latestPosts.length > 0 && (
          <section className="personal-home__section" aria-labelledby="latest-blog-title">
            <div className="personal-home__section-head">
              <h2 id="latest-blog-title">最新 Blog</h2>
              <Link className="personal-home__more" href="/blog/">
                全部文章 <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ul className="personal-home__posts">
              {latestPosts.map((post) => {
                const date = getPostDate(post);
                const minutes = post.frontmatter.readingMinutes;
                const tags = getPostTags(post).slice(0, 2);
                const isFeatured = post.frontmatter.featured === true;

                return (
                  <li key={post.routePath}>
                    <Link className="personal-home__post" href={removeBase(post.routePath)}>
                      <div className="personal-home__post-main">
                        <div className="personal-home__post-meta">
                          {date && <time dateTime={date}>{date.replaceAll('-', '.')}</time>}
                          {typeof minutes === 'number' && <span>约 {minutes} 分钟</span>}
                          {isFeatured && <span className="personal-home__badge">推荐</span>}
                          {tags.length > 0 && (
                            <span className="personal-home__post-tags">{tags.join(' · ')}</span>
                          )}
                        </div>
                        <h3>{post.title}</h3>
                        {post.frontmatter.description && <p>{post.frontmatter.description}</p>}
                      </div>
                      <span className="personal-home__arrow personal-home__post-arrow" aria-hidden="true">↗</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="personal-home__section personal-home__split">
          <section aria-labelledby="learning-topics-title">
            <div className="personal-home__section-head">
              <h2 id="learning-topics-title">最近在学</h2>
            </div>
            <div className="personal-home__learning-topics">
              {learningTopics.map(({ title, description, noteHref, sourceHref }) => (
                <article key={noteHref} className="personal-home__learning-topic">
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className="personal-home__learning-links">
                    <Link href={noteHref} aria-label={`${title}的站内笔记`}>站内笔记</Link>
                    <a
                      href={sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${title}的参考原文`}
                    >
                      参考原文 <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="reading-paths-title">
            <div className="personal-home__section-head">
              <h2 id="reading-paths-title">从这里读起</h2>
            </div>
            <ul className="personal-home__paths">
              {readingPaths.map(({ index, title, description, href }) => (
                <li key={href}>
                  <Link className="personal-home__path" href={href}>
                    <span className="personal-home__path-index" aria-hidden="true">{index}</span>
                    <div className="personal-home__path-body">
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <span className="personal-home__arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="personal-home__footer">
          <p className="personal-home__footer-note">
            saohuahua · 读 Agent 源码，记录技术实践与工程取舍
          </p>
          <nav className="personal-home__footer-links" aria-label="页脚导航">
            <Link href="/blog/">Blog</Link>
            <Link href="/notes/">技术笔记</Link>
            <Link href="/projects/">Pi Agent</Link>
            <Link href="/about/">关于</Link>
            <a href="https://github.com/saohuahua" target="_blank" rel="noopener noreferrer">
              GitHub <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
