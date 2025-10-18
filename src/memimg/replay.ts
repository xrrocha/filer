/**
 * Event replay module for Memory Image Processor
 *
 * Reconstructs memory image state by replaying logged events.
 * Supports both full array iteration and async streaming.
 */

import type { Event, ReplayState, SerializedValue } from "./types.js";
import { reconstructValue } from "./deserialize.js";
import { eventRegistry } from "./event-handlers.js";

// ============================================================================
// Event Application Logic
// ============================================================================

/**
 * Applies a single event to a memory image root.
 */
const applyEvent = (root: unknown, event: Event): void => {
  // Navigate to the target location
  let target: unknown = root;

  // Navigate to parent (all except last segment)
  for (let i = 0; i < event.path.length - 1; i++) {
    const segment = event.path[i];
    if (!segment) continue; // Skip undefined segments

    // Create intermediate objects/arrays as needed
    if (!(segment in (target as Record<string, unknown>))) {
      const nextSegment = event.path[i + 1];
      // Create array if next segment looks like a number, otherwise object
      (target as Record<string, unknown>)[segment] =
        nextSegment && /^\d+$/.test(nextSegment) ? [] : {};
    }

    target = (target as Record<string, unknown>)[segment];
  }

  const finalKey = event.path[event.path.length - 1];
  if (!finalKey) return; // Skip if no final key

  // Use registry to apply event (eliminates 153-line switch statement)
  eventRegistry.applyEvent(event, target, finalKey, root);
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Replays events to reconstruct memory image state.
 */
export const replayEvents = async (
  root: unknown,
  events: readonly Event[] | AsyncIterable<Event>,
  replayState: ReplayState,
): Promise<void> => {
  replayState.isReplaying = true;

  if (Array.isArray(events)) {
    for (const event of events) {
      applyEvent(root, event);
    }
  } else {
    for await (const event of events) {
      applyEvent(root, event);
    }
  }

  replayState.isReplaying = false;
};

/**
 * Replays events from an event log to reconstruct memory image state.
 */
export const replayFromEventLog = async (
  root: unknown,
  eventLog: {
    getAll(): Promise<readonly Event[]>;
    stream?(): AsyncIterable<Event>;
  },
  replayState: ReplayState,
): Promise<void> => {
  if (eventLog.stream) {
    await replayEvents(root, eventLog.stream(), replayState);
  } else {
    const events = await eventLog.getAll();
    await replayEvents(root, events, replayState);
  }
};
