export type PresetListItem = {
  id: string;
  label: string;
  content: string;
  category: string | null;
  shortcut: string | null;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};
