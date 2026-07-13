/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreEventBus } from './FirestoreEventBus';

export type FirestoreState =
  | 'INITIALIZING'
  | 'ONLINE'
  | 'OFFLINE'
  | 'RECONNECTING'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'TERMINATED';

export class FirestoreStateMachine {
  private static instance: FirestoreStateMachine;
  private currentState: FirestoreState = 'INITIALIZING';
  private eventBus = FirestoreEventBus.getInstance();

  private validTransitions: Record<FirestoreState, FirestoreState[]> = {
    INITIALIZING: ['ONLINE', 'OFFLINE', 'TERMINATED'],
    ONLINE: ['OFFLINE', 'DEGRADED', 'TERMINATED'],
    OFFLINE: ['RECONNECTING', 'ONLINE', 'TERMINATED'],
    RECONNECTING: ['ONLINE', 'OFFLINE', 'DEGRADED', 'TERMINATED'],
    DEGRADED: ['RECOVERING', 'ONLINE', 'OFFLINE', 'TERMINATED'],
    RECOVERING: ['ONLINE', 'DEGRADED', 'OFFLINE', 'TERMINATED'],
    TERMINATED: ['INITIALIZING'],
  };

  private constructor() {}

  public static getInstance(): FirestoreStateMachine {
    const globalKey = '__firestore_state_machine__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreStateMachine();
    }
    return (globalThis as any)[globalKey];
  }

  public getState(): FirestoreState {
    return this.currentState;
  }

  public transitionTo(nextState: FirestoreState): boolean {
    const allowed = this.validTransitions[this.currentState];
    if (allowed.includes(nextState)) {
      const oldState = this.currentState;
      this.currentState = nextState;
      console.log(`[FirestoreStateMachine] ${oldState} ➔ ${nextState}`);
      this.eventBus.emit('StateChanged', { from: oldState, to: nextState });
      return true;
    }
    console.warn(
      `[FirestoreStateMachine] Invalid transition attempted: ${this.currentState} ➔ ${nextState}`
    );
    return false;
  }
}
