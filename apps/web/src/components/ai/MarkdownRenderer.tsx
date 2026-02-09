"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // Style code blocks
        code({ className, children, ...props }) {
          const isInline = !className;
          if (isInline) {
            return (
              <code
                className="rounded bg-muted px-1 py-0.5 text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <code
              className={`block overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono ${className || ""}`}
              {...props}
            >
              {children}
            </code>
          );
        },
        // Style pre blocks
        pre({ children }) {
          return <pre className="my-2 overflow-x-auto">{children}</pre>;
        },
        // Style paragraphs
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        // Style headers
        h1({ children }) {
          return <h1 className="mb-2 text-lg font-bold">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="mb-2 text-base font-bold">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="mb-1 text-sm font-bold">{children}</h3>;
        },
        // Style lists
        ul({ children }) {
          return <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-sm">{children}</li>;
        },
        // Style blockquotes
        blockquote({ children }) {
          return (
            <blockquote className="my-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          );
        },
        // Style strong/em
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>;
        },
        // Style tables
        table({ children }) {
          return (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-border bg-muted px-2 py-1 text-left font-semibold">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-border px-2 py-1">{children}</td>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
