import { Page } from "@/components/Page";
import { getMe, getTimesheet } from "@/lib/data";
import { monthParam } from "@/lib/months";
import { TimesheetClient } from "./TimesheetClient";

/** The crew landing page. */
export default async function TimesheetPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month, options, value } = monthParam((await searchParams).month);
  const [me, view] = await Promise.all([getMe(), getTimesheet(month)]);

  return (
    <Page bottom="tabs+row">
      <TimesheetClient view={view} rate={me.hourly_rate} monthValue={value} monthOptions={options} />
    </Page>
  );
}
