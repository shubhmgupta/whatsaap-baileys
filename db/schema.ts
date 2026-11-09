import { mysqlTable, int, text, varchar, timestamp, mysqlEnum, boolean } from 'drizzle-orm/mysql-core';

export const userRoleEnum = mysqlEnum('role', ['admin', 'user']);
export const paymentStatusEnum = mysqlEnum('status', ['pending', 'completed', 'failed']);

export const plans = mysqlTable('plans', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: int('price').notNull(),
  credits: int('credits').notNull(),
  features: text('features'), // JSON string array of features/bullet points
  discountPercentage: int('discount_percentage').default(0),
  discountLabel: varchar('discount_label', { length: 255 }),
  active: boolean('active').default(true),
});

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  fullname: varchar('fullname', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).unique(),
  whatsappSession: text('whatsapp_session'),
  credits: int('credits').default(0),
  role: userRoleEnum.default('user'),
  planId: int('plan_id').references(() => plans.id),
  paymentGatewayEnabled: boolean('payment_gateway_enabled').default(false),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const verificationTokens = mysqlTable('verification_tokens', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id),
  token: varchar('token', { length: 255 }).unique(),
  expiresAt: timestamp('expires_at'),
});

export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id),
  token: varchar('token', { length: 255 }).unique(),
  expiresAt: timestamp('expires_at'),
});

export const apiTokens = mysqlTable('api_tokens', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id),
  token: varchar('token', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = mysqlTable('payments', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id),
  planId: int('plan_id').references(() => plans.id),
  amount: int('amount').notNull(),
  status: paymentStatusEnum.default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contacts = mysqlTable('contacts', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatMessages = mysqlTable('chat_messages', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id).notNull(),
  contactId: int('contact_id').references(() => contacts.id).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  message: text('message'),
  mediaUrl: text('media_url'),
  mediaType: varchar('media_type', { length: 100 }),
  isFromMe: boolean('is_from_me').default(true),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const messages = mysqlTable('messages', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id),
  message: text('message'),
  sentAt: timestamp('sent_at').defaultNow(),
  receivedAt: timestamp('received_at'),
});
