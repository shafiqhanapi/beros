import { BackButtonAlways } from "../BackButtonAlways";
import { Page, PageHeader } from "@/components/Page";
import { getMe } from "@/lib/data";
import { PhoneForm } from "./PhoneForm";

export default async function PhonePage() {
  const me = await getMe();
  return (
    <Page bottom="actions">
      <PageHeader title="Phone number" back={<BackButtonAlways />} />
      <PhoneForm initial={me.phone ?? ""} />
    </Page>
  );
}
