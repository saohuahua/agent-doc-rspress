import { withBase } from 'rspress/runtime';
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

export default function PersonalHome() {
  return (
    <main className="personal-home">
      <section className="personal-home__hero" aria-labelledby="personal-home-title">
        <div>
          <h1 id="personal-home-title" className="personal-home__title">
            <span className="personal-home__greeting">你好，我是</span>{' '}
            <span className="personal-home__name">saohuahua</span>
          </h1>
          <p className="personal-home__intro">
            我在研究 Agent 怎么运行，最近主要在读 Pi 的源码。我把读代码、做实验和学习中的发现整理成技术笔记，方便自己回顾，也分享给同样感兴趣的人。
          </p>
          <p className="personal-home__experience">
            我有两段实习经历，方向涵盖 Agent 开发与全栈开发。
          </p>
          <a className="personal-home__button" href="#projects">
            查看项目 <span aria-hidden="true">↓</span>
          </a>
        </div>
        <img
          className="personal-home__illustration"
          src={withBase('/personal-site-hero.webp')}
          width={960}
          height={960}
          alt=""
        />
      </section>

      <section id="projects" className="personal-home__section" aria-labelledby="projects-title">
        <h2 id="projects-title">代表项目</h2>
        <Link className="personal-home__project" href="/notes/" aria-labelledby="agent-notes-title agent-notes-action">
          <div>
            <h3 id="agent-notes-title">Agent 笔记</h3>
            <p>一套中文技术笔记，从最小 Agent Loop 讲到 Pi 的用法、源码和扩展机制，也收录实验记录和练习。</p>
          </div>
          <span id="agent-notes-action" className="personal-home__project-action">
            浏览技术笔记 <span aria-hidden="true">→</span>
          </span>
        </Link>
      </section>

      <section className="personal-home__section" aria-labelledby="learning-topics-title">
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
    </main>
  );
}
