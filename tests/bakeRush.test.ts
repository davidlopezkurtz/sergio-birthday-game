import { describe, expect, it } from 'vitest';
import {
  buildBakeRushOrder,
  buildBakeRushResult,
  buildBakeRushTickets,
  expectedBakeRushStep,
  isCorrectBakeRushStep
} from '../src/game/bakeRush';
import type { BakingStationDefinition } from '../src/types';

const station: BakingStationDefinition = {
  id: 'rush-test',
  x: 0,
  label: 'Rush Test',
  recipe: ['frosting', 'sprinkles', 'berry'],
  value: 0,
  perfectBonus: 0
};

describe('bake rush helpers', () => {
  it('builds a tray order with base, recipe ingredients, serve, and ingredient math', () => {
    const order = buildBakeRushOrder(station, 2, { seed: 'tray-order' });
    const ingredientSteps = order.steps.slice(1, -1);

    expect(order.steps[0]).toBe('base');
    expect(order.steps.at(-1)).toBe('serve');
    expect(ingredientSteps[0]).toBe('frosting');
    expect(ingredientSteps.length).toBeGreaterThanOrEqual(3);
    expect(ingredientSteps.length).toBeLessThanOrEqual(4);
    expect(new Set(ingredientSteps).size).toBe(ingredientSteps.length);
    expect(order.tickets.length).toBeGreaterThanOrEqual(2);
    expect(order.tickets.length).toBeLessThanOrEqual(3);
    expect(order.tickets.at(-1)?.steps).toEqual(order.steps);
    expect(order.treatCount).toBeGreaterThanOrEqual(4);
    expect(order.treatCount).toBeLessThanOrEqual(5);
    expect(order.perTreat).toBe(order.recipe.length);
    expect(order.answer).toBeGreaterThan(0);
    expect(order.choices).toHaveLength(4);
    expect(order.choices).toContain(order.answer);
    expect(new Set(order.choices).size).toBe(4);
    expect(order.mathPrompt.length).toBeGreaterThan(20);
    expect(order.mathSummary).toContain('treats');
    expect(order.answerUnit.length).toBeGreaterThan(0);
  });

  it('keeps seeded bake-off orders deterministic while allowing varied playthroughs', () => {
    const first = buildBakeRushOrder(station, 3, { seed: 'same-run' });
    const second = buildBakeRushOrder(station, 3, { seed: 'same-run' });
    const variants = ['same-run', 'next-run', 'third-run'].map((seed) => {
      const order = buildBakeRushOrder(station, 3, { seed });
      return `${order.steps.join(',')}|${order.mathPrompt}|${order.answer}`;
    });

    expect(second).toEqual(first);
    expect(new Set(variants).size).toBeGreaterThan(1);
  });

  it('keeps generated toppings supported by a frosting layer', () => {
    const seeds = ['support-1', 'support-2', 'support-3', 'support-4', 'support-5'];

    for (const seed of seeds) {
      const order = buildBakeRushOrder(station, 3, { seed });

      expect(order.recipe[0]).toBe('frosting');
      order.tickets.forEach((ticket) => {
        const ingredients = ticket.steps.slice(1, -1);
        expect(ingredients[0]).toBe('frosting');
      });
    }
  });

  it('builds short escalating judge tickets for active station play', () => {
    const tickets = buildBakeRushTickets(['berry', 'frosting', 'candle', 'sprinkles'], 3);

    expect(tickets).toHaveLength(3);
    expect(tickets[0]).toMatchObject({ label: 'Order 1', steps: ['base', 'berry', 'serve'] });
    expect(tickets[1]).toMatchObject({ label: 'Order 2', steps: ['base', 'berry', 'frosting', 'serve'] });
    expect(tickets[2]).toMatchObject({
      label: 'Showstopper',
      steps: ['base', 'berry', 'frosting', 'candle', 'sprinkles', 'serve']
    });
  });

  it('does not hang when duplicate candidates collide with fallback choices', () => {
    const levelTwoStation: BakingStationDefinition = {
      id: 'frosting-factory-final-bake-off',
      x: 0,
      label: 'Frosting Factory Bake-Off',
      recipe: ['frosting', 'berry', 'sprinkles', 'candle'],
      value: 0,
      perfectBonus: 0
    };

    const order = buildBakeRushOrder(levelTwoStation, 2, { seed: 'duplicate-candidates' });

    expect(order.answer).toBeGreaterThan(0);
    expect(order.choices).toHaveLength(4);
    expect(order.choices).toContain(order.answer);
    expect(new Set(order.choices).size).toBe(4);
  });

  it('validates the expected station step', () => {
    const order = buildBakeRushOrder(station, 1, { seed: 'expected-step' });
    const firstIngredient = order.steps[1];

    expect(expectedBakeRushStep(order, 0)).toBe('base');
    expect(isCorrectBakeRushStep(order, 1, firstIngredient)).toBe(true);
    expect(isCorrectBakeRushStep(order, order.steps.length - 1, 'serve')).toBe(true);
    expect(isCorrectBakeRushStep(order, 1, 'serve')).toBe(false);
  });

  it('converts prep mistakes, time expiry, and math into multiplier results', () => {
    expect(buildBakeRushResult(0, true, false)).toMatchObject({ mistakes: 0, perfect: true, multiplier: 2 });
    expect(buildBakeRushResult(1, true, false)).toMatchObject({ mistakes: 1, perfect: false, multiplier: 1.5 });
    expect(buildBakeRushResult(0, false, false)).toMatchObject({ mistakes: 1, perfect: false, multiplier: 1.5 });
    expect(buildBakeRushResult(1, false, true)).toMatchObject({ mistakes: 3, perfect: false, multiplier: 1.2 });
    expect(buildBakeRushResult(0, true, false, 1)).toMatchObject({ mistakes: 1, perfect: false, multiplier: 1.5 });
  });
});
