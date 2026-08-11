import { z } from "zod";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { getOwnReportWithEntries } from "@/db/dal/reports";
import { getTemplateAvailability } from "@/db/dal/templates";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";
import type {
  ProfileSnapshot,
  ScheduleSnapshot,
  SignatorySnapshot,
} from "@/db/dal/snapshots";
import { ExportError, toSafeExportErrorBody } from "@/lib/exports/errors";
import { DocxExportService } from "@/server/services/docx-export-service";
import { XlsxExportService } from "@/server/services/xlsx-export-service";
import { validateReport } from "@/server/services/report-validation";
import type { DayClassification } from "@/lib/reports/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exportRequestSchema = z.object({
  formats: z.array(z.enum(["docx", "xlsx", "zip"])).min(1),
  acknowledgedWarnings: z.array(z.string()).default([]),
  userId: z.unknown().optional(),
  user_id: z.unknown().optional(),
  ownerId: z.unknown().optional(),
  owner_id: z.unknown().optional(),
  clerkUserId: z.unknown().optional(),
  profileId: z.unknown().optional(),
});

function rejectOwnershipFields(body: z.infer<typeof exportRequestSchema>): void {
  for (const key of [
    "userId",
    "user_id",
    "ownerId",
    "owner_id",
    "clerkUserId",
    "profileId",
  ] as const) {
    const value = body[key];
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      throw new ExportError(
        "OWNERSHIP_REJECTED",
        "Client-supplied ownership identifiers are not allowed.",
        { status: 400 },
      );
    }
  }
}

function assertPhase7Formats(formats: Array<"docx" | "xlsx" | "zip">): "docx" | "xlsx" {
  if (formats.length === 0) {
    throw new ExportError("UNSUPPORTED_FORMAT", "formats must not be empty.", {
      status: 400,
    });
  }
  if (new Set(formats).size !== formats.length) {
    throw new ExportError("UNSUPPORTED_FORMAT", "Duplicate formats are not allowed.", {
      status: 400,
    });
  }
  if (formats.includes("zip")) {
    throw new ExportError(
      "UNSUPPORTED_FORMAT",
      "ZIP packaging is not available until Phase 8.",
      { status: 400 },
    );
  }
  if (formats.length > 1) {
    throw new ExportError(
      "UNSUPPORTED_FORMAT",
      "Phase 7 supports a single format per request (docx or xlsx).",
      { status: 400 },
    );
  }
  const only = formats[0]!;
  if (only !== "docx" && only !== "xlsx") {
    throw new ExportError("UNSUPPORTED_FORMAT", `Unsupported format: ${only}.`, {
      status: 400,
    });
  }
  return only;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  let requestedFormat: "docx" | "xlsx" = "docx";
  try {
    const { reportId } = await context.params;
    const user = await requireAuthenticatedUser();
    const json = await request.json().catch(() => {
      throw new ExportError("VALIDATION", "Request body must be JSON.", {
        status: 400,
      });
    });

    const parsed = exportRequestSchema.safeParse(json);
    if (!parsed.success) {
      throw new ExportError("VALIDATION", "Invalid export request.", { status: 400 });
    }

    rejectOwnershipFields(parsed.data);
    assertOwnerMatchesSession(user.id, undefined);

    requestedFormat = assertPhase7Formats(parsed.data.formats);

    const loaded = await getOwnReportWithEntries(user.id, reportId);
    if (!loaded) {
      throw new ExportError("NOT_FOUND", "Report not found.");
    }
    if (loaded.report.status === "archived") {
      throw new ExportError("FORBIDDEN", "Archived reports cannot be exported.");
    }

    const templates = await getTemplateAvailability();
    const validation = validateReport({
      report: {
        id: loaded.report.id,
        startDate: loaded.report.startDate,
        endDate: loaded.report.endDate,
        status: loaded.report.status,
        createdAt: loaded.report.createdAt,
        snapshotsRefreshedAt: loaded.report.snapshotsRefreshedAt,
        profileSnapshot: loaded.report.profileSnapshot as ProfileSnapshot,
        scheduleSnapshot: loaded.report.scheduleSnapshot as ScheduleSnapshot | null,
        signatorySnapshot: loaded.report.signatorySnapshot as SignatorySnapshot[],
      },
      entries: loaded.entries.map((entry) => ({
        id: entry.id,
        workDate: entry.workDate,
        classification: entry.classification as DayClassification,
        classificationLabel: entry.classificationLabel,
        amArrival: entry.amArrival,
        amDeparture: entry.amDeparture,
        pmArrival: entry.pmArrival,
        pmDeparture: entry.pmDeparture,
        workedMinutes: entry.workedMinutes,
        calculatedUndertimeMinutes: entry.calculatedUndertimeMinutes,
        undertimeOverrideMinutes: entry.undertimeOverrideMinutes,
        accomplishments: entry.accomplishments ?? [],
        remarks: entry.remarks,
        isComplete: entry.isComplete,
      })),
      templates: templates.items,
    });

    if (!validation.ready || validation.errors.length > 0) {
      throw new ExportError(
        "REPORT_INCOMPLETE",
        "Report has blocking validation errors and cannot be exported.",
        { status: 422 },
      );
    }

    const acknowledged = new Set(parsed.data.acknowledgedWarnings);
    const unacked = validation.warnings.filter((w) => !acknowledged.has(w.code));
    if (unacked.length > 0) {
      throw new ExportError(
        "REPORT_INCOMPLETE",
        `Acknowledge warnings before export: ${unacked.map((w) => w.code).join(", ")}.`,
        { status: 422 },
      );
    }

    const mappingInput = {
      reportId: loaded.report.id,
      startDate: loaded.report.startDate,
      endDate: loaded.report.endDate,
      profileSnapshot: loaded.report.profileSnapshot as ProfileSnapshot,
      signatorySnapshot: loaded.report.signatorySnapshot as SignatorySnapshot[],
      entries: loaded.entries.map((entry) => ({
        workDate: entry.workDate,
        classification: entry.classification as DayClassification,
        classificationLabel: entry.classificationLabel,
        amArrival: entry.amArrival,
        amDeparture: entry.amDeparture,
        pmArrival: entry.pmArrival,
        pmDeparture: entry.pmDeparture,
        workedMinutes: entry.workedMinutes,
        calculatedUndertimeMinutes: entry.calculatedUndertimeMinutes,
        undertimeOverrideMinutes: entry.undertimeOverrideMinutes,
        accomplishments: entry.accomplishments ?? [],
        remarks: entry.remarks,
      })),
    };

    const result =
      requestedFormat === "docx"
        ? await DocxExportService.generateAccomplishmentDocx(mappingInput)
        : await XlsxExportService.generateDtrXlsx(mappingInput);

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(result.fileSizeBytes),
        "Cache-Control": "private, no-store",
        "X-Auri-Source-Revision": result.sourceRevision,
        "X-Auri-File-Sha256": result.sha256,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Client-supplied owner id is not allowed."
    ) {
      const body = toSafeExportErrorBody(
        new ExportError(
          "OWNERSHIP_REJECTED",
          "Client-supplied ownership identifiers are not allowed.",
          {
            status: 400,
          },
        ),
      );
      return Response.json(body.error, { status: body.status });
    }
    const body = toSafeExportErrorBody(error, {
      fallbackCode:
        requestedFormat === "xlsx" ? "XLSX_GENERATION_FAILED" : "DOCX_GENERATION_FAILED",
    });
    return Response.json(body.error, { status: body.status });
  }
}
