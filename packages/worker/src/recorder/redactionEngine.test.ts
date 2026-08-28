import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RedactionEngine, calculateEntropy, isLuhnValid } from './redactionEngine';
import { EventFilter, RawRecordedEvent } from './eventFilter';

describe('Redaction Engine', () => {
  const engine = new RedactionEngine(['employee_tax_id', 'ssn_custom']);

  it('should calculate Shannon entropy correctly', () => {
    assert.strictEqual(calculateEntropy(''), 0);
    assert.strictEqual(calculateEntropy('aaaa'), 0);
    const highEntropy = calculateEntropy('4fG9!kL2@pZ8#wQ1$vB7%mN3^');
    assert.ok(highEntropy > 4.0, `Expected entropy > 4.0, got ${highEntropy}`);
  });

  it('should accurately validate credit cards via Luhn algorithm', () => {
    assert.strictEqual(isLuhnValid('49927398716'), true);
    assert.strictEqual(isLuhnValid('49927398717'), false);
    assert.strictEqual(isLuhnValid('123'), false);
  });

  it('should redact password inputs based on type and name', () => {
    const res1 = engine.checkAndRedact('password', 'password', '', 'SuperSecret123!');
    assert.strictEqual(res1.isSensitive, true);
    assert.strictEqual(res1.value, '[REDACTED:PASSWORD]');

    const res2 = engine.checkAndRedact('user_token', 'text', '', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    assert.strictEqual(res2.isSensitive, true);
    assert.strictEqual(res2.value, '[REDACTED:SECRET]');
  });

  it('should redact custom workspace patterns', () => {
    const res = engine.checkAndRedact('employee_tax_id', 'text', '', '999-88-7777');
    assert.strictEqual(res.isSensitive, true);
    assert.strictEqual(res.value, '[REDACTED:CUSTOM_SENSITIVE]');
  });

  it('should NOT falsely redact standard UUIDs, emails, or slugs', () => {
    const uuidRes = engine.checkAndRedact('item_id', 'text', '', '550e8400-e29b-41d4-a716-446655440000');
    assert.strictEqual(uuidRes.isSensitive, false);

    const emailRes = engine.checkAndRedact('email', 'text', '', 'qa.engineer@company.org');
    assert.strictEqual(emailRes.isSensitive, false);

    const slugRes = engine.checkAndRedact('slug', 'text', '', 'implement-sso-auth-flow');
    assert.strictEqual(slugRes.isSensitive, false);
  });
});

describe('Event Filter & Locator Builder', () => {
  it('should prioritize getByTestId and getByRole over generic CSS', () => {
    const event1: RawRecordedEvent = {
      actionType: 'click',
      tagName: 'button',
      testId: 'submit-task-btn',
      role: 'button',
      accessibleName: 'Submit Task',
      pageUrl: 'https://agilepm.io/tasks',
      timestamp: Date.now(),
    };
    const loc1 = EventFilter.buildPlaywrightLocator(event1);
    assert.strictEqual(loc1.locator, "page.getByTestId('submit-task-btn')");
    assert.strictEqual(loc1.type, 'testid');

    const event2: RawRecordedEvent = {
      actionType: 'click',
      tagName: 'button',
      role: 'button',
      accessibleName: 'Save Changes',
      pageUrl: 'https://agilepm.io/tasks',
      timestamp: Date.now(),
    };
    const loc2 = EventFilter.buildPlaywrightLocator(event2);
    assert.strictEqual(loc2.locator, "page.getByRole('button', { name: 'Save Changes' })");
    assert.strictEqual(loc2.type, 'aria');
  });

  it('should debounce sequential typing on the same element', () => {
    const rawEvents: RawRecordedEvent[] = [
      { actionType: 'fill', tagName: 'input', label: 'Title', value: 'T', pageUrl: 'https://agilepm.io', timestamp: 100 },
      { actionType: 'fill', tagName: 'input', label: 'Title', value: 'Ta', pageUrl: 'https://agilepm.io', timestamp: 200 },
      { actionType: 'fill', tagName: 'input', label: 'Title', value: 'Task 1', pageUrl: 'https://agilepm.io', timestamp: 300 },
    ];

    const normalized = EventFilter.normalizeEvents(rawEvents);
    assert.strictEqual(normalized.length, 1);
    assert.strictEqual(normalized[0].inputValue, 'Task 1');
    assert.strictEqual(normalized[0].actionType, 'fill');
  });
});
