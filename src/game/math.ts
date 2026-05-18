import type { MathCategory, MathProblem } from '../types';

export type RandomSource = () => number;

const randInt = (min: number, max: number, rng: RandomSource): number =>
  Math.floor(rng() * (max - min + 1)) + min;

const shuffle = <T>(items: T[], rng: RandomSource): T[] => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randInt(0, index, rng);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const choicesAround = (answer: number, rng: RandomSource, min = 0): number[] => {
  const values = new Set<number>([answer]);
  const offsets = shuffle([-12, -8, -5, -3, -2, 2, 3, 4, 5, 7, 9, 12], rng);

  for (const offset of offsets) {
    if (values.size >= 4) {
      break;
    }

    const candidate = answer + offset;
    if (candidate >= min) {
      values.add(candidate);
    }
  }

  while (values.size < 4) {
    values.add(Math.max(min, answer + randInt(-15, 15, rng)));
  }

  return shuffle([...values], rng);
};

const buildId = (category: MathCategory, rng: RandomSource): string =>
  `${category}-${Math.floor(rng() * 1_000_000)}`;

const makeAddSubProblem = (rng: RandomSource): MathProblem => {
  const useAddition = rng() >= 0.45;

  if (useAddition) {
    const left = randInt(12, 67, rng);
    const right = randInt(8, 38, rng);
    const answer = left + right;

    return {
      id: buildId('addSub', rng),
      prompt: `${left} + ${right} = ?`,
      category: 'addSub',
      choices: choicesAround(answer, rng),
      correctAnswer: answer,
      hint: `Break ${right} into tens and ones, then add each part to ${left}.`
    };
  }

  const answer = randInt(8, 69, rng);
  const right = randInt(7, 34, rng);
  const left = answer + right;

  return {
    id: buildId('addSub', rng),
    prompt: `${left} - ${right} = ?`,
    category: 'addSub',
    choices: choicesAround(answer, rng),
    correctAnswer: answer,
    hint: `Think: what number plus ${right} makes ${left}?`
  };
};

const makeMultiplyDivideProblem = (rng: RandomSource): MathProblem => {
  const useMultiplication = rng() >= 0.42;

  if (useMultiplication) {
    const left = randInt(3, 12, rng);
    const right = randInt(2, 12, rng);
    const answer = left * right;

    return {
      id: buildId('multiplyDivide', rng),
      prompt: `${left} × ${right} = ?`,
      category: 'multiplyDivide',
      choices: choicesAround(answer, rng),
      correctAnswer: answer,
      hint: `Count ${left} groups of ${right}, or double a fact you already know.`
    };
  }

  const divisor = randInt(2, 12, rng);
  const answer = randInt(2, 12, rng);
  const dividend = divisor * answer;

  return {
    id: buildId('multiplyDivide', rng),
    prompt: `${dividend} ÷ ${divisor} = ?`,
    category: 'multiplyDivide',
    choices: choicesAround(answer, rng, 1),
    correctAnswer: answer,
    hint: `Find the number that makes ${divisor} groups add up to ${dividend}.`
  };
};

const fractionValue = (numerator: number, denominator: number): number => numerator / denominator;

const makeFractionLabel = (numerator: number, denominator: number): string => `${numerator}/${denominator}`;

const makeCompareFractionProblem = (rng: RandomSource): MathProblem => {
  const templates = ['compare', 'fraction', 'mixed'] as const;
  const template = templates[randInt(0, templates.length - 1, rng)];

  if (template === 'compare') {
    const left = randInt(18, 96, rng);
    const right = randInt(18, 96, rng);
    const answer = Math.max(left, right);

    return {
      id: buildId('compareFraction', rng),
      prompt: `Which number is greater: ${left} or ${right}?`,
      category: 'compareFraction',
      choices: choicesAround(answer, rng, 1),
      correctAnswer: answer,
      hint: 'Compare the tens first, then the ones.'
    };
  }

  const denominators = [2, 3, 4, 5, 6, 8];
  const denominatorA = denominators[randInt(0, denominators.length - 1, rng)];
  const denominatorB = denominators[randInt(0, denominators.length - 1, rng)];
  const numeratorA = randInt(1, denominatorA - 1, rng);
  const numeratorB = randInt(1, denominatorB - 1, rng);
  const valueA = fractionValue(numeratorA, denominatorA);
  const valueB = fractionValue(numeratorB, denominatorB);

  if (valueA === valueB) {
    return makeCompareFractionProblem(rng);
  }

  const fractionA = makeFractionLabel(numeratorA, denominatorA);
  const fractionB = makeFractionLabel(numeratorB, denominatorB);
  const biggerFraction = valueA > valueB ? fractionA : fractionB;
  const displayChoiceSet = new Set<string>([fractionA, fractionB]);

  while (displayChoiceSet.size < 4) {
    const denominator = denominators[randInt(0, denominators.length - 1, rng)];
    const numerator = randInt(1, denominator - 1, rng);
    displayChoiceSet.add(makeFractionLabel(numerator, denominator));
  }

  const displayChoices = shuffle([...displayChoiceSet], rng);

  return {
    id: buildId('compareFraction', rng),
    prompt:
      template === 'fraction'
        ? `Which fraction is bigger?`
        : `Which cake slice feeds more cats?`,
    category: 'compareFraction',
    choices: [0, 1, 2, 3],
    displayChoices,
    correctAnswer: displayChoices.indexOf(biggerFraction),
    hint: `The bigger slice is ${biggerFraction}. Use the picture in your head: same cake, more cake wins.`
  };
};

export const generateProblem = (category: MathCategory, rng: RandomSource = Math.random): MathProblem => {
  switch (category) {
    case 'addSub':
      return makeAddSubProblem(rng);
    case 'multiplyDivide':
      return makeMultiplyDivideProblem(rng);
    case 'compareFraction':
      return makeCompareFractionProblem(rng);
  }
};

export const generateProblemForLevel = (
  categories: MathCategory[],
  rng: RandomSource = Math.random
): MathProblem => {
  const category = categories[randInt(0, categories.length - 1, rng)];

  return generateProblem(category, rng);
};
