export interface MathGateResult {
  wrongAttempts: number;
  hintUsed: boolean;
}

export const isMathGateResult = (result: unknown): result is MathGateResult => {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const candidate = result as Partial<MathGateResult>;
  const wrongAttempts = candidate.wrongAttempts;
  const hintUsed = candidate.hintUsed;

  return (
    Number.isInteger(wrongAttempts) &&
    typeof wrongAttempts === 'number' &&
    wrongAttempts >= 0 &&
    typeof hintUsed === 'boolean'
  );
};
