export type WarningAckState = {
  warningCodes: string[];
  acknowledged: string[];
  dataRevision: string;
  acknowledgedForRevision: string | null;
};

export function unacknowledgedWarningCodes(state: WarningAckState): string[] {
  if (state.acknowledgedForRevision !== state.dataRevision) {
    return [...state.warningCodes];
  }
  const acked = new Set(state.acknowledged);
  return state.warningCodes.filter((code) => !acked.has(code));
}

export function acknowledgementsAreComplete(state: WarningAckState): boolean {
  return unacknowledgedWarningCodes(state).length === 0;
}

export function clearAcknowledgementsOnDataChange(
  state: WarningAckState,
  nextDataRevision: string,
): WarningAckState {
  if (state.dataRevision === nextDataRevision) return state;
  return {
    warningCodes: state.warningCodes,
    acknowledged: [],
    dataRevision: nextDataRevision,
    acknowledgedForRevision: null,
  };
}

export function toggleAcknowledgement(
  state: WarningAckState,
  code: string,
  checked: boolean,
): WarningAckState {
  const next = new Set(state.acknowledged);
  if (checked) next.add(code);
  else next.delete(code);
  return {
    ...state,
    acknowledged: [...next],
    acknowledgedForRevision: state.dataRevision,
  };
}

export function zipSelectionRequiresMembers(selected: {
  docx: boolean;
  xlsx: boolean;
  zip: boolean;
}): { docx: boolean; xlsx: boolean; zip: boolean } {
  if (!selected.zip) return selected;
  return { ...selected, docx: true, xlsx: true };
}
