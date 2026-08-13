import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { toSafeExportErrorBody } from "@/lib/exports/errors";
import { ExportDeletionService } from "@/server/services/export-deletion-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ exportId: string }> },
) {
  try {
    const { exportId } = await context.params;
    const user = await requireAuthenticatedUser();
    await ExportDeletionService.deleteOwned(user.id, exportId);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const body = toSafeExportErrorBody(error, { fallbackCode: "EXPORT_DELETE_FAILED" });
    return Response.json(body.error, {
      status: body.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
