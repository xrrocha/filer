/**
 * Event Handlers - Registry pattern for event creation and replay
 *
 * This module eliminates 40+ switch cases across proxy.ts and replay.ts
 * by providing a unified registry of event handlers.
 *
 * Each event type has ONE handler class that knows how to:
 * 1. Create the event (from proxy mutations)
 * 2. Apply the event (during replay)
 *
 * Benefits:
 * - Single source of truth per event type
 * - Testable in isolation
 * - Extensible - easy to add new event types
 * - Type safe - handlers are strongly typed
 */

import type {
  Path,
  Event,
  SerializedValue,
  ProxyInfrastructure,
} from './types.js';
import { EVENT_TYPES } from './constants.js';
import { serializeValueForEvent } from './serialize.js';
import { reconstructValue } from './deserialize.js';

// ============================================================================
// Event Handler Interface
// ============================================================================

/**
 * Interface for event handlers
 *
 * Each event type implements this interface with type-specific logic.
 */
export interface EventHandler {
  /**
   * Create an event from a mutation
   *
   * Called by proxy when a mutation occurs.
   *
   * @param path - Path to the mutated object
   * @param args - Arguments passed to the mutating operation
   * @param infrastructure - Proxy infrastructure for serialization
   * @returns Event object ready to be logged
   */
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event;

  /**
   * Apply an event during replay
   *
   * Called by replay engine to reconstruct state.
   *
   * @param event - Event to apply
   * @param target - Parent object containing the property
   * @param key - Property key to mutate
   * @param root - Root object for resolving references
   */
  applyEvent(
    event: Event,
    target: unknown,
    key: string,
    root: unknown,
  ): void;
}

// ============================================================================
// Property Mutation Handlers (SET, DELETE)
// ============================================================================

/**
 * Handler for SET events (property assignment)
 */
class SetEventHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    const [value] = args;
    return {
      type: EVENT_TYPES.SET,
      path,
      value: serializeValueForEvent(
        value,
        infrastructure.proxyToTarget,
        infrastructure.targetToPath,
        path,
      ),
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const setEvent = event as Event & { value: SerializedValue };
    (target as Record<string, unknown>)[key] = reconstructValue(
      setEvent.value,
      root,
    );
  }
}

/**
 * Handler for DELETE events (property deletion)
 */
