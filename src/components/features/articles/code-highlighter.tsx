'use client';

import { useLayoutEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
// Register the same languages used by the Tiptap editor to ensure identical colors
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import c from 'highlight.js/lib/languages/c';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

// Register once
try {
  hljs.registerLanguage('javascript', javascript);
} catch {}
try {
  hljs.registerLanguage('typescript', typescript);
} catch {}
try {
  hljs.registerLanguage('python', python);
} catch {}
try {
  hljs.registerLanguage('java', java);
} catch {}
try {
  hljs.registerLanguage('cpp', cpp);
} catch {}
try {
  hljs.registerLanguage('c', c);
} catch {}
try {
  hljs.registerLanguage('csharp', csharp);
} catch {}
try {
  hljs.registerLanguage('php', php);
} catch {}
try {
  hljs.registerLanguage('ruby', ruby);
} catch {}
try {
  hljs.registerLanguage('go', go);
} catch {}
try {
  hljs.registerLanguage('rust', rust);
} catch {}
try {
  hljs.registerLanguage('swift', swift);
} catch {}
try {
  hljs.registerLanguage('kotlin', kotlin);
} catch {}
try {
  hljs.registerLanguage('xml', xml);
} catch {}
try {
  hljs.registerLanguage('html', xml);
} catch {}
try {
  hljs.registerLanguage('css', css);
} catch {}
try {
  hljs.registerLanguage('scss', scss);
} catch {}
try {
  hljs.registerLanguage('sql', sql);
} catch {}
try {
  hljs.registerLanguage('json', json);
} catch {}
try {
  hljs.registerLanguage('yaml', yaml);
} catch {}
try {
  hljs.registerLanguage('markdown', markdown);
} catch {}
try {
  hljs.registerLanguage('bash', bash);
} catch {}
try {
  hljs.registerLanguage('powershell', powershell);
} catch {}
try {
  hljs.registerLanguage('dockerfile', dockerfile);
} catch {}

interface CodeHighlighterProps {
  content: string;
  className?: string;
}

export function CodeHighlighter({ content, className = '' }: CodeHighlighterProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const highlightAll = () => {
      // Ensure <pre> contains <code>
      const pres = Array.from(container.querySelectorAll('pre'));
      pres.forEach((pre) => {
        const hasCode = pre.querySelector('code');
        if (!hasCode) {
          const code = document.createElement('code');
          code.textContent = pre.textContent || '';
          pre.textContent = '';
          pre.appendChild(code);
        }
      });

      const codeBlocks = container.querySelectorAll('pre code, code');
      codeBlocks.forEach((block) => {
        const element = block as HTMLElement;
        const alreadyTokenized =
          element.classList.contains('hljs') || !!element.querySelector('[class^="hljs-"]');

        if (!alreadyTokenized) {
          try {
            const hasLanguageClass = Array.from(element.classList).some(
              (cls) => cls.startsWith('language-') || cls === 'hljs'
            );
            if (hasLanguageClass) {
              hljs.highlightElement(element);
            } else {
              const text = (element.textContent || '').trim();
              if (text) {
                const { value } = hljs.highlightAuto(text);
                element.innerHTML = value;
              }
            }
            element.classList.add('hljs');
          } catch {
            element.classList.add('hljs');
          }
        }

        const pre = element.closest('pre');
        if (pre) {
          if (!pre.classList.contains('dracula-code-block')) {
            pre.classList.add('dracula-code-block');
          }
          pre.classList.add('hljs');
        }
      });
    };

    // Run synchronously after DOM updates to avoid flicker
    highlightAll();

    // Observe dynamic changes and re-apply highlighting
    const observer = new MutationObserver(() => {
      highlightAll();
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
    };
  }, [content]);

  return (
    <div
      ref={contentRef}
      className={`prose max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
