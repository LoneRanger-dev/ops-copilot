import type { Tables } from '@/lib/db/types';

export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;
export type Attachment = Tables<'attachments'>;
export type ConversationSummary = Tables<'conversation_summaries'>;
export type UserMemory = Tables<'user_memory'>;
