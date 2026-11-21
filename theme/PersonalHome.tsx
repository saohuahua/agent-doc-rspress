import { Link } from 'rspress/theme';
import './personal-home.css';

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

const featuredArticles = [
  { title: '最小 Agent Loop', section: 'Learn Agent', href: '/learn/02-minimal-loop' },
  { title: '流式输出与事件', section: 'Learn Agent', href: '/learn/05-streaming-and-events' },
  { title: '扩展体系与能力边界', section: 'Pi 原理', href: '/pi/principle/09-extension-system' },
];

const readingPaths = [
  { title: '从零理解 Agent', description: '从普通聊天讲到 Agent Loop、工具调用和上下文。', href: '/learn/' },
  { title: '读 Pi 源码', description: '沿着一次编码任务，追踪消息、工具和会话状态。', href: '/pi/principle/' },
  { title: '看实验', description: '看看基于 Pi 的扩展尝试和实验路线。', href: '/pi/lab/' },
];

export default function PersonalHome() {
  return (
    <main className="personal-home">
      <section className="personal-home__hero" aria-labelledby="personal-home-title">
        <div className="personal-home__sky" aria-hidden="true" />
        <div className="personal-home__hero-content">
          <h1 id="personal-home-title" className="personal-home__title">
            <span className="personal-home__greeting">你好，我是</span>{' '}
            <span className="personal-home__name">saohuahua</span>
          </h1>
          <p className="personal-home__tagline">读 Agent 源码，记录技术实践。</p>
          <div className="personal-home__actions">
            <Link className="personal-home__button" href="/notes/">阅读技术笔记</Link>
            <a className="personal-home__button personal-home__button--outline" href="#projects">
              认识我 <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>

      <div className="personal-home__content">
        <div id="projects" className="personal-home__section personal-home__split">
          <section aria-labelledby="about-me-title" className="personal-home__about">
            <h2 id="about-me-title">关于我</h2>
            <p className="personal-home__identity">saohuahua</p>
            <p className="personal-home__intro">我在研究 Agent 怎么运行，最近主要在读 Pi 的源码。我把读代码和做实验时的发现整理成中文技术笔记。</p>
            <p className="personal-home__experience">两段实习经历，方向涵盖 Agent 开发与全栈开发。</p>
            <div className="personal-home__learning-links">
              <Link href="/notes/">技术笔记</Link>
              <Link href="https://github.com/saohuahua">GitHub <span aria-hidden="true">↗</span></Link>
            </div>
          </section>

          <Link className="personal-home__project" href="/pi/principle/01-architecture" aria-labelledby="agent-notes-title agent-notes-action">
            <h2 id="agent-notes-title">Agent 笔记</h2>
            <p>从一次编码任务出发，看看 Pi 怎样组织模型、工具和会话。</p>
            <ol className="personal-home__flow" aria-label="Agent 运行流程">
              <li>接收任务</li>
              <li>调用工具</li>
              <li>验证结果</li>
            </ol>
            <span id="agent-notes-action" className="personal-home__project-action">
              阅读 Pi 总体架构 <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>

        <div className="personal-home__section personal-home__split">
          <section aria-labelledby="learning-topics-title">
            <h2 id="learning-topics-title">最近在学</h2>
            <div className="personal-home__learning-topics">
              {learningTopics.map(({ title, description, noteHref, sourceHref }) => (
                <article key={noteHref} className="personal-home__learning-topic">
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className="personal-home__learning-links">
                    <Link href={noteHref} aria-label={`${title}的站内笔记`}>站内笔记</Link>
                    <Link href={sourceHref} aria-label={`${title}的参考原文`}>
                      参考原文 <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section aria-labelledby="reading-paths-title">
            <h2 id="reading-paths-title">从这里读起</h2>
            <ul className="personal-home__paths">
              {readingPaths.map(({ title, description, href }) => (
                <li key={href}>
                  <Link className="personal-home__path" href={href}>
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="personal-home__section" aria-labelledby="featured-articles-title">
          <h2 id="featured-articles-title">精选文章</h2>
          <ul className="personal-home__articles">
            {featuredArticles.map(({ title, section, href }) => (
              <li key={href}>
                <Link className="personal-home__article" href={href}>
                  <span className="personal-home__article-title">{title}</span>
                  <span className="personal-home__article-section">{section}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
