import { BackButton } from "@/components/ui";
import { Page, PageHeader } from "@/components/Page";
import { PillSelect } from "@/components/PillSelect";
import { getClaims, getMe } from "@/lib/data";
import { monthParam } from "@/lib/months";
import { ClaimsClient } from "./ClaimsClient";

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ month?: string; new?: string }> }) {
  const sp = await searchParams;
  const { month, options, value } = monthParam(sp.month);
  const [me, claims] = await Promise.all([getMe(), getClaims(month)]);

  return (
    <Page bottom="actions">
      <PageHeader title="Claims" back={<BackButton />}>
        <PillSelect param="month" value={value} options={options} label="Month" />
      </PageHeader>
      <ClaimsClient claims={claims} crewId={me.id} month={month} openNew={sp.new === "1"} />
    </Page>
  );
}
