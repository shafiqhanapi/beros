"use client";

import { useState, useTransition } from "react";
import { setEmailNotifications } from "../actions";

/** The black 40×24 switch from Figma. */
export function NotificationsToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Email notifications"
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          const res = await setEmailNotifications(next);
          if (res.error) setOn(!next);
        });
      }}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-ink" : "bg-[#d1d1d1]"}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}
