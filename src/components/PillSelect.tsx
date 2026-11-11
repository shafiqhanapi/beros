"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * The rounded "Period dropdown" pill from Figma. A native <select> sits on
 * top (invisible) so it works with the phone's own picker and keyboard.
 * Changing it updates the `param` query string value.
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
  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <label
      className={`relative inline-flex shrink-0 items-center gap-[5px] rounded-full border border-[#dbdbdb] bg-card py-1.5 pr-[9px] pl-[11px] ${
        pending ? "opacity-60" : ""
      }`}
    >
      <span className="text-[11px] leading-[14px] font-semibold text-ink">{current}</span>
      <Image src="/icon-chevron-down.svg" alt="" width={9.5} height={6.5} className="h-[6.5px] w-[9.5px]" />
      <select
        aria-label={label}
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set(param, e.target.value);
          startTransition(() => router.push(`${pathname}?${next.toString()}`));
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
