/**
 * FSM State Transition Tests
 *
 * Exhaustive verification of the SpiralMachine deterministic finite state machine.
 * Tests all 7 states and verifies valid/invalid transitions are properly handled.
 * 
 * Uses parameterized tests (it.each) to reduce code duplication.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    spiralReducer,
    createInitialContext,
    isProcessing,
    isListening,
    isCinematic,
    isError,
    canStartProcessing,
    canTriggerCinematic,
    getStateDebugInfo,
    type SpiralContext,
} from '../spiralMachine';

// ============================================================================
// Helper Types & Functions
// ============================================================================

type EventType =
    | 'START_LISTENING' | 'STOP_LISTENING' | 'TEXT_INPUT'
    | 'START_PROCESSING' | 'START_DELIBERATING' | 'START_RESPONDING'
    | 'RESPONSE_COMPLETE' | 'TRIGGER_CINEMATIC' | 'CINEMATIC_COMPLETE'
    | 'ERROR' | 'DISMISS_ERROR' | 'RESET';

type StateType = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'DELIBERATING' | 'RESPONDING' | 'CINEMATIC' | 'ERROR';

interface TransitionTest {
    event: EventType;
    expectedState: StateType;
    payload?: Record<string, unknown>;
    expectedSubState?: string | null;
}

/**
 * Tests a single state transition
 */
function testTransition(
    ctx: SpiralContext,
    event: EventType,
    expectedState: StateType,
    payload?: Record<string, unknown>
): SpiralContext {
    const eventObj = payload ? { type: event, payload } : { type: event };
    const next = spiralReducer(ctx, eventObj as Parameters<typeof spiralReducer>[1]);
    expect(next.state).toBe(expectedState);
    return next;
}

/**
 * Transitions context to a specific state for setup
 */
function transitionTo(ctx: SpiralContext, events: EventType[]): SpiralContext {
    return events.reduce((c, event) => spiralReducer(c, { type: event }), ctx);
}

// ============================================================================
// Tests
// ============================================================================