class DeleteEventHandler implements EventHandler {
  createEvent(path: Path): Event {
    return {
      type: EVENT_TYPES.DELETE,
      path,
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(_event: Event, target: unknown, key: string): void {
    delete (target as Record<string, unknown>)[key];
  }
}

// ============================================================================
// Array Mutation Handlers
// ============================================================================

/**
 * Handler for ARRAY_PUSH events
 */
class ArrayPushHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    return {
      type: EVENT_TYPES.ARRAY_PUSH,
      path,
      items: args.map((v) =>
        serializeValueForEvent(
          v,
          infrastructure.proxyToTarget,
          infrastructure.targetToPath,
          path,
        ),
      ),
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const pushEvent = event as Event & { items: readonly SerializedValue[] };
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    for (const item of pushEvent.items) {
      arr.push(reconstructValue(item, root));
    }
  }
}

/**
 * Handler for ARRAY_POP events
 */
class ArrayPopHandler implements EventHandler {
  createEvent(path: Path): Event {
    return {
      type: EVENT_TYPES.ARRAY_POP,
      path,
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(_event: Event, target: unknown, key: string): void {
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    arr.pop();
  }
}

/**
 * Handler for ARRAY_SHIFT events
 */
class ArrayShiftHandler implements EventHandler {
  createEvent(path: Path): Event {
    return {
      type: EVENT_TYPES.ARRAY_SHIFT,
      path,
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(_event: Event, target: unknown, key: string): void {
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    arr.shift();
  }
}

/**
 * Handler for ARRAY_UNSHIFT events
 */
class ArrayUnshiftHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    return {
      type: EVENT_TYPES.ARRAY_UNSHIFT,
      path,
      items: args.map((v) =>
        serializeValueForEvent(
          v,
          infrastructure.proxyToTarget,
          infrastructure.targetToPath,
          path,
        ),
      ),
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const unshiftEvent = event as Event & {
      items: readonly SerializedValue[];
    };
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    const items = unshiftEvent.items.map((v) => reconstructValue(v, root));
    arr.unshift(...items);
  }
}

/**
 * Handler for ARRAY_SPLICE events
 */
class ArraySpliceHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    return {
      type: EVENT_TYPES.ARRAY_SPLICE,
      path,
      start: args[0] as number,
      deleteCount: (args[1] as number) || 0,
      items: args
        .slice(2)
        .map((v) =>
          serializeValueForEvent(
            v,
            infrastructure.proxyToTarget,
            infrastructure.targetToPath,
            path,
          ),
        ),
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const spliceEvent = event as Event & {
      start: number;
      deleteCount: number;
      items: readonly SerializedValue[];
    };
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    const items = spliceEvent.items.map((v) => reconstructValue(v, root));
    arr.splice(spliceEvent.start, spliceEvent.deleteCount, ...items);
  }
}

/**
 * Handler for ARRAY_SORT events
 */
class ArraySortHandler implements EventHandler {
  createEvent(path: Path): Event {
    return {
      type: EVENT_TYPES.ARRAY_SORT,
      path,
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(_event: Event, target: unknown, key: string): void {
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    arr.sort();
  }
}

/**
 * Handler for ARRAY_REVERSE events
 */
class ArrayReverseHandler implements EventHandler {
  createEvent(path: Path): Event {
    return {
      type: EVENT_TYPES.ARRAY_REVERSE,
      path,
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(_event: Event, target: unknown, key: string): void {
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    arr.reverse();
  }
}

/**
 * Handler for ARRAY_FILL events
 */
class ArrayFillHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    return {
      type: EVENT_TYPES.ARRAY_FILL,
      path,
      value: serializeValueForEvent(
        args[0],
        infrastructure.proxyToTarget,
        infrastructure.targetToPath,
        path,
      ),
      start: args[1],
      end: args[2],
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const fillEvent = event as Event & {
      value: SerializedValue;
      start: number | undefined;
      end: number | undefined;
    };
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    const value = reconstructValue(fillEvent.value, root);
    arr.fill(value, fillEvent.start, fillEvent.end);
  }
}

/**
 * Handler for ARRAY_COPYWITHIN events
 */
class ArrayCopyWithinHandler implements EventHandler {
  createEvent(path: Path, args: unknown[]): Event {
    return {
      type: EVENT_TYPES.ARRAY_COPYWITHIN,
      path,
      target: args[0],
      start: args[1],
      end: args[2],
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string): void {
    const copyEvent = event as Event & {
      target: number;
      start: number;
      end: number | undefined;
    };
    const arr = (target as Record<string, unknown>)[key] as unknown[];
    arr.copyWithin(copyEvent.target, copyEvent.start, copyEvent.end);
  }
}

// ============================================================================
// Map Mutation Handlers
// ============================================================================

/**
 * Handler for MAP_SET events
 */
class MapSetHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    return {
      type: EVENT_TYPES.MAP_SET,
      path,
      key: serializeValueForEvent(
        args[0],
        infrastructure.proxyToTarget,
        infrastructure.targetToPath,
        path,
      ),
      value: serializeValueForEvent(
        args[1],
        infrastructure.proxyToTarget,
        infrastructure.targetToPath,
        path,
      ),
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const mapSetEvent = event as Event & {
      key: SerializedValue;
      value: SerializedValue;
    };
    const map = (target as Record<string, unknown>)[key] as Map<
      unknown,
      unknown
    >;
    const mapKey = reconstructValue(mapSetEvent.key, root);
    const mapValue = reconstructValue(mapSetEvent.value, root);
    map.set(mapKey, mapValue);
  }
}

/**
 * Handler for MAP_DELETE events
 */
class MapDeleteHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    return {
      type: EVENT_TYPES.MAP_DELETE,
      path,
      key: serializeValueForEvent(
        args[0],
        infrastructure.proxyToTarget,
        infrastructure.targetToPath,
        path,
      ),
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const mapDeleteEvent = event as Event & { key: SerializedValue };
    const map = (target as Record<string, unknown>)[key] as Map<
      unknown,
      unknown
    >;
    const mapKey = reconstructValue(mapDeleteEvent.key, root);
    map.delete(mapKey);
  }
}

/**
 * Handler for MAP_CLEAR events
 */
class MapClearHandler implements EventHandler {
  createEvent(path: Path): Event {
    return {
      type: EVENT_TYPES.MAP_CLEAR,
      path,
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(_event: Event, target: unknown, key: string): void {
    const map = (target as Record<string, unknown>)[key] as Map<
      unknown,
      unknown
    >;
    map.clear();
  }
}

// ============================================================================
// Set Mutation Handlers
// ============================================================================

/**
 * Handler for SET_ADD events
 */
class SetAddHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    return {
      type: EVENT_TYPES.SET_ADD,
      path,
      value: serializeValueForEvent(
        args[0],
        infrastructure.proxyToTarget,
        infrastructure.targetToPath,
        path,
      ),
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const setAddEvent = event as Event & { value: SerializedValue };
    const set = (target as Record<string, unknown>)[key] as Set<unknown>;
    const value = reconstructValue(setAddEvent.value, root);
    set.add(value);
  }
}

/**
 * Handler for SET_DELETE events
 */
class SetDeleteHandler implements EventHandler {
  createEvent(
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    return {
      type: EVENT_TYPES.SET_DELETE,
      path,
      value: serializeValueForEvent(
        args[0],
        infrastructure.proxyToTarget,
        infrastructure.targetToPath,
        path,
      ),
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(event: Event, target: unknown, key: string, root: unknown): void {
    const setDeleteEvent = event as Event & { value: SerializedValue };
    const set = (target as Record<string, unknown>)[key] as Set<unknown>;
    const value = reconstructValue(setDeleteEvent.value, root);
    set.delete(value);
  }
}

/**
 * Handler for SET_CLEAR events
 */
class SetClearHandler implements EventHandler {
  createEvent(path: Path): Event {
    return {
      type: EVENT_TYPES.SET_CLEAR,
      path,
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(_event: Event, target: unknown, key: string): void {
    const set = (target as Record<string, unknown>)[key] as Set<unknown>;
    set.clear();
  }
}

// ============================================================================
// Script Event Handler
// ============================================================================

/**
 * Handler for SCRIPT events (audit trail only, no mutation)
 */
class ScriptEventHandler implements EventHandler {
  createEvent(path: Path, args: unknown[]): Event {
    return {
      type: EVENT_TYPES.SCRIPT,
      path,
      source: args[0] as string,
      timestamp: Date.now(),
    } as Event;
  }

  applyEvent(): void {
    // Script events don't mutate state, they're for audit trail only
  }
}

// ============================================================================
// Event Handler Registry
// ============================================================================

/**
 * Registry for event handlers
 *
 * Provides lookup and invocation of handlers by event type.
 */
export class EventHandlerRegistry {
  private handlers = new Map<string, EventHandler>();

  /**
   * Register a handler for an event type
   */
  register(eventType: string, handler: EventHandler): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * Create an event from a mutation
   *
   * Replaces 112 lines of switch cases in proxy.ts
   */
  createEvent(
    eventType: string,
    path: Path,
    args: unknown[],
    infrastructure: ProxyInfrastructure,
  ): Event {
    const handler = this.handlers.get(eventType);
    if (!handler) {
      throw new Error(`No handler registered for event type: ${eventType}`);
    }
    return handler.createEvent(path, args, infrastructure);
  }

  /**
   * Apply an event during replay
   *
   * Replaces 153 lines of switch cases in replay.ts
   */
  applyEvent(
    event: Event,
    target: unknown,
    key: string,
    root: unknown,
  ): void {
    const handler = this.handlers.get(event.type);
    if (!handler) {
      throw new Error(`No handler registered for event type: ${event.type}`);
    }
    handler.applyEvent(event, target, key, root);
  }

  /**
   * Check if a handler is registered
   */
  hasHandler(eventType: string): boolean {
    return this.handlers.has(eventType);
  }
}

// ============================================================================
// Exported Registry Instance
// ============================================================================

/**
 * Global event handler registry
 *
 * Pre-configured with all 18 event handlers.
 * Used by proxy.ts and replay.ts.
 */
export const eventRegistry = new EventHandlerRegistry();

// Register all handlers
eventRegistry.register(EVENT_TYPES.SET, new SetEventHandler());
eventRegistry.register(EVENT_TYPES.DELETE, new DeleteEventHandler());

eventRegistry.register(EVENT_TYPES.ARRAY_PUSH, new ArrayPushHandler());
eventRegistry.register(EVENT_TYPES.ARRAY_POP, new ArrayPopHandler());
eventRegistry.register(EVENT_TYPES.ARRAY_SHIFT, new ArrayShiftHandler());
eventRegistry.register(EVENT_TYPES.ARRAY_UNSHIFT, new ArrayUnshiftHandler());
eventRegistry.register(EVENT_TYPES.ARRAY_SPLICE, new ArraySpliceHandler());
eventRegistry.register(EVENT_TYPES.ARRAY_SORT, new ArraySortHandler());
eventRegistry.register(EVENT_TYPES.ARRAY_REVERSE, new ArrayReverseHandler());
eventRegistry.register(EVENT_TYPES.ARRAY_FILL, new ArrayFillHandler());
eventRegistry.register(EVENT_TYPES.ARRAY_COPYWITHIN, new ArrayCopyWithinHandler());

eventRegistry.register(EVENT_TYPES.MAP_SET, new MapSetHandler());
eventRegistry.register(EVENT_TYPES.MAP_DELETE, new MapDeleteHandler());
eventRegistry.register(EVENT_TYPES.MAP_CLEAR, new MapClearHandler());

eventRegistry.register(EVENT_TYPES.SET_ADD, new SetAddHandler());
eventRegistry.register(EVENT_TYPES.SET_DELETE, new SetDeleteHandler());
eventRegistry.register(EVENT_TYPES.SET_CLEAR, new SetClearHandler());

eventRegistry.register(EVENT_TYPES.SCRIPT, new ScriptEventHandler());
