"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, FileText, Layers } from "lucide-react";

type SearchResult = {
  workspaces: { _id: string; title: string }[];
  pages: { _id: string; title: string }[];
};

const DEBOUNCE_MS = 300;

export function SearchBar({ workspaceId }: { workspaceId?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) return;

    const timeout = setTimeout(async () => {
      const url = workspaceId
        ? `/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`
        : `/api/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setResults({ workspaces: data.workspaces ?? [], pages: data.pages ?? [] });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query, workspaceId]);

  const hasResults = results && (results.workspaces.length > 0 || results.pages.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
        <Search size={16} className="text-neutral-400" />
        <input
          type="text"
          placeholder={workspaceId ? "Search pages…" : "Search workspaces and pages…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (!e.target.value.trim()) setResults(null);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-transparent text-sm text-neutral-900 outline-none dark:text-white"
        />
      </div>

      {isOpen && query.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {!results ? (
            <p className="px-2 py-1.5 text-sm text-neutral-500">Searching…</p>
          ) : !hasResults ? (
            <p className="px-2 py-1.5 text-sm text-neutral-500">No results.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {results.workspaces.map((workspace) => (
                <Link
                  key={workspace._id}
                  href={`/dashboard/workspaces/${workspace._id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Layers size={14} />
                  {workspace.title}
                </Link>
              ))}
              {results.pages.map((page) => (
                <Link
                  key={page._id}
                  href={`/dashboard/pages/${page._id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <FileText size={14} />
                  {page.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