describe('SpiralMachine FSM', () => {
    let context: SpiralContext;

    beforeEach(() => {
        context = createInitialContext();
    });

    // ==========================================================================
    // Initial State Tests
    // ==========================================================================
    describe('Initial State', () => {
        it('starts in IDLE with clean state', () => {
            expect(context.state).toBe('IDLE');
            expect(context.processingSubState).toBeNull();
            expect(context.error).toBeNull();
            expect(context.transitionHistory).toEqual([]);
        });
    });

    // ==========================================================================
    // Valid Transitions - Parameterized Tests
    // ==========================================================================
    describe('Valid Transitions from IDLE', () => {
        const idleTransitions: TransitionTest[] = [
            { event: 'START_LISTENING', expectedState: 'LISTENING' },
            { event: 'TEXT_INPUT', expectedState: 'LISTENING' },
            { event: 'START_PROCESSING', expectedState: 'PROCESSING', expectedSubState: 'extracting' },
            { event: 'TRIGGER_CINEMATIC', expectedState: 'CINEMATIC' },
            { event: 'RESET', expectedState: 'IDLE' },
        ];

        it.each(idleTransitions)('IDLE → $expectedState via $event', ({ event, expectedState, expectedSubState }) => {
            const next = testTransition(context, event, expectedState);
            if (expectedSubState !== undefined) {
                expect(next.processingSubState).toBe(expectedSubState);
            }
        });
    });

    describe('Valid Transitions from LISTENING', () => {
        const listeningTransitions: TransitionTest[] = [
            { event: 'STOP_LISTENING', expectedState: 'IDLE' },
            { event: 'START_PROCESSING', expectedState: 'PROCESSING' },
            { event: 'RESET', expectedState: 'IDLE' },
        ];

        it.each(listeningTransitions)('LISTENING → $expectedState via $event', ({ event, expectedState }) => {
            const ctx = transitionTo(context, ['START_LISTENING']);
            testTransition(ctx, event, expectedState);
        });

        it('LISTENING → ERROR with error message', () => {
            const ctx = transitionTo(context, ['START_LISTENING']);
            const next = spiralReducer(ctx, { type: 'ERROR', payload: { message: 'Test error' } });
            expect(next.state).toBe('ERROR');
            expect(next.error).toBe('Test error');
        });
    });

    describe('Valid Transitions from PROCESSING', () => {
        const processingTransitions: TransitionTest[] = [
            { event: 'START_DELIBERATING', expectedState: 'DELIBERATING', expectedSubState: 'generating' },
            { event: 'START_RESPONDING', expectedState: 'RESPONDING' },
            { event: 'TRIGGER_CINEMATIC', expectedState: 'CINEMATIC' },
        ];

        it.each(processingTransitions)('PROCESSING → $expectedState via $event', ({ event, expectedState, expectedSubState }) => {
            const ctx = transitionTo(context, ['START_PROCESSING']);
            const next = testTransition(ctx, event, expectedState);
            if (expectedSubState !== undefined) {
                expect(next.processingSubState).toBe(expectedSubState);
            }
        });

        it('PROCESSING → ERROR on error event', () => {
            const ctx = transitionTo(context, ['START_PROCESSING']);
            testTransition(ctx, 'ERROR', 'ERROR', { message: 'API error' });
        });
    });

    describe('Valid Transitions from DELIBERATING', () => {
        const deliberatingTransitions: TransitionTest[] = [
            { event: 'START_RESPONDING', expectedState: 'RESPONDING' },
            { event: 'TRIGGER_CINEMATIC', expectedState: 'CINEMATIC' },
        ];

        it.each(deliberatingTransitions)('DELIBERATING → $expectedState via $event', ({ event, expectedState }) => {
            const ctx = transitionTo(context, ['START_PROCESSING', 'START_DELIBERATING']);
            testTransition(ctx, event, expectedState);
        });

        it('DELIBERATING → ERROR on timeout', () => {
            const ctx = transitionTo(context, ['START_PROCESSING', 'START_DELIBERATING']);
            testTransition(ctx, 'ERROR', 'ERROR', { message: 'Timeout' });
        });
    });

    describe('Valid Transitions from RESPONDING', () => {
        const respondingTransitions: TransitionTest[] = [
            { event: 'RESPONSE_COMPLETE', expectedState: 'IDLE' },
            { event: 'TRIGGER_CINEMATIC', expectedState: 'CINEMATIC' },
            { event: 'START_LISTENING', expectedState: 'LISTENING' },
        ];

        it.each(respondingTransitions)('RESPONDING → $expectedState via $event', ({ event, expectedState }) => {
            const ctx = transitionTo(context, ['START_PROCESSING', 'START_RESPONDING']);
            testTransition(ctx, event, expectedState);
        });

        it('RESPONDING → ERROR on stream error', () => {
            const ctx = transitionTo(context, ['START_PROCESSING', 'START_RESPONDING']);
            testTransition(ctx, 'ERROR', 'ERROR', { message: 'Stream error' });
        });
    });

    describe('Valid Transitions from CINEMATIC', () => {
        const cinematicTransitions: TransitionTest[] = [
            { event: 'CINEMATIC_COMPLETE', expectedState: 'IDLE' },
            { event: 'RESET', expectedState: 'IDLE' },
        ];

        it.each(cinematicTransitions)('CINEMATIC → $expectedState via $event', ({ event, expectedState }) => {
            const ctx = transitionTo(context, ['TRIGGER_CINEMATIC']);
            testTransition(ctx, event, expectedState);
        });

        it('CINEMATIC → ERROR on WebGL loss', () => {
            const ctx = transitionTo(context, ['TRIGGER_CINEMATIC']);
            testTransition(ctx, 'ERROR', 'ERROR', { message: 'WebGL lost' });
        });
    });

    describe('Valid Transitions from ERROR', () => {
        it.each([
            { event: 'DISMISS_ERROR' as EventType, expectedState: 'IDLE' as StateType },
            { event: 'RESET' as EventType, expectedState: 'IDLE' as StateType },
            { event: 'START_LISTENING' as EventType, expectedState: 'LISTENING' as StateType },
        ])('ERROR → $expectedState via $event', ({ event, expectedState }) => {
            const ctx = transitionTo(context, ['START_LISTENING']);
            const errorCtx = spiralReducer(ctx, { type: 'ERROR', payload: { message: 'Test' } });
            const next = testTransition(errorCtx, event, expectedState);
            if (expectedState === 'IDLE') {
                expect(next.error).toBeNull();
            }
        });
    });

    // ==========================================================================
    // Invalid Transitions - Must be BLOCKED
    // ==========================================================================
    describe('Invalid Transitions (MUST be blocked)', () => {
        const blockedTransitions: Array<{ setup: EventType[]; event: EventType; staysIn: StateType; desc: string }> = [
            { setup: [], event: 'START_RESPONDING', staysIn: 'IDLE', desc: 'IDLE → RESPONDING' },
            { setup: [], event: 'START_DELIBERATING', staysIn: 'IDLE', desc: 'IDLE → DELIBERATING' },
            { setup: [], event: 'CINEMATIC_COMPLETE', staysIn: 'IDLE', desc: 'IDLE → CINEMATIC_COMPLETE' },
            { setup: ['START_LISTENING'], event: 'TRIGGER_CINEMATIC', staysIn: 'LISTENING', desc: 'LISTENING → CINEMATIC' },
            { setup: ['START_PROCESSING'], event: 'START_LISTENING', staysIn: 'PROCESSING', desc: 'PROCESSING → LISTENING' },
            { setup: ['TRIGGER_CINEMATIC'], event: 'START_PROCESSING', staysIn: 'CINEMATIC', desc: 'CINEMATIC → PROCESSING' },
        ];

        it.each(blockedTransitions)('blocks $desc', ({ setup, event, staysIn }) => {
            const ctx = transitionTo(context, setup);
            testTransition(ctx, event, staysIn);
        });

        it('blocks ERROR → PROCESSING', () => {
            let ctx = transitionTo(context, ['START_LISTENING']);
            ctx = spiralReducer(ctx, { type: 'ERROR', payload: { message: 'err' } });
            testTransition(ctx, 'START_PROCESSING', 'ERROR');
        });
    });

    // ==========================================================================
    // Processing Sub-State Tests
    // ==========================================================================
    describe('Processing Sub-States', () => {
        it('sets correct sub-states through processing pipeline', () => {
            let ctx = spiralReducer(context, { type: 'START_PROCESSING' });
            expect(ctx.processingSubState).toBe('extracting');

            ctx = spiralReducer(context, { type: 'START_PROCESSING', payload: { forceBreakthrough: true } });
            expect(ctx.processingSubState).toBe('breakthrough');

            ctx = transitionTo(context, ['START_PROCESSING']);
            ctx = spiralReducer(ctx, { type: 'START_DELIBERATING' });
            expect(ctx.processingSubState).toBe('generating');
        });

        it('clears sub-state when returning to IDLE', () => {
            const ctx = transitionTo(context, ['START_PROCESSING', 'START_RESPONDING']);
            const next = spiralReducer(ctx, { type: 'RESPONSE_COMPLETE' });
            expect(next.processingSubState).toBeNull();
        });
    });

    // ==========================================================================
    // Transition History Tests
    // ==========================================================================
    describe('Transition History', () => {
        it('records transitions with from/to/event', () => {
            const next = spiralReducer(context, { type: 'START_LISTENING' });
            expect(next.transitionHistory).toHaveLength(1);
            expect(next.transitionHistory[0]).toMatchObject({
                from: 'IDLE',
                to: 'LISTENING',
                event: 'START_LISTENING',
            });
        });

        it('accumulates and caps at 20 entries', () => {
            let ctx = context;
            for (let i = 0; i < 25; i++) {
                ctx = spiralReducer(ctx, { type: 'START_LISTENING' });
                ctx = spiralReducer(ctx, { type: 'STOP_LISTENING' });
            }
            expect(ctx.transitionHistory.length).toBeLessThanOrEqual(20);
        });
    });

    // ==========================================================================
    // State Predicates Tests
    // ==========================================================================
    describe('State Predicates', () => {
        it('isProcessing detects processing states', () => {
            expect(isProcessing(context)).toBe(false);
            expect(isProcessing(transitionTo(context, ['START_PROCESSING']))).toBe(true);
            expect(isProcessing(transitionTo(context, ['START_PROCESSING', 'START_DELIBERATING']))).toBe(true);
            expect(isProcessing(transitionTo(context, ['START_PROCESSING', 'START_RESPONDING']))).toBe(true);
        });

        it('state predicate functions work correctly', () => {
            expect(isListening(transitionTo(context, ['START_LISTENING']))).toBe(true);
            expect(isCinematic(transitionTo(context, ['TRIGGER_CINEMATIC']))).toBe(true);

            const errorCtx = spiralReducer(
                transitionTo(context, ['START_LISTENING']),
                { type: 'ERROR', payload: { message: 'err' } }
            );
            expect(isError(errorCtx)).toBe(true);
        });

        it('capability predicates work correctly', () => {
            expect(canStartProcessing(context)).toBe(true);
            expect(canStartProcessing(transitionTo(context, ['START_LISTENING']))).toBe(true);
            expect(canStartProcessing(transitionTo(context, ['START_PROCESSING']))).toBe(false);

            expect(canTriggerCinematic(context)).toBe(true);
            expect(canTriggerCinematic(transitionTo(context, ['START_PROCESSING']))).toBe(true);
            expect(canTriggerCinematic(transitionTo(context, ['START_LISTENING']))).toBe(false);
        });
    });

    // ==========================================================================
    // Debug Helpers Tests
    // ==========================================================================
    describe('Debug Helpers', () => {
        it('getStateDebugInfo returns valid JSON with state', () => {
            const debugInfo = getStateDebugInfo(context);
            const parsed = JSON.parse(debugInfo);
            expect(parsed.state).toBe('IDLE');
        });
    });
});
