import { Page } from 'playwright';
import { validateToolCall, TOOL_DEFS } from '@universal-qa/shared';

export interface ExecutionResult {
  success: boolean;
  message: string;
  recovered?: boolean;
}

export class ToolExecutor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async execute(fnName: string, rawArgs: Record<string, any>): Promise<ExecutionResult> {
    const args = validateToolCall(fnName, rawArgs) as Record<string, any>;

    switch (fnName) {
      case 'navigate_to':
        return this.navigateTo(args.url);
      case 'click_element':
        return this.clickElement(args.role, args.name);
      case 'fill_input':
        return this.fillInput(args.label, args.value);
      case 'select_dropdown':
        return this.selectDropdown(args.label, args.option);
      case 'assert_condition':
        return this.assertCondition(args.assertion_type, args.expected_value);
      case 'finish_test':
        return this.finishTest(args.summary);
      default:
        throw new Error(`Unimplemented tool handler for ${fnName}`);
    }
  }

  private async navigateTo(url: string): Promise<ExecutionResult> {
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    return { success: true, message: `Navigated successfully to ${url}` };
  }

  private async clickElement(role: string, name: string): Promise<ExecutionResult> {
    try {
      await this.page.getByRole(role as any, { name, exact: false }).click({ timeout: 5000 });
      return { success: true, message: `Clicked element with role '${role}' and name '${name}'` };
    } catch {
      // Alternate Recovery Strategy: Text-based locator fallback
      await this.page.getByText(name, { exact: false }).click({ timeout: 5000 });
      return {
        success: true,
        message: `Clicked element using alternate text fallback '${name}'`,
        recovered: true,
      };
    }
  }

  private async fillInput(label: string, value: string): Promise<ExecutionResult> {
    try {
      await this.page.getByLabel(label, { exact: false }).fill(value, { timeout: 5000 });
      return { success: true, message: `Filled input '${label}' with value '${value}'` };
    } catch {
      // Fallback: Placeholder or test-id
      await this.page.getByPlaceholder(label, { exact: false }).fill(value, { timeout: 5000 });
      return {
        success: true,
        message: `Filled input via placeholder fallback '${label}'`,
        recovered: true,
      };
    }
  }

  private async selectDropdown(label: string, option: string): Promise<ExecutionResult> {
    const locator = this.page.getByLabel(label, { exact: false });
    let isNativeSelect = false;

    try {
      isNativeSelect = (await locator.evaluate((el) => el.tagName)) === 'SELECT';
    } catch {
      isNativeSelect = false;
    }

    if (isNativeSelect) {
      await locator.selectOption({ label: option });
      return { success: true, message: `Selected option '${option}' in native select '${label}'` };
    } else {
      // ARIA Combobox Pattern: Click to open dropdown, then click option by role
      await locator.click({ timeout: 5000 });
      await this.page.getByRole('option', { name: option }).click({ timeout: 5000 });
      return {
        success: true,
        message: `Selected option '${option}' in ARIA combobox '${label}'`,
        recovered: true,
      };
    }
  }

  private async assertCondition(assertionType: string, expectedValue: string): Promise<ExecutionResult> {
    if (assertionType === 'body_exists') {
      const exists = (await this.page.locator('body').count()) > 0;
      if (!exists) throw new Error('Body tag missing from page');
      return { success: true, message: 'Verified body tag exists on page' };
    }

    await this.page.getByText(expectedValue, { exact: false }).waitFor({ timeout: 5000 });
    return { success: true, message: `Asserted condition: text '${expectedValue}' is present on page` };
  }

  private async finishTest(summary: string): Promise<ExecutionResult> {
    return { success: true, message: `Finished test: ${summary}` };
  }
}
