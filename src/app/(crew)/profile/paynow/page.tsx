import { BackButtonAlways } from "../BackButtonAlways";
import { Page, PageHeader } from "@/components/Page";
import { getMe } from "@/lib/data";
import { PayNowForm } from "./PayNowForm";

export default async function PayNowPage() {
  const me = await getMe();
  return (
    <Page bottom="actions">
      <PageHeader title="PayNow details" back={<BackButtonAlways />} />
      <PayNowForm initialName={me.paynow_name ?? me.full_name} initialPhone={me.paynow_phone ?? ""} />
    </Page>
  );
}
