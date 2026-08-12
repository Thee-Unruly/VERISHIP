import { z } from 'zod';

export const TOOL_NAMES = [
  'navigate_to',
  'click_element',
  'fill_input',
  'select_dropdown',
  'assert_condition',
  'finish_test',
] as const;

export type ToolName = typeof TOOL_NAMES[number];

export const TOOL_SCHEMAS = {
  navigate_to: z.object({
    url: z.string().url(),
  }),
  click_element: z.object({
    role: z.string(),
    name: z.string(),
  }),
  fill_input: z.object({
    label: z.string(),
    value: z.string(),
  }),
  select_dropdown: z.object({
    label: z.string(),
    option: z.string(),
  }),
  assert_condition: z.object({
    assertion_type: z.string(),
    expected_value: z.string(),
  }),
  finish_test: z.object({
    summary: z.string(),
    status: z.enum(['PASSED', 'FAILED']).optional(),
  }),
};

export const TOOL_DEFS = {
  navigate_to: {
    description: 'Navigate browser to a specified HTTP/HTTPS target URL',
    params: { url: 'string' },
    handler: 'navigateTo',
    schema: TOOL_SCHEMAS.navigate_to,
  },
  click_element: {
    description: 'Click an element identified by its ARIA role and accessible name',
    params: { role: 'string', name: 'string' },
    handler: 'clickElement',
    schema: TOOL_SCHEMAS.click_element,
  },
  fill_input: {
    description: 'Fill an input field associated with a label or placeholder with a given text value',
    params: { label: 'string', value: 'string' },
    handler: 'fillInput',
    schema: TOOL_SCHEMAS.fill_input,
  },
  select_dropdown: {
    description: 'Select an option from a native HTML select or ARIA combobox dropdown by label and option text',
    params: { label: 'string', option: 'string' },
    handler: 'selectDropdown',
    schema: TOOL_SCHEMAS.select_dropdown,
  },
  assert_condition: {
    description: 'Assert that a condition or visual text state is present on the page',
    params: { assertion_type: 'string', expected_value: 'string' },
    handler: 'assertCondition',
    schema: TOOL_SCHEMAS.assert_condition,
  },
  finish_test: {
    description: 'Complete the QA test execution with a final summary and result',
    params: { summary: 'string' },
    handler: 'finishTest',
    schema: TOOL_SCHEMAS.finish_test,
  },
} as const;

export function validateToolCall(name: string, args: unknown) {
  if (!(name in TOOL_SCHEMAS)) {
    throw new Error(`Unknown tool name: ${name}`);
  }
  const toolKey = name as keyof typeof TOOL_SCHEMAS;
  return TOOL_SCHEMAS[toolKey].parse(args);
}
