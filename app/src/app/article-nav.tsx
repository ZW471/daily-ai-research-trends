"use client";

import { useState, useEffect, useCallback } from "react";

export interface NavItem {
  id: string;
  label: string;
  children?: NavItem[];
}

export function ArticleNav({
  items,
  collapseLabel,
  expandLabel,
}: {
  items: NavItem[];
  collapseLabel: string;
  expandLabel: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(items.map((item) => item.id))
  );

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const allIds: string[] = [];
    for (const item of items) {
      allIds.push(item.id);
      if (item.children) {
        for (const child of item.children) {
          allIds.push(child.id);
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const id of allIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (collapsed) {
    return (
      <div className="sticky top-20">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg border border-border bg-card hover:bg-gray-50 transition-colors"
          title={expandLabel}
        >
          <svg
            viewBox="0 0 20 20"
            width="18"
            height="18"
            fill="currentColor"
            className="text-muted"
          >
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <nav className="sticky top-20 w-56 shrink-0 hidden lg:block">
      <div className="border border-border rounded-lg bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {collapseLabel}
          </span>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title={collapseLabel}
          >
            <svg
              viewBox="0 0 20 20"
              width="14"
              height="14"
              fill="currentColor"
              className="text-muted"
            >
              <path
                fillRule="evenodd"
                d="M4.72 9.47a.75.75 0 011.06 0L10 13.69l4.22-4.22a.75.75 0 111.06 1.06l-4.75 4.75a.75.75 0 01-1.06 0L4.72 10.53a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M4.72 4.47a.75.75 0 011.06 0L10 8.69l4.22-4.22a.75.75 0 011.06 1.06l-4.75 4.75a.75.75 0 01-1.06 0L4.72 5.53a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedGroups.has(item.id);
            const isActive = activeId === item.id;

            return (
              <li key={item.id}>
                <div className="flex items-center">
                  {hasChildren && (
                    <button
                      onClick={() => toggleGroup(item.id)}
                      className="p-0.5 mr-0.5 rounded hover:bg-gray-100 transition-colors shrink-0"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        width="12"
                        height="12"
                        fill="currentColor"
                        className={`text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`flex-1 text-xs py-1 px-1.5 rounded transition-colors truncate ${
                      isActive
                        ? "text-accent font-medium bg-accent/5"
                        : "text-muted hover:text-foreground hover:bg-gray-50"
                    } ${!hasChildren ? "ml-4" : ""}`}
                  >
                    {item.label}
                  </a>
                </div>
                {hasChildren && isExpanded && (
                  <ul className="ml-4 space-y-0.5 mt-0.5">
                    {item.children!.map((child) => (
                      <li key={child.id}>
                        <a
                          href={`#${child.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(child.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={`block text-xs py-0.5 px-1.5 rounded transition-colors truncate ${
                            activeId === child.id
                              ? "text-accent font-medium bg-accent/5"
                              : "text-muted/80 hover:text-foreground hover:bg-gray-50"
                          }`}
                          title={child.label}
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
