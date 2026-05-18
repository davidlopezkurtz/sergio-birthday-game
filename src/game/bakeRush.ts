import { calculateBakeMultiplier } from './baking';
import type { BakingIngredient, BakingStationDefinition, BakingStationResult } from '../types';

export type BakeRushStep = 'base' | BakingIngredient | 'serve';
type RandomSource = () => number;
type BakeRushMathKind = 'totalMoves' | 'perTreat' | 'treatCount';

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
  mathSummary: string;
  answerUnit: string;
  answer: number;
  choices: number[];
}

export interface BakeRushOrderOptions {
  seed?: string | number;
  rng?: RandomSource;
}

const ALL_INGREDIENTS: BakingIngredient[] = ['frosting', 'sprinkles', 'berry', 'candle'];

const hashSeed = (seed: string | number): number => {
  const text = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const createBakeRushSeededRandom = (seed: string | number): RandomSource => {
  let state = hashSeed(seed) || 1;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const randInt = (min: number, max: number, rng: RandomSource): number =>
  Math.floor(rng() * (max - min + 1)) + min;

const pickOne = <T>(items: T[], rng: RandomSource): T => items[Math.floor(rng() * items.length)];

const shuffled = <T>(items: T[], rng: RandomSource): T[] => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const uniqueIngredients = (ingredients: BakingIngredient[]): BakingIngredient[] =>
  ingredients.filter((ingredient, index) => ingredients.indexOf(ingredient) === index);

const difficultyForStation = (stationNumber: number): 1 | 2 | 3 =>
  Math.min(3, Math.max(1, stationNumber)) as 1 | 2 | 3;

const buildRecipeVariant = (
  station: BakingStationDefinition,
  stationNumber: number,
  rng: RandomSource
): BakingIngredient[] => {
  const difficulty = difficultyForStation(stationNumber);
  const preferred = uniqueIngredients(station.recipe);
  const pool = uniqueIngredients([...preferred, ...ALL_INGREDIENTS]);
  const recipeLength = difficulty === 1 ? 3 : difficulty === 2 ? randInt(3, 4, rng) : 4;

  return shuffled(pool, rng).slice(0, recipeLength);
};

const buildTreatCount = (stationNumber: number, rng: RandomSource): number => {
  const difficulty = difficultyForStation(stationNumber);

  if (difficulty === 1) {
    return randInt(3, 4, rng);
  }

  return randInt(4, 5, rng);
};

const buildMathKind = (stationNumber: number, rng: RandomSource): BakeRushMathKind => {
  const difficulty = difficultyForStation(stationNumber);
  const kinds: BakeRushMathKind[] = difficulty === 1 ? ['totalMoves', 'perTreat'] : ['totalMoves', 'perTreat', 'treatCount'];

  return pickOne(kinds, rng);
};

const formatIngredient = (ingredient: BakingIngredient): string => {
  switch (ingredient) {
    case 'frosting':
      return 'frosting';
    case 'sprinkles':
      return 'sprinkle topping';
    case 'berry':
      return 'berry topping';
    case 'candle':
      return 'candle topping';
  }
};

export const buildBakeRushOrder = (
  station: BakingStationDefinition,
  stationNumber: number,
  options: BakeRushOrderOptions = {}
): BakeRushOrder => {
  const rng = options.rng ?? createBakeRushSeededRandom(options.seed ?? `${station.id}-${stationNumber}`);
  const safeRecipe = buildRecipeVariant(station, stationNumber, rng);
  const treatCount = buildTreatCount(stationNumber, rng);
  const perTreat = safeRecipe.length;
  const mathIngredient = pickOne(safeRecipe, rng);
  const mathKind = buildMathKind(stationNumber, rng);
  const totalMoves = treatCount * perTreat;
  const tickets = buildBakeRushTickets(safeRecipe, stationNumber, { rng });
  let answer = totalMoves;
  let answerUnit = 'moves';
  let mathPrompt = `Each treat needs ${perTreat} topping moves. ${treatCount} treats need how many moves?`;
  const mathSummary = `${treatCount} treats x ${perTreat} toppings`;

  if (mathKind === 'perTreat') {
    answer = perTreat;
    answerUnit = 'each';
    mathPrompt = `${totalMoves} ${formatIngredient(mathIngredient)} moves are shared across ${treatCount} treats. How many per treat?`;
  } else if (mathKind === 'treatCount') {
    answer = treatCount;
    answerUnit = 'treats';
    mathPrompt = `You have ${totalMoves} topping moves and use ${perTreat} per treat. How many treats can you finish?`;
  }

  return {
    steps: ['base', ...safeRecipe, 'serve'],
    tickets,
    recipe: safeRecipe,
    treatCount,
    perTreat,
    mathIngredient,
    mathPrompt,
    mathSummary,
    answerUnit,
    answer,
    choices: buildBakeRushChoices(
      answer,
      [answer - treatCount, answer + treatCount, answer + perTreat, answer - perTreat, totalMoves],
      rng
    )
  };
};

export const buildBakeRushTickets = (
  recipe: BakingIngredient[],
  stationNumber: number,
  options: BakeRushOrderOptions = {}
): BakeRushTicket[] => {
  const rng = options.rng ?? createBakeRushSeededRandom(`tickets-${stationNumber}-${recipe.join('-')}`);
  const safeRecipe: BakingIngredient[] = recipe.length > 0 ? recipe : ['frosting'];
  const maxTickets = Math.min(4, Math.max(2, stationNumber + 1));
  const ticketCount = randInt(2, maxTickets, rng);

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

export const buildBakeRushChoices = (answer: number, candidates: number[], rng?: RandomSource): number[] => {
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

  return rng ? shuffled(choices, rng) : choices;
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
