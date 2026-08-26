import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RspressPlugin } from '@rspress/core';
import { visit } from 'unist-util-visit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function pluginMermaid(): RspressPlugin {
  return {
    name: 'mermaid-plugin',
    markdown: {
      remarkPlugins: [remarkMermaid],
      globalComponents: [path.resolve(__dirname, 'theme', 'Mermaid.tsx')],
    },
  };
}

function remarkMermaid() {
  return (tree: any) => {
    visit(tree, 'code', (node: any, index: number | undefined, parent: any) => {
      if (node.lang === 'mermaid' && parent && typeof index === 'number') {
        parent.children.splice(index, 1, {
          type: 'mdxJsxFlowElement',
          name: 'Mermaid',
          attributes: [],
          children: [{ type: 'text', value: node.value }],
        });
      }
    });
  };
}
