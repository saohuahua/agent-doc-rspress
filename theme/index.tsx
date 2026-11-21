import Theme from 'rspress/theme';
import { BlogLayout } from './Blog';
import './styles.css';

export * from 'rspress/theme';
export default { ...Theme, Layout: BlogLayout };
