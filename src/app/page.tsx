import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Sends each user to the right area for their role. */
export default async function Root() {
  redirect(homeFor(await getSession()));
}
