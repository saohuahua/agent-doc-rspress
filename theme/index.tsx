import Theme from 'rspress/theme';
import { BlogLayout } from './Blog';
import 'katex/dist/katex.min.css';
import './styles.css';
import './doc-blocks.css';

export * from 'rspress/theme';
export default { ...Theme, Layout: BlogLayout };
