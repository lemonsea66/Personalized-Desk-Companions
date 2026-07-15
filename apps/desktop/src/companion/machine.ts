import { createMachine } from "xstate";

export type PetMachineEvent =
  | { type: "PET" }
  | { type: "FEED" }
  | { type: "SLEEP" }
  | { type: "WAKE" }
  | { type: "ANGRY" }
  | { type: "DRAG_START" }
  | { type: "DROP" };

export const petMachine = createMachine({
  types: {} as { events: PetMachineEvent },
  id: "pet",
  initial: "idle",
  states: {
    idle: {
      after: { 4200: "blink" },
      on: {
        PET: "petted",
        FEED: "eating",
        SLEEP: "sleeping",
        ANGRY: "angry",
        DRAG_START: "dragging"
      }
    },
    blink: {
      after: { 180: "idle" },
      on: { DRAG_START: "dragging" }
    },
    petted: {
      after: { 240: "happy" },
      on: { DRAG_START: "dragging" }
    },
    happy: {
      after: { 720: "idle" },
      on: { DRAG_START: "dragging" }
    },
    eating: {
      after: { 900: "happy" },
      on: { DRAG_START: "dragging" }
    },
    sleeping: {
      on: { WAKE: "idle", DRAG_START: "dragging" }
    },
    angry: {
      after: { 780: "idle" },
      on: { DRAG_START: "dragging" }
    },
    dragging: {
      on: { DROP: "idle" }
    }
  }
});
