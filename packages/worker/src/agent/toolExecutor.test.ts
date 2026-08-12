import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_DEFS, TOOL_NAMES } from '@universal-qa/shared';

test('Tool contract test: TOOL_DEFS matches registered tool names', () => {
  const definedKeys = Object.keys(TOOL_DEFS);
  assert.equal(definedKeys.length, TOOL_NAMES.length);

  for (const toolName of TOOL_NAMES) {
    assert.ok(toolName in TOOL_DEFS, `Tool ${toolName} must be defined in TOOL_DEFS`);
    const def = TOOL_DEFS[toolName as keyof typeof TOOL_DEFS];
    assert.ok(def.handler, `Tool ${toolName} must specify a handler function`);
    assert.ok(def.schema, `Tool ${toolName} must specify a Zod validation schema`);
  }
});
