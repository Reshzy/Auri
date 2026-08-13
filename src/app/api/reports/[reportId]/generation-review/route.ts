import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { toSafeExportErrorBody } from "@/lib/exports/errors";
import { ExportReviewService } from "@/server/services/export-review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await context.params;
    const user = await requireAuthenticatedUser();
    const review = await ExportReviewService.build(user.id, reportId);
    return Response.json(review, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const body = toSafeExportErrorBody(error, { fallbackCode: "REPORT_NOT_FOUND" });
    return Response.json(body.error, {
      status: body.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
