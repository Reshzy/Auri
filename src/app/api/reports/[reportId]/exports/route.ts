import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";
import { ExportError, toSafeExportErrorBody } from "@/lib/exports/errors";
import {
  exportRequestSchema,
  hasRejectedOwnershipField,
  normalizeRequestedFormats,
} from "@/lib/validation/exports";
import { ExportOrchestrationService } from "@/server/services/export-orchestration-service";
import { ExportHistoryService } from "@/server/services/export-history-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await context.params;
    const user = await requireAuthenticatedUser();
    const items = await ExportHistoryService.listForReport(user.id, reportId, {
      limit: 50,
    });
    return Response.json(
      { reportId, items },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const body = toSafeExportErrorBody(error, { fallbackCode: "EXPORT_NOT_FOUND" });
    return Response.json(body.error, {
      status: body.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await context.params;
    const user = await requireAuthenticatedUser();
    const json = (await request.json().catch(() => {
      throw new ExportError("VALIDATION", "Request body must be JSON.", { status: 400 });
    })) as Record<string, unknown>;

    if (hasRejectedOwnershipField(json)) {
      throw new ExportError(
        "OWNERSHIP_REJECTED",
        "Client-supplied ownership identifiers are not allowed.",
        { status: 400 },
      );
    }

    const parsed = exportRequestSchema.safeParse(json);
    if (!parsed.success) {
      throw new ExportError("VALIDATION", "Invalid export request.", { status: 400 });
    }

    assertOwnerMatchesSession(user.id, undefined);

    const formats = normalizeRequestedFormats(parsed.data.formats);
    if (!formats.ok) {
      throw new ExportError(
        "UNSUPPORTED_FORMAT",
        "Unsupported or invalid export formats.",
        {
          status: 400,
        },
      );
    }

    const result = await ExportOrchestrationService.generate({
      ownerId: user.id,
      reportId,
      formats: formats.formats,
      acknowledgedWarnings: parsed.data.acknowledgedWarnings,
    });

    return Response.json(result, {
      status: result.overallStatus === "failed" ? 422 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const body = toSafeExportErrorBody(error, { fallbackCode: "DOCX_GENERATION_FAILED" });
    return Response.json(body.error, {
      status: body.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
