import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function Mermaid({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  const code =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children
            .map((c: any) => (typeof c === 'string' ? c : c?.props?.children ?? ''))
            .join('')
        : String(children ?? '');

  useEffect(() => {
    if (!code.trim()) return;
    let cancelled = false;

    import('mermaid').then(({ default: mermaid }) => {
      const isDark = document.documentElement.classList.contains('dark');

      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: isDark
          ? {
              // Dark mode: neutral blue-gray
              primaryColor: '#2d3748',
              primaryTextColor: '#e2e8f0',
              primaryBorderColor: '#4a5568',
              secondaryColor: '#1a202c',
              tertiaryColor: '#2d3748',
              lineColor: '#718096',
              textColor: '#e2e8f0',
              mainBkg: '#2d3748',
              nodeBorder: '#4a5568',
              clusterBkg: '#1a202c',
              clusterBorder: '#4a5568',
              edgeLabelBackground: '#2d3748',
              fontSize: '14px',
            }
          : {
              // Light mode: clean blue-gray matching Rspress
              primaryColor: '#ebf1ff',
              primaryTextColor: '#1a202c',
              primaryBorderColor: '#c3d0e5',
              secondaryColor: '#f7fafc',
              tertiaryColor: '#edf2f7',
              lineColor: '#718096',
              textColor: '#2d3748',
              mainBkg: '#ebf1ff',
              nodeBorder: '#c3d0e5',
              clusterBkg: '#f7fafc',
              clusterBorder: '#d4dce8',
              edgeLabelBackground: '#ffffff',
              fontSize: '14px',
            },
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      });

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid
        .render(id, code.trim())
        .then(({ svg }) => {
          if (!cancelled) setSvg(svg);
        })
        .catch((err) => {
          if (!cancelled) setError(String(err));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <pre style={{ color: '#e53e3e', fontSize: '0.875rem', padding: '1rem' }}>
        {error}
      </pre>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '1.5rem auto',
        padding: '1.25rem',
        maxWidth: '100%',
        overflowX: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
