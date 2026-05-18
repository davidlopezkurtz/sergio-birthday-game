export const BAKEOFF_READY_EVENT = 'bakeoff:ready';
export const BAKEOFF_STARTUP_TIMEOUT_MS = 6000;

export interface BakeOffReadyPayload {
  transitionId: string;
}
