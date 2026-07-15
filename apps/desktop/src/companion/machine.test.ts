import { createActor } from "xstate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { petMachine } from "./machine";

describe("petMachine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs the pet and feed cooldown paths", () => {
    const actor = createActor(petMachine).start();
    actor.send({ type: "PET" });
    expect(actor.getSnapshot().value).toBe("petted");
    vi.advanceTimersByTime(240);
    expect(actor.getSnapshot().value).toBe("happy");
    vi.advanceTimersByTime(720);
    expect(actor.getSnapshot().value).toBe("idle");

    actor.send({ type: "FEED" });
    expect(actor.getSnapshot().value).toBe("eating");
    vi.advanceTimersByTime(900);
    expect(actor.getSnapshot().value).toBe("happy");
    actor.stop();
  });

  it("sleeps until wake and lets dragging interrupt actions", () => {
    const actor = createActor(petMachine).start();
    actor.send({ type: "SLEEP" });
    expect(actor.getSnapshot().value).toBe("sleeping");
    actor.send({ type: "WAKE" });
    expect(actor.getSnapshot().value).toBe("idle");

    actor.send({ type: "ANGRY" });
    expect(actor.getSnapshot().value).toBe("angry");
    actor.send({ type: "DRAG_START" });
    expect(actor.getSnapshot().value).toBe("dragging");
    actor.send({ type: "DROP" });
    expect(actor.getSnapshot().value).toBe("idle");
    actor.stop();
  });

  it("blinks on the idle timer", () => {
    const actor = createActor(petMachine).start();
    vi.advanceTimersByTime(4200);
    expect(actor.getSnapshot().value).toBe("blink");
    vi.advanceTimersByTime(180);
    expect(actor.getSnapshot().value).toBe("idle");
    actor.stop();
  });
});
