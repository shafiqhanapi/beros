import { Page, PageHeader } from "@/components/Page";
import { getCrewCatalogue } from "@/lib/crew-catalogue";
import { ServicesClient } from "./ServicesClient";

/** Read-only service catalogue for crew: options, crew size, hours and price. */
export default async function ServicesPage() {
  const catalogue = await getCrewCatalogue();
  return (
    <Page bottom="tabs" wide>
      <PageHeader title="Services" large />
      <ServicesClient catalogue={catalogue} />
    </Page>
  );
}
