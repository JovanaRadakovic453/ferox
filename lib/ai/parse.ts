type ContentBlock = { type: string; text?: string }

/** Pull the first text block from an Anthropic message and strip ```json fences.
 *  Hardened against the old `content[0]` assumption (could be a non-text block). */
export function extractText(message: { content: ContentBlock[] }): string | null {
  const block = message.content.find(c => c.type === 'text')
  if (!block?.text) return null
  return block.text.replace(/```json\n?|\n?```/g, '').trim()
}
