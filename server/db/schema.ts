import { pgTable, index, foreignKey, check, serial, integer, text, timestamp, boolean, unique, varchar, customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Custom type for pgvector
const vector = customType<{ data: number[] }>({
	dataType() {
		return 'vector(768)';
	},
});

// --- Existing Tables (Pulled from Neon) ---

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	email: text(),
	name: text(),
	credits: integer().default(3),
	subscriptionStatus: boolean("subscription_status").default(false), // Keeping old column for safety
	stripeCustomerId: text("stripe_customer_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	childName: text("child_name"),
	childAge: integer("child_age"),
	// Adding New Consent Columns (Required by your code)
	consentGiven: boolean("consent_given").default(false),
	consentImage: boolean("consent_image").default(false),
	consentVoice: boolean("consent_voice").default(false),
	consentPrivacy: boolean("consent_privacy").default(false),
	consentTimestamp: timestamp("consent_timestamp"),
	subscriptionCancelAtPeriodEnd: boolean("subscription_cancel_at_period_end").default(false),
}, (table) => [
	index("idx_users_clerk_id").using("btree", table.clerkId.asc().nullsLast().op("text_ops")),
	unique("users_clerk_id_key").on(table.clerkId),
]);

export const billingHistory = pgTable("billing_history", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	stripePaymentIntent: text("stripe_payment_intent"),
	amount: integer(),
	type: text(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_billing_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "billing_history_user_id_fkey"
	}).onDelete("cascade"),
	check("billing_history_type_check", sql`type = ANY (ARRAY['subscription'::text, 'topup'::text, 'trial'::text])`),
]);


export const books = pgTable("books", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	title: text(),
	protagonistName: text("protagonist_name"),
	theme: text(),
	location: text(),
	isFavorite: boolean("is_favorite").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	style: text(),
	borderStyle: text("border_style"),
	pageCount: integer("page_count").default(10),
	styleFilter: text("style_filter"),
	dedicatedBy: text("dedicated_by").default('Mummy and Daddy'),
	coverImageUrl: text("cover_image_url"),
	isPublic: boolean("is_public").default(false),
	embedding: vector("embedding"),
}, (table) => [
	index("idx_books_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "books_user_id_fkey"
	}).onDelete("cascade"),
]);

export const bookPages = pgTable("book_pages", {
	id: serial().primaryKey().notNull(),
	bookId: integer("book_id"),
	pageNumber: integer("page_number").notNull(),
	imageUrl: text("image_url"),
	content: text(),
	type: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	aiImageUrl: text("ai_image_url"),
	dedication: text(),
	audioUrl: text("audio_url"),
	imagePrompt: text("image_prompt"),
}, (table) => [
	index("idx_book_pages_book_id").using("btree", table.bookId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.bookId],
		foreignColumns: [books.id],
		name: "book_pages_book_id_fkey"
	}).onDelete("cascade"),
	check("book_pages_type_check", sql`type = ANY (ARRAY['title'::text, 'story'::text, 'conclusion'::text])`),
]);

// --- New Tables ---

export const authors = pgTable('authors', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	bio: text('bio'),
	createdAt: timestamp('created_at').defaultNow(),
});
// Add the new column