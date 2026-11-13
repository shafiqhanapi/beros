import { AdminPage } from "@/components/admin/ui";
import { getCatalogue } from "@/lib/catalogue-data";
import { CatalogueClient } from "./CatalogueClient";

export default async function AdminServices() {
  const catalogue = await getCatalogue();
  return (
    <AdminPage>
      <CatalogueClient catalogue={catalogue} />
    </AdminPage>
  );
}
