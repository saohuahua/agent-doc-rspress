import { visit } from 'unist-util-visit';

const blockStyles = new Map([
  ['[!CONCEPTS]', 'concepts'],
  ['[!COMPACT]', 'compact'],
  ['[!STEPS]', 'steps'],
  ['[!COMPARE]', 'compare'],
  ['[!TRACE]', 'trace'],
]);

interface MarkdownNode {
  type: string;
  value?: string;
  ordered?: boolean;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, string>;
  };
}

export function remarkDocBlocks() {
  return (tree: MarkdownNode) => {
    visit(tree, 'blockquote', (quote: MarkdownNode) => {
      const [marker, list, ...extra] = quote.children ?? [];
      const token = marker?.children?.[0];
      if (marker?.type !== 'paragraph' || marker.children?.length !== 1 ||
          token?.type !== 'text' || list?.type !== 'list' || extra.length) return;

      const style = blockStyles.get(token.value ?? '');
      const items = list.children ?? [];
      if (!style || !items.length || (style === 'compare' && items.length !== 2)) return;
      if (Boolean(list.ordered) !== (style === 'steps' || style === 'trace')) return;

      const hasTitleAndBody = (item: MarkdownNode) => {
        const [title, ...body] = item.children ?? [];
        return title?.type === 'paragraph' && title.children?.length === 1 &&
          title.children[0].type === 'strong' && body.length > 0;
      };
      if (!items.every(hasTitleAndBody)) return;

      // Keep the actual list and Markdown body nodes so they retain semantics and formatting.
      quote.data = { hName: 'div', hProperties: { className: `doc-block doc-block--${style}` } };
      quote.children = [list];

      for (const item of items) {
        const [title, ...body] = item.children!;
        const description: MarkdownNode = {
          type: 'blockquote',
          data: { hName: 'div', hProperties: { className: 'doc-block__body' } },
          children: body,
        };
        title.data = { hName: 'div', hProperties: { className: 'doc-block__title' } };
        item.children = [title, description];
      }
    });
  };
}
