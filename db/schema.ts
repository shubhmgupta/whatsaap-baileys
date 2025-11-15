import { pgTable, serial, text, timestamp, integer, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed']);

export const plans = pgTable('plans', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    credits: integer('credits').notNull(),
    features: text('features'), // JSON string array of features/bullet points
    discountPercentage: integer('discount_percentage').default(0),
    discountLabel: text('discount_label'),
    active: boolean('active').default(true),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullname: text('fullname').notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  phoneNumber: text('phone_number').unique(),
  whatsappSession: text('whatsapp_session'),
  credits: integer('credits').default(0),
  role: userRoleEnum('role').default('user'),
  planId: integer('plan_id').references(() => plans.id),
  paymentGatewayEnabled: boolean('payment_gateway_enabled').default(false),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const verificationTokens = pgTable('verification_tokens', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    token: text('token').unique(),
    expiresAt: timestamp('expires_at'),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    token: text('token').unique(),
    expiresAt: timestamp('expires_at'),
});

export const apiTokens = pgTable('api_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  token: text('token').unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = pgTable('payments', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    planId: integer('plan_id').references(() => plans.id),
    amount: integer('amount').notNull(),
    status: paymentStatusEnum('status').default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  phoneNumber: text('phone_number').notNull(),
  name: text('name'),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  phoneNumber: text('phone_number').notNull(),
  message: text('message'),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'),
  isFromMe: boolean('is_from_me').default(true),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  message: text('message'),
  sentAt: timestamp('sent_at').defaultNow(),
  receivedAt: timestamp('received_at'),
});