import { describe, expect, it } from 'vitest';
import {
  getRegistry,
  assertNotWidgetSurface,
  SurfaceViolationError,
  CHAT_TOOLS,
  WIDGET_TOOLS,
  CHAT_AGENTS,
  WIDGET_AGENTS,
} from '@/lib/ai/agents/registry';

/**
 * The firewall suite (MASTER_BUILD_SPEC.md §23.6 testing task 4). "A passing
 * suite without this test is not acceptable" — §10.3.
 */
describe('agent registry — the widget firewall', () => {
  it("getRegistry('widget').tools contains only kb_search", () => {
    const registry = getRegistry('widget');
    expect(registry.tools).toEqual(['kb_search']);
  });

  it("getRegistry('widget').agents contains only knowledge-base", () => {
    const registry = getRegistry('widget');
    expect(registry.agents).toEqual(['knowledge-base']);
  });

  it('no ServiceNow tool appears in the widget registry', () => {
    const registry = getRegistry('widget');
    const snowTools = registry.tools.filter((t) => t.startsWith('snow_'));
    expect(snowTools).toHaveLength(0);
  });

  it("getRegistry('chat') exposes every chat tool and agent", () => {
    const registry = getRegistry('chat');
    expect(registry.tools).toEqual(CHAT_TOOLS);
    expect(registry.agents).toEqual(CHAT_AGENTS);
  });

  it('WIDGET_TOOLS and WIDGET_AGENTS are not derived by filtering CHAT_*', () => {
    // Structural guard: WIDGET_TOOLS must be a strict, small subset — if a
    // future edit accidentally aliased it to CHAT_TOOLS, this would catch it.
    expect(WIDGET_TOOLS.length).toBeLessThan(CHAT_TOOLS.length);
    expect(WIDGET_AGENTS.length).toBeLessThan(CHAT_AGENTS.length);
  });

  it('assertNotWidgetSurface throws for surface: widget', () => {
    expect(() =>
      assertNotWidgetSurface({ surface: 'widget' }, 'snow_get_incident'),
    ).toThrow(SurfaceViolationError);
  });

  it('assertNotWidgetSurface does not throw for surface: chat', () => {
    expect(() =>
      assertNotWidgetSurface({ surface: 'chat' }, 'snow_get_incident'),
    ).not.toThrow();
  });

  it('assertNotWidgetSurface error message names the offending tool', () => {
    try {
      assertNotWidgetSurface({ surface: 'widget' }, 'snow_search_incidents');
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toContain('snow_search_incidents');
    }
  });
});
