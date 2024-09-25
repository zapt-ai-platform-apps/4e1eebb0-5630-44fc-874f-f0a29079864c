import { pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const jokes = pgTable('jokes', {
  id: serial('id').primaryKey(),
  setup: text('setup').notNull(),
  punchline: text('punchline').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  userId: uuid('user_id').notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  projectIdea: text('project_idea').notNull(),
  aiResponse: text('ai_response').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  userId: uuid('user_id').notNull(),
});