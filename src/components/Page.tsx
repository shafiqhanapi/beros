/**
 * Page wrapper for crew screens: phone-width column on mobile, wider on desktop.
 * `bottom` reserves space for what is fixed at the bottom on mobile.
 */
export function Page({
  children,
  bottom = "none",
  wide = false,
}: {
  children: React.ReactNode;
  bottom?: "none" | "tabs" | "actions" | "tabs+actions";
  wide?: boolean;
}) {
  const pb = {
    none: "pb-8",
    tabs: "pb-[calc(var(--tabbar)+24px)]",
    actions: "pb-[calc(110px+env(safe-area-inset-bottom))]",
    "tabs+actions": "pb-[calc(var(--tabbar)+180px)]",
  }[bottom];
  return (
    <main
      className={`mx-auto flex w-full max-w-[440px] flex-col gap-6 px-6 pt-[calc(24px+env(safe-area-inset-top))] ${pb} ${
        wide ? "md:max-w-[1040px]" : "md:max-w-[720px]"
      } md:px-10 md:pt-10 md:pb-12`}
    >
      {children}
    </main>
  );
}

/**
 * Actions fixed to the bottom on mobile (above the tab bar if `aboveTabs`),
 * shown inline at the end of the page on desktop.
 */
export function FixedActions({ children, aboveTabs = false, stack = false }: { children: React.ReactNode; aboveTabs?: boolean; stack?: boolean }) {
  return (
    <div
      className={`fixed inset-x-0 z-20 bg-page px-6 pt-4 md:static md:bg-transparent md:p-0 ${
        aboveTabs ? "bottom-[var(--tabbar)] pb-4" : "bottom-0 pb-[calc(16px+env(safe-area-inset-bottom))]"
      }`}
    >
      <div className={`mx-auto flex max-w-[392px] gap-3 md:max-w-none ${stack ? "flex-col" : ""}`}>{children}</div>
    </div>
  );
}

/** Screen title row: back button (mobile), title, and optional right-side controls. */
export function PageHeader({ title, back, children, large = false }: { title: string; back?: React.ReactNode; children?: React.ReactNode; large?: boolean }) {
  return (
    <div className="flex w-full items-center gap-3">
      {back}
      <h1 className={`font-bold ${large ? "text-[22px]" : "text-xl"} md:text-[26px]`}>{title}</h1>
      <div className="flex-1" />
      {children}
    </div>
  );
}
