import Image from "next/image";

/** BEROS wordmark from Figma. `size="lg"` on auth screens, `"sm"` in app headers. */
export function Logo({ size = "sm", className = "" }: { size?: "sm" | "lg"; className?: string }) {
  const [w, h] = size === "lg" ? [141.749, 22] : [115.977, 18];
  return (
    <Image
      src="/beros-logo.svg"
      alt="BEROS"
      width={w}
      height={h}
      priority
      className={className}
      style={{ width: w, height: h }}
    />
  );
}
