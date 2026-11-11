import { BackButton } from "@/components/ui";
import { Page, PageHeader } from "@/components/Page";
import { PillSelect } from "@/components/PillSelect";
import { getMe, getTimesheet } from "@/lib/data";
import { monthParam } from "@/lib/months";
import { TimesheetClient } from "./TimesheetClient";

export default async function TimesheetPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month, options, value } = monthParam((await searchParams).month);
  const [me, view] = await Promise.all([getMe(), getTimesheet(month)]);

  return (
    <Page bottom="actions" wide>
      <PageHeader title="Timesheet" back={<BackButton />}>
        <PillSelect param="month" value={value} options={options} label="Month" />
      </PageHeader>
      <TimesheetClient view={view} rate={me.hourly_rate} />
    </Page>
  );
}
