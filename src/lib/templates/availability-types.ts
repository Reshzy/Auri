export type TemplateKey = "accomplishment" | "dtr";

export type TemplateAvailabilityItem = {
  key: TemplateKey;
  label: string;
  fileType: "docx" | "xlsx";
  dbActive: boolean;
  manifestPresent: boolean;
  sourcePresent: boolean;
  available: boolean;
  version: number | null;
  sha256: string | null;
};
