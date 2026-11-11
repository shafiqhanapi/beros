"use client";

import { useState } from "react";

/** Password field with the "Show" / "Hide" toggle from Figma. */
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-field bg-card p-3.5 focus-within:border-ink">
      <input
        {...props}
        type={show ? "text" : "password"}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="shrink-0 text-[13px] font-semibold text-muted"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
