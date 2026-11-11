import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fmtMonth } from "@/lib/format";

/**
 * Downloads a payslip PDF from the private `payslips` bucket. RLS on payouts
 * and on storage means crew can only fetch their own (admins can fetch any).
 * The PDF itself is generated when the admin marks the month as Paid (Phase 3).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: payout } = await supabase.from("payouts").select("month, payslip_path, payslip_number").eq("id", id).maybeSingle();
  if (!payout?.payslip_path) {
    return new NextResponse("This payslip isn’t ready yet.", { status: 404 });
  }
  const filename = `BEROS payslip ${fmtMonth(payout.month as string)}${payout.payslip_number ? ` ${payout.payslip_number}` : ""}.pdf`;
  const { data, error } = await supabase.storage
    .from("payslips")
    .createSignedUrl(payout.payslip_path as string, 60, { download: filename });
  if (error || !data) return new NextResponse("Couldn’t open this payslip.", { status: 403 });
  return NextResponse.redirect(data.signedUrl);
}
