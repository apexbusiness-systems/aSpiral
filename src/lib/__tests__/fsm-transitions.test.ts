/**
 * FSM State Transition Tests
 *
 * Exhaustive verification of the SpiralMachine deterministic finite state machine.
 * Tests all 7 states and verifies valid/invalid transitions are properly handled.
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

describe('SpiralMachine FSM', () => {
    let context: SpiralContext;

    beforeEach(() => {
        context = createInitialContext();
    });

    // ==========================================================================
    // Initial State Tests
    // ==========================================================================
    describe('Initial State', () => {
        it('starts in IDLE state', () => {
            expect(context.state).toBe('IDLE');
        });

        it('has no processing sub-state initially', () => {
            expect(context.processingSubState).toBeNull();
        });

        it('has no error initially', () => {
            expect(context.error).toBeNull();
        });

        it('has empty transition history', () => {
            expect(context.transitionHistory).toEqual([]);
        });
    });

    // ==========================================================================
    // Valid Transition Tests - IDLE State
    // ==========================================================================
    describe('IDLE State Transitions', () => {
        it('IDLE → LISTENING via START_LISTENING', () => {
            const next = spiralReducer(context, { type: 'START_LISTENING' });
            expect(next.state).toBe('LISTENING');
        });

        it('IDLE → LISTENING via TEXT_INPUT', () => {
            const next = spiralReducer(context, { type: 'TEXT_INPUT' });
            expect(next.state).toBe('LISTENING');
        });

        it('IDLE → PROCESSING via START_PROCESSING', () => {
            const next = spiralReducer(context, { type: 'START_PROCESSING' });
            expect(next.state).toBe('PROCESSING');
            expect(next.processingSubState).toBe('extracting');
        });

        it('IDLE → CINEMATIC via TRIGGER_CINEMATIC', () => {
            const next = spiralReducer(context, { type: 'TRIGGER_CINEMATIC' });
            expect(next.state).toBe('CINEMATIC');
        });

        it('IDLE → IDLE via RESET (stays in IDLE)', () => {
            const next = spiralReducer(context, { type: 'RESET' });
            expect(next.state).toBe('IDLE');
        });
    });

    // ==========================================================================
    // Valid Transition Tests - LISTENING State
    // ==========================================================================
    describe('LISTENING State Transitions', () => {
        beforeEach(() => {
            context = spiralReducer(context, { type: 'START_LISTENING' });
        });

        it('LISTENING → IDLE via STOP_LISTENING', () => {
            const next = spiralReducer(context, { type: 'STOP_LISTENING' });
            expect(next.state).toBe('IDLE');
        });

        it('LISTENING → PROCESSING via START_PROCESSING', () => {
            const next = spiralReducer(context, { type: 'START_PROCESSING' });
            expect(next.state).toBe('PROCESSING');
        });

        it('LISTENING → ERROR via ERROR event', () => {
            const next = spiralReducer(context, { type: 'ERROR', payload: { message: 'Test error' } });
            expect(next.state).toBe('ERROR');
            expect(next.error).toBe('Test error');
        });

        it('LISTENING → IDLE via RESET', () => {
            const next = spiralReducer(context, { type: 'RESET' });
            expect(next.state).toBe('IDLE');
        });
    });

    // ==========================================================================
    // Valid Transition Tests - PROCESSING State
    // ==========================================================================
    describe('PROCESSING State Transitions', () => {
        beforeEach(() => {
            context = spiralReducer(context, { type: 'START_PROCESSING' });
        });

        it('PROCESSING → DELIBERATING via START_DELIBERATING', () => {
            const next = spiralReducer(context, { type: 'START_DELIBERATING' });
            expect(next.state).toBe('DELIBERATING');
            expect(next.processingSubState).toBe('generating');
        });

        it('PROCESSING → RESPONDING via START_RESPONDING', () => {
            const next = spiralReducer(context, { type: 'START_RESPONDING' });
            expect(next.state).toBe('RESPONDING');
        });

        it('PROCESSING → CINEMATIC via TRIGGER_CINEMATIC', () => {
            const next = spiralReducer(context, { type: 'TRIGGER_CINEMATIC' });
            expect(next.state).toBe('CINEMATIC');
        });

        it('PROCESSING → ERROR via ERROR event', () => {
            const next = spiralReducer(context, { type: 'ERROR', payload: { message: 'API error' } });
            expect(next.state).toBe('ERROR');
        });
    });

    // ==========================================================================
    // Valid Transition Tests - DELIBERATING State
    // ==========================================================================
    describe('DELIBERATING State Transitions', () => {
        beforeEach(() => {
            context = spiralReducer(context, { type: 'START_PROCESSING' });
            context = spiralReducer(context, { type: 'START_DELIBERATING' });
        });

        it('DELIBERATING → RESPONDING via START_RESPONDING', () => {
            const next = spiralReducer(context, { type: 'START_RESPONDING' });
            expect(next.state).toBe('RESPONDING');
        });

        it('DELIBERATING → CINEMATIC via TRIGGER_CINEMATIC', () => {
            const next = spiralReducer(context, { type: 'TRIGGER_CINEMATIC' });
            expect(next.state).toBe('CINEMATIC');
        });

        it('DELIBERATING → ERROR via ERROR event', () => {
            const next = spiralReducer(context, { type: 'ERROR', payload: { message: 'Timeout' } });
            expect(next.state).toBe('ERROR');
        });
    });

    // ==========================================================================
    // Valid Transition Tests - RESPONDING State
    // ==========================================================================
    describe('RESPONDING State Transitions', () => {
        beforeEach(() => {
            context = spiralReducer(context, { type: 'START_PROCESSING' });
            context = spiralReducer(context, { type: 'START_RESPONDING' });
        });

        it('RESPONDING → IDLE via RESPONSE_COMPLETE', () => {
            const next = spiralReducer(context, { type: 'RESPONSE_COMPLETE' });
            expect(next.state).toBe('IDLE');
        });

        it('RESPONDING → CINEMATIC via TRIGGER_CINEMATIC', () => {
            const next = spiralReducer(context, { type: 'TRIGGER_CINEMATIC' });
            expect(next.state).toBe('CINEMATIC');
        });

        it('RESPONDING → LISTENING via START_LISTENING (immediate follow-up)', () => {
            const next = spiralReducer(context, { type: 'START_LISTENING' });
            expect(next.state).toBe('LISTENING');
        });

        it('RESPONDING → ERROR via ERROR event', () => {
            const next = spiralReducer(context, { type: 'ERROR', payload: { message: 'Stream error' } });
            expect(next.state).toBe('ERROR');
        });
    });

    // ==========================================================================
    // Valid Transition Tests - CINEMATIC State
    // ==========================================================================
    describe('CINEMATIC State Transitions', () => {
        beforeEach(() => {
            context = spiralReducer(context, { type: 'TRIGGER_CINEMATIC' });
        });

        it('CINEMATIC → IDLE via CINEMATIC_COMPLETE', () => {
            const next = spiralReducer(context, { type: 'CINEMATIC_COMPLETE' });
            expect(next.state).toBe('IDLE');
        });

        it('CINEMATIC → ERROR via ERROR event', () => {
            const next = spiralReducer(context, { type: 'ERROR', payload: { message: 'WebGL lost' } });
            expect(next.state).toBe('ERROR');
        });

        it('CINEMATIC → IDLE via RESET', () => {
            const next = spiralReducer(context, { type: 'RESET' });
            expect(next.state).toBe('IDLE');
        });
    });

    // ==========================================================================
    // Valid Transition Tests - ERROR State
    // ==========================================================================
    describe('ERROR State Transitions', () => {
        beforeEach(() => {
            context = spiralReducer(context, { type: 'START_LISTENING' });
            context = spiralReducer(context, { type: 'ERROR', payload: { message: 'Test error' } });
        });

        it('ERROR → IDLE via DISMISS_ERROR', () => {
            const next = spiralReducer(context, { type: 'DISMISS_ERROR' });
            expect(next.state).toBe('IDLE');
            expect(next.error).toBeNull();
        });

        it('ERROR → IDLE via RESET', () => {
            const next = spiralReducer(context, { type: 'RESET' });
            expect(next.state).toBe('IDLE');
            expect(next.error).toBeNull();
        });

        it('ERROR → LISTENING via START_LISTENING (recovery)', () => {
            const next = spiralReducer(context, { type: 'START_LISTENING' });
            expect(next.state).toBe('LISTENING');
        });
    });

    // ==========================================================================
    // INVALID Transition Tests - Must be BLOCKED
    // ==========================================================================
    describe('Invalid Transitions (MUST be blocked)', () => {
        it('blocks IDLE → RESPONDING (skipping processing)', () => {
            const next = spiralReducer(context, { type: 'START_RESPONDING' });
            expect(next.state).toBe('IDLE'); // Should remain unchanged
        });

        it('blocks IDLE → DELIBERATING (skipping processing)', () => {
            const next = spiralReducer(context, { type: 'START_DELIBERATING' });
            expect(next.state).toBe('IDLE');
        });

        it('blocks IDLE → CINEMATIC_COMPLETE', () => {
            const next = spiralReducer(context, { type: 'CINEMATIC_COMPLETE' });
            expect(next.state).toBe('IDLE');
        });

        it('blocks LISTENING → CINEMATIC (must go through PROCESSING)', () => {
            context = spiralReducer(context, { type: 'START_LISTENING' });
            const next = spiralReducer(context, { type: 'TRIGGER_CINEMATIC' });
            expect(next.state).toBe('LISTENING');
        });

        it('blocks PROCESSING → LISTENING (must complete or error)', () => {
            context = spiralReducer(context, { type: 'START_PROCESSING' });
            const next = spiralReducer(context, { type: 'START_LISTENING' });
            expect(next.state).toBe('PROCESSING');
        });

        it('blocks CINEMATIC → PROCESSING (must complete first)', () => {
            context = spiralReducer(context, { type: 'TRIGGER_CINEMATIC' });
            const next = spiralReducer(context, { type: 'START_PROCESSING' });
            expect(next.state).toBe('CINEMATIC');
        });

        it('blocks ERROR → PROCESSING (must recover first)', () => {
            context = spiralReducer(context, { type: 'START_LISTENING' });
            context = spiralReducer(context, { type: 'ERROR', payload: { message: 'err' } });
            const next = spiralReducer(context, { type: 'START_PROCESSING' });
            expect(next.state).toBe('ERROR');
        });
    });

    // ==========================================================================
    // Processing Sub-State Tests
    // ==========================================================================
    describe('Processing Sub-States', () => {
        it('sets extracting sub-state on START_PROCESSING', () => {
            const next = spiralReducer(context, { type: 'START_PROCESSING' });
            expect(next.processingSubState).toBe('extracting');
        });

        it('sets breakthrough sub-state on START_PROCESSING with forceBreakthrough', () => {
            const next = spiralReducer(context, { type: 'START_PROCESSING', payload: { forceBreakthrough: true } });
            expect(next.processingSubState).toBe('breakthrough');
        });

        it('sets generating sub-state on START_DELIBERATING', () => {
            context = spiralReducer(context, { type: 'START_PROCESSING' });
            const next = spiralReducer(context, { type: 'START_DELIBERATING' });
            expect(next.processingSubState).toBe('generating');
        });

        it('clears sub-state when returning to IDLE', () => {
            context = spiralReducer(context, { type: 'START_PROCESSING' });
            context = spiralReducer(context, { type: 'START_RESPONDING' });
            const next = spiralReducer(context, { type: 'RESPONSE_COMPLETE' });
            expect(next.processingSubState).toBeNull();
        });
    });

    // ==========================================================================
    // Transition History Tests
    // ==========================================================================
    describe('Transition History', () => {
        it('records transition in history', () => {
            const next = spiralReducer(context, { type: 'START_LISTENING' });
            expect(next.transitionHistory.length).toBe(1);
            expect(next.transitionHistory[0].from).toBe('IDLE');
            expect(next.transitionHistory[0].to).toBe('LISTENING');
            expect(next.transitionHistory[0].event).toBe('START_LISTENING');
        });

        it('accumulates multiple transitions', () => {
            let ctx = context;
            ctx = spiralReducer(ctx, { type: 'START_LISTENING' });
            ctx = spiralReducer(ctx, { type: 'START_PROCESSING' });
            ctx = spiralReducer(ctx, { type: 'START_RESPONDING' });
            expect(ctx.transitionHistory.length).toBe(3);
        });

        it('caps history at 20 entries', () => {
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
        it('isProcessing returns true for PROCESSING, DELIBERATING, RESPONDING', () => {
            expect(isProcessing(spiralReducer(context, { type: 'START_PROCESSING' }))).toBe(true);

            let ctx = spiralReducer(context, { type: 'START_PROCESSING' });
            ctx = spiralReducer(ctx, { type: 'START_DELIBERATING' });
            expect(isProcessing(ctx)).toBe(true);

            ctx = spiralReducer(context, { type: 'START_PROCESSING' });
            ctx = spiralReducer(ctx, { type: 'START_RESPONDING' });
            expect(isProcessing(ctx)).toBe(true);
        });

        it('isListening returns true only for LISTENING', () => {
            expect(isListening(context)).toBe(false);
            expect(isListening(spiralReducer(context, { type: 'START_LISTENING' }))).toBe(true);
        });

        it('isCinematic returns true only for CINEMATIC', () => {
            expect(isCinematic(context)).toBe(false);
            expect(isCinematic(spiralReducer(context, { type: 'TRIGGER_CINEMATIC' }))).toBe(true);
        });

        it('isError returns true only for ERROR', () => {
            expect(isError(context)).toBe(false);
            let ctx = spiralReducer(context, { type: 'START_LISTENING' });
            ctx = spiralReducer(ctx, { type: 'ERROR', payload: { message: 'err' } });
            expect(isError(ctx)).toBe(true);
        });

        it('canStartProcessing returns true for IDLE and LISTENING', () => {
            expect(canStartProcessing(context)).toBe(true);
            expect(canStartProcessing(spiralReducer(context, { type: 'START_LISTENING' }))).toBe(true);
            expect(canStartProcessing(spiralReducer(context, { type: 'START_PROCESSING' }))).toBe(false);
        });

        it('canTriggerCinematic returns true for appropriate states', () => {
            expect(canTriggerCinematic(context)).toBe(true); // IDLE
            expect(canTriggerCinematic(spiralReducer(context, { type: 'START_PROCESSING' }))).toBe(true);
            expect(canTriggerCinematic(spiralReducer(context, { type: 'START_LISTENING' }))).toBe(false);
        });
    });

    // ==========================================================================
    // Debug Info Tests
    // ==========================================================================
    describe('Debug Helpers', () => {
        it('getStateDebugInfo returns valid JSON', () => {
            const debugInfo = getStateDebugInfo(context);
            expect(() => JSON.parse(debugInfo)).not.toThrow();
        });

        it('getStateDebugInfo includes current state', () => {
            const debugInfo = getStateDebugInfo(context);
            const parsed = JSON.parse(debugInfo);
            expect(parsed.state).toBe('IDLE');
        });
    });
});
