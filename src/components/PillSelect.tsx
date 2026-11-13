"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

/**
 * The rounded "Period dropdown" pill from Figma, with its own menu (no
 * browser-native picker) so it looks the same on every device.
 * Choosing an option updates the `param` query string value.
 * Keyboard: Enter/Space/↓ opens, ↑/↓ move, Enter selects, Esc closes.
 */
export function PillSelect({
  param,
  value,
  options,
  label,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value)?.label ?? value;

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (v: string) => {
    setOpen(false);
    if (v === value) return;
    const next = new URLSearchParams(params.toString());
    next.set(param, v);
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(options[active]!.value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`${label}: ${current}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-[#dbdbdb] bg-card pr-2.5 pl-3 transition hover:border-strong-line focus-visible:border-ink focus-visible:outline-none ${
          pending ? "opacity-60" : ""
        }`}
      >
        <span className="text-[12px] leading-none font-semibold whitespace-nowrap text-ink">{current}</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden
          className={`shrink-0 text-ink transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1.5 3 4 5.5 6.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className="absolute top-[calc(100%+6px)] right-0 z-40 max-h-72 min-w-full overflow-y-auto rounded-xl border border-line bg-card p-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] whitespace-nowrap ${
                  i === active ? "bg-subtle" : ""
                } ${selected ? "font-semibold text-ink" : "font-medium text-muted"}`}
              >
                <span className="flex-1">{o.label}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className={selected ? "text-ink" : "invisible"}>
                  <path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
