import { redirect } from "next/navigation";

/** Home was removed; Timesheet is the crew landing page. Keeps old links working. */
export default function HomePage() {
  redirect("/timesheet");
}
