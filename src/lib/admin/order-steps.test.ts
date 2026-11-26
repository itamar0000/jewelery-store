import { describe, expect, it } from 'vitest';

import {
  canCancel,
  canMarkPaid,
  canMarkRefunded,
  isStepMove,
  nextStep,
  nextStepHint,
  previousStatus,
  stageIndex,
  STAGES,
} from './order-steps';

describe('the order path', () => {
  it('offers one forward step from each working stage, ending at delivered', () => {
    expect(nextStep('PAID')?.toStatus).toBe('PROCESSING');
    expect(nextStep('PROCESSING')?.toStatus).toBe('READY');
    expect(nextStep('READY')?.toStatus).toBe('SHIPPED');
    expect(nextStep('SHIPPED')?.toStatus).toBe('DELIVERED');
    expect(nextStep('DELIVERED')).toBeNull();
    // Payment is a recorded fact, never a step button.
    expect(nextStep('PENDING_PAYMENT')).toBeNull();
    expect(nextStep('CANCELLED')).toBeNull();
  });

  it('steps back one stage, but never back into "awaiting payment"', () => {
    expect(previousStatus('READY')).toBe('PROCESSING');
    expect(previousStatus('PROCESSING')).toBe('PAID');
    expect(previousStatus('PAID')).toBeNull();
  });

  it('accepts exactly the moves the buttons offer', () => {
    expect(isStepMove('PAID', 'PROCESSING')).toBe(true);
    expect(isStepMove('READY', 'PROCESSING')).toBe(true);
    expect(isStepMove('PENDING_PAYMENT', 'SHIPPED')).toBe(false);
    expect(isStepMove('PROCESSING', 'DELIVERED')).toBe(false);
  });

  it('offers payment, cancel and refund only where they make sense', () => {
    expect(canMarkPaid('PENDING_PAYMENT', 'PENDING')).toBe(true);
    expect(canMarkPaid('CANCELLED', 'PENDING')).toBe(true);
    expect(canMarkPaid('CANCELLED', 'PAID')).toBe(false);
    expect(canMarkPaid('PROCESSING', 'PAID')).toBe(false);

    expect(canCancel('READY')).toBe(true);
    expect(canCancel('SHIPPED')).toBe(false);

    expect(canMarkRefunded('CANCELLED', 'PAID')).toBe(true);
    expect(canMarkRefunded('CANCELLED', 'PENDING')).toBe(false);
  });

  it('places every stage on the progress line, and cancelled orders off it', () => {
    STAGES.forEach((stage, index) => expect(stageIndex(stage.status)).toBe(index));
    expect(stageIndex('CANCELLED')).toBe(-1);
  });

  it('says what comes next in the list', () => {
    expect(nextStepHint('PAID', 'PAID')).toBe('הצעד הבא: התחלתי להכין');
    expect(nextStepHint('PENDING_PAYMENT', 'PENDING')).toBe('מחכה לתשלום');
    expect(nextStepHint('CANCELLED', 'PAID')).toBe('להחזיר כסף ללקוח');
    expect(nextStepHint('DELIVERED', 'PAID')).toBeNull();
  });
});
