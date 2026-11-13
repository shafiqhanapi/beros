import { AdminPage } from "@/components/admin/ui";
import { getCrewList } from "@/lib/admin-data";
import { getBookingsForMonth, getCatalogue } from "@/lib/catalogue-data";
import { sgDate } from "@/lib/format";
import { monthParam } from "@/lib/months";
import { BookingsClient } from "./BookingsClient";

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ month?: string; tab?: string }> }) {
  const sp = await searchParams;
  const { month, options, value } = monthParam(sp.month);
  const [bookings, crew, catalogue] = await Promise.all([getBookingsForMonth(month), getCrewList(), getCatalogue()]);
  return (
    <AdminPage>
      <BookingsClient
        bookings={bookings}
        crew={crew.map((c) => ({ id: c.id, name: c.full_name, status: c.status }))}
        catalogue={catalogue}
        month={month}
        monthValue={value}
        monthOptions={options}
        tab={sp.tab}
        today={sgDate()}
      />
    </AdminPage>
  );
}
