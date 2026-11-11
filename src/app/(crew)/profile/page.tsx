import Image from "next/image";
import Link from "next/link";
import { Page, PageHeader } from "@/components/Page";
import { cardClass, labelCaps, ListCard } from "@/components/ui";
import { getMe } from "@/lib/data";
import { fmtMoney, fmtMonthShort, fmtPhone, initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { NotificationsToggle } from "./NotificationsToggle";

export default async function ProfilePage() {
  const me = await getMe();
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const notifications = user?.user_metadata?.email_notifications !== false;
  const isAdmin = me.role === "admin" && me.status === "active";

  return (
    <Page bottom="tabs">
      <PageHeader title="Profile" large />

      <div className={`${cardClass} -mt-1 flex items-center gap-3.5 p-4`}>
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-semibold text-white">
          {initials(me.full_name)}
        </span>
        <div className="flex min-w-0 flex-col gap-[3px]">
          <p className="truncate text-[17px] font-bold">{me.full_name}</p>
          <p className="text-[13px] leading-[18px] text-muted">
            {isAdmin ? "Admin" : "Professional Hygiene Crew"}
            <br />
            Since {fmtMonthShort(me.start_date)}
          </p>
        </div>
      </div>

      <Group title="Contact">
        <Row label="Email" value={me.email} />
        <Row label="Phone" value={me.phone ? `+65 ${fmtPhone(me.phone)}` : "Add"} href="/profile/phone" />
      </Group>

      <Group title="Pay">
        <Row label="Hourly rate" value={`${fmtMoney(me.hourly_rate)} · set by admin`} />
        <Row label="Paid to" value={me.paynow_phone ? `PayNow · ••${me.paynow_phone.slice(-4)}` : "Add PayNow"} href="/profile/paynow" />
      </Group>

      <Group title="Settings">
        <div className="flex items-center gap-3 py-3.5">
          <span className="flex-1 text-sm font-medium">Email notifications</span>
          <NotificationsToggle initial={notifications} />
        </div>
        {isAdmin && <Row label="Admin view" value="Review, payouts, crew" href="/admin" />}
      </Group>

      <form action="/auth/signout" method="post" className="-mt-1">
        <button className={`${cardClass} w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-bad`}>Log out</button>
      </form>
    </Page>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="-mt-1 flex flex-col gap-2">
      <h2 className={labelCaps}>{title}</h2>
      <ListCard>{children}</ListCard>
    </section>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="truncate text-sm text-muted">{value}</span>
      {href && <Image src="/icon-row-chevron.svg" alt="" width={5.6} height={9.6} className="h-2 w-1 shrink-0" />}
    </>
  );
  return href ? (
    <Link href={href} className="flex items-center gap-3 py-3.5">
      {content}
    </Link>
  ) : (
    <div className="flex items-center gap-3 py-3.5">{content}</div>
  );
}
