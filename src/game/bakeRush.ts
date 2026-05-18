import { calculateBakeMultiplier } from './baking';
import type { BakingIngredient, BakingStationDefinition, BakingStationResult } from '../types';

export type BakeRushStep = 'base' | BakingIngredient | 'serve';

export interface BakeRushOrder {
  steps: BakeRushStep[];
  treatCount: number;
  perTreat: number;
  mathIngredient: BakingIngredient;
  mathPrompt: string;
  answer: number;
  choices: number[];
}

const INGREDIENT_COPY: Record<BakingIngredient, string> = {
  frosting: 'frosting swirls',
  sprinkles: 'sprinkle scoops',
  candle: 'candles',
  berry: 'berries'
};

export const buildBakeRushOrder = (station: BakingStationDefinition, stationNumber: number): BakeRushOrder => {
  const safeRecipe: BakingIngredient[] = station.recipe.length > 0 ? station.recipe : ['frosting'];
  const treatCount = Math.max(2, stationNumber + 2);
  const perTreat = safeRecipe.length;
  const mathIngredient = safeRecipe[(stationNumber - 1) % safeRecipe.length];
  const answer = treatCount * perTreat;

  return {
    steps: ['base', ...safeRecipe, 'serve'],
    treatCount,
    perTreat,
    mathIngredient,
    mathPrompt: `${treatCount} birthday treats need ${perTreat} ${INGREDIENT_COPY[mathIngredient]} each. How many total?`,
    answer,
    choices: buildBakeRushChoices(answer, [answer - treatCount, answer + treatCount, answer + perTreat + 1, answer - 1])
  };
};

export const buildBakeRushChoices = (answer: number, candidates: number[]): number[] => {
  const choices = [answer];

  for (const candidate of candidates) {
    const choice = Math.max(1, candidate);
    if (!choices.includes(choice)) {
      choices.push(choice);
    }
    if (choices.length === 4) {
      break;
    }
  }

  while (choices.length < 4) {
    const fallback = answer + choices.length + 1;
    if (!choices.includes(fallback)) {
      choices.push(fallback);
    }
  }

  return choices;
};

export const expectedBakeRushStep = (order: BakeRushOrder, stepIndex: number): BakeRushStep | undefined =>
  order.steps[stepIndex];

export const isCorrectBakeRushStep = (order: BakeRushOrder, stepIndex: number, step: BakeRushStep): boolean =>
  expectedBakeRushStep(order, stepIndex) === step;

export const buildBakeRushResult = (
  recipeMistakes: number,
  mathCorrect: boolean,
  timeExpired: boolean
): BakingStationResult => {
  const prepMisses = Math.max(0, recipeMistakes) + (timeExpired ? 1 : 0);
  const mistakes = prepMisses + (mathCorrect ? 0 : 1);

  return {
    mistakes,
    perfect: prepMisses === 0 && mathCorrect,
    multiplier: calculateBakeMultiplier(prepMisses, mathCorrect),
    mathCorrect: mathCorrect ? 1 : 0,
    mathAttempts: 1
  };
};
