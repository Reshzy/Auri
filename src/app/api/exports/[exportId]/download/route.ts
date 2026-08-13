import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { toSafeExportErrorBody } from "@/lib/exports/errors";
import { ExportDownloadService } from "@/server/services/export-download-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ exportId: string }> },
) {
  try {
    const { exportId } = await context.params;
    const user = await requireAuthenticatedUser();
    const file = await ExportDownloadService.loadOwnedFile(user.id, exportId);

    return new Response(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Content-Length": String(file.bytes.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const body = toSafeExportErrorBody(error, { fallbackCode: "EXPORT_NOT_FOUND" });
    return Response.json(body.error, {
      status: body.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
