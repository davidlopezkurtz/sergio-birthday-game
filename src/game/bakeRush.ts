import { calculateBakeMultiplier } from './baking';
import type { BakingIngredient, BakingStationDefinition, BakingStationResult } from '../types';

export type BakeRushStep = 'base' | BakingIngredient | 'serve';

export interface BakeRushTicket {
  id: string;
  label: string;
  steps: BakeRushStep[];
  ingredientSteps: BakingIngredient[];
}

export interface BakeRushOrder {
  steps: BakeRushStep[];
  tickets: BakeRushTicket[];
  recipe: BakingIngredient[];
  treatCount: number;
  perTreat: number;
  mathIngredient: BakingIngredient;
  mathPrompt: string;
  answer: number;
  choices: number[];
}

export const buildBakeRushOrder = (station: BakingStationDefinition, stationNumber: number): BakeRushOrder => {
  const safeRecipe: BakingIngredient[] = station.recipe.length > 0 ? station.recipe : ['frosting'];
  const treatCount = Math.max(2, stationNumber + 2);
  const perTreat = safeRecipe.length;
  const mathIngredient = safeRecipe[(stationNumber - 1) % safeRecipe.length];
  const answer = treatCount * perTreat;
  const tickets = buildBakeRushTickets(safeRecipe, stationNumber);

  return {
    steps: ['base', ...safeRecipe, 'serve'],
    tickets,
    recipe: safeRecipe,
    treatCount,
    perTreat,
    mathIngredient,
    mathPrompt: `Each treat needs ${perTreat} topping moves. ${treatCount} treats need how many moves?`,
    answer,
    choices: buildBakeRushChoices(answer, [answer - treatCount, answer + treatCount, answer + perTreat, answer - perTreat])
  };
};

export const buildBakeRushTickets = (recipe: BakingIngredient[], stationNumber: number): BakeRushTicket[] => {
  const safeRecipe: BakingIngredient[] = recipe.length > 0 ? recipe : ['frosting'];
  const ticketCount = Math.min(3, Math.max(2, stationNumber + 1));

  return Array.from({ length: ticketCount }, (_, index) => {
    const isFinalTicket = index === ticketCount - 1;
    const ingredientCount = isFinalTicket ? safeRecipe.length : Math.min(index + 1, safeRecipe.length);
    const ingredientSteps = safeRecipe.slice(0, ingredientCount);

    return {
      id: `ticket-${index + 1}`,
      label: isFinalTicket ? 'Showstopper' : `Order ${index + 1}`,
      steps: ['base', ...ingredientSteps, 'serve'],
      ingredientSteps
    };
  });
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

  let fallbackOffset = 1;
  while (choices.length < 4) {
    const fallback = Math.max(1, answer + fallbackOffset);
    if (!choices.includes(fallback)) {
      choices.push(fallback);
    }
    fallbackOffset += 1;
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
  timeExpired: boolean,
  serveMistakes = 0
): BakingStationResult => {
  const prepMisses = Math.max(0, recipeMistakes) + Math.max(0, serveMistakes) + (timeExpired ? 1 : 0);
  const mistakes = prepMisses + (mathCorrect ? 0 : 1);

  return {
    mistakes,
    perfect: prepMisses === 0 && mathCorrect,
    multiplier: calculateBakeMultiplier(prepMisses, mathCorrect),
    mathCorrect: mathCorrect ? 1 : 0,
    mathAttempts: 1
  };
};
