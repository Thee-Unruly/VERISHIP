import { StepActionType, SystemStepCategory, AssertionRule } from '@universal-qa/shared';

export interface RawRecordedEvent {
  actionType: StepActionType;
  tagName: string;
  role?: string;
  accessibleName?: string;
  label?: string;
  placeholder?: string;
  testId?: string;
  id?: string;
  cssSelector?: string;
  targetSelector?: string;
  text?: string;
  value?: string;
  inputType?: string;
  autocomplete?: string;
  pageUrl: string;
  pageTitle?: string;
  timestamp: number;
  isModal?: boolean;
  isToast?: boolean;
  isAssertion?: boolean;
  assertionRule?: AssertionRule;
}

export interface NormalizedStep {
  stepNumber: number;
  actionType: StepActionType;
  targetSelector: string;
  selectorType: 'aria' | 'label' | 'testid' | 'css';
  inputValue?: string;
  isSensitive?: boolean;
  isTruncated?: boolean;
  pageUrl: string;
  pageTitle?: string;
  systemCategory: SystemStepCategory;
  customTags: string[];
  isAssertion?: boolean;
  assertionRule?: AssertionRule;
  timestamp: number;
}

const MAX_INPUT_LENGTH = 2048;

export class EventFilter {
  /**
   * Builds the most resilient Playwright locator expression based on accessibility priority.
   */
  public static buildPlaywrightLocator(event: RawRecordedEvent): { locator: string; type: 'aria' | 'label' | 'testid' | 'css' } {
    if (event.testId) {
      return { locator: `page.getByTestId('${escapeString(event.testId)}')`, type: 'testid' };
    }
    if (event.role && event.accessibleName) {
      return {
        locator: `page.getByRole('${event.role}', { name: '${escapeString(event.accessibleName)}' })`,
        type: 'aria',
      };
    }
    if (event.label) {
      return { locator: `page.getByLabel('${escapeString(event.label)}')`, type: 'label' };
    }
    if (event.placeholder) {
      return { locator: `page.getByPlaceholder('${escapeString(event.placeholder)}')`, type: 'aria' };
    }
    if (event.text && ['button', 'a', 'span'].includes(event.tagName.toLowerCase())) {
      return { locator: `page.getByText('${escapeString(event.text.trim())}', { exact: true })`, type: 'aria' };
    }
    if (event.id) {
      return { locator: `page.locator('#${escapeString(event.id)}')`, type: 'css' };
    }
    return { locator: `page.locator('${escapeString(event.cssSelector || event.tagName)}')`, type: 'css' };
  }

  /**
   * Infers structural system categories from event attributes.
   */
  public static inferSystemCategory(event: RawRecordedEvent): SystemStepCategory {
    const url = (event.pageUrl || '').toLowerCase();
    const text = (event.text || event.accessibleName || event.label || '').toLowerCase();

    if (event.isToast || event.isAssertion) {
      return 'assertion';
    }
    if (event.isModal || text.includes('modal') || text.includes('dialog')) {
      return 'modal_flow';
    }
    if (url.includes('login') || url.includes('auth') || url.includes('signin') || text.includes('login') || text.includes('sign in') || text.includes('logout')) {
      return 'auth';
    }
    if (event.actionType === 'fill' || event.actionType === 'select') {
      return 'form_fill';
    }
    if (event.actionType === 'navigate') {
      return 'navigation';
    }
    return 'action_trigger';
  }

  /**
   * Normalizes and debounces raw event stream into discrete, clean steps.
   */
  public static normalizeEvents(events: RawRecordedEvent[]): NormalizedStep[] {
    const normalized: NormalizedStep[] = [];
    let currentStepNumber = 1;

    for (let i = 0; i < events.length; i++) {
      const current = events[i];

      // Debounce sequential keystrokes on the same input element
      if (current.actionType === 'fill') {
        let lastValue = current.value || '';
        let j = i + 1;
        while (
          j < events.length &&
          events[j].actionType === 'fill' &&
          events[j].targetSelector === current.targetSelector &&
          events[j].pageUrl === current.pageUrl
        ) {
          lastValue = events[j].value || '';
          j++;
        }
        i = j - 1; // Advance outer loop past debounced keystrokes

        const { locator, type } = this.buildPlaywrightLocator(current);
        const isTruncated = lastValue.length > MAX_INPUT_LENGTH;
        const finalValue = isTruncated ? lastValue.slice(0, MAX_INPUT_LENGTH) : lastValue;

        normalized.push({
          stepNumber: currentStepNumber++,
          actionType: 'fill',
          targetSelector: locator,
          selectorType: type,
          inputValue: finalValue,
          isTruncated,
          pageUrl: current.pageUrl,
          pageTitle: current.pageTitle,
          systemCategory: this.inferSystemCategory(current),
          customTags: [],
          timestamp: current.timestamp,
        });
        continue;
      }

      // Handle standard actions (click, select, navigate, assert, toast)
      const { locator, type } = this.buildPlaywrightLocator(current);
      const isTruncated = (current.value || '').length > MAX_INPUT_LENGTH;
      const finalValue = isTruncated ? (current.value || '').slice(0, MAX_INPUT_LENGTH) : current.value;

      normalized.push({
        stepNumber: currentStepNumber++,
        actionType: current.actionType,
        targetSelector: locator,
        selectorType: type,
        inputValue: finalValue,
        isTruncated,
        pageUrl: current.pageUrl,
        pageTitle: current.pageTitle,
        systemCategory: this.inferSystemCategory(current),
        customTags: [],
        isAssertion: current.isAssertion || current.isToast,
        assertionRule: current.assertionRule,
        timestamp: current.timestamp,
      });
    }

    return normalized;
  }
}

function escapeString(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, ' ');
}
