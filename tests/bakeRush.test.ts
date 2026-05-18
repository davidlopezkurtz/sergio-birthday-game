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
    const order = buildBakeRushOrder(station, 2);

    expect(order.steps).toEqual(['base', 'frosting', 'sprinkles', 'berry', 'serve']);
    expect(order.tickets.map((ticket) => ticket.steps)).toEqual([
      ['base', 'frosting', 'serve'],
      ['base', 'frosting', 'sprinkles', 'serve'],
      ['base', 'frosting', 'sprinkles', 'berry', 'serve']
    ]);
    expect(order.treatCount).toBe(4);
    expect(order.perTreat).toBe(3);
    expect(order.answer).toBe(12);
    expect(order.choices).toContain(12);
    expect(new Set(order.choices).size).toBe(4);
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

  it('validates the expected station step', () => {
    const order = buildBakeRushOrder(station, 1);

    expect(expectedBakeRushStep(order, 0)).toBe('base');
    expect(isCorrectBakeRushStep(order, 1, 'frosting')).toBe(true);
    expect(isCorrectBakeRushStep(order, 1, 'berry')).toBe(false);
  });

  it('converts prep mistakes, time expiry, and math into multiplier results', () => {
    expect(buildBakeRushResult(0, true, false)).toMatchObject({ mistakes: 0, perfect: true, multiplier: 2 });
    expect(buildBakeRushResult(1, true, false)).toMatchObject({ mistakes: 1, perfect: false, multiplier: 1.5 });
    expect(buildBakeRushResult(0, false, false)).toMatchObject({ mistakes: 1, perfect: false, multiplier: 1.5 });
    expect(buildBakeRushResult(1, false, true)).toMatchObject({ mistakes: 3, perfect: false, multiplier: 1.2 });
    expect(buildBakeRushResult(0, true, false, 1)).toMatchObject({ mistakes: 1, perfect: false, multiplier: 1.5 });
  });
});
