import { enMessages, type MessageKey } from './messages.en';
import { buildTypedPseudolocaleDictionary } from './pseudolocalize';

/** QA-only pseudolocale. It is derived deterministically and is never persisted. */
export const qpsMessages: Record<MessageKey, string> = buildTypedPseudolocaleDictionary(enMessages);
