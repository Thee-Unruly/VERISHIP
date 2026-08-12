import { LLMMessage } from '../llm/llmAdapter';

const DEFAULT_MAX_FULL_SNAPSHOTS = 3;

export function trimContext(
  messages: LLMMessage[],
  maxFullSnapshots: number = DEFAULT_MAX_FULL_SNAPSHOTS
): LLMMessage[] {
  const snapshotIndices: number[] = [];

  messages.forEach((msg, idx) => {
    if (msg._type === 'snapshot') {
      snapshotIndices.push(idx);
    }
  });

  if (snapshotIndices.length <= maxFullSnapshots) {
    return messages;
  }

  // Identify indices that exceed the rolling window
  const indicesToSummarize = snapshotIndices.slice(0, snapshotIndices.length - maxFullSnapshots);

  const trimmed = [...messages];
  for (const idx of indicesToSummarize) {
    const original = trimmed[idx];
    const stepNum = original._step || '?';
    const actionTaken = original._action_taken || 'Executed action';

    trimmed[idx] = {
      role: 'user',
      content: `[Step ${stepNum} snapshot summarized: action taken was ${actionTaken}]`,
      _type: 'step',
      _step: original._step,
      _action_taken: actionTaken,
    };
  }

  return trimmed;
}
