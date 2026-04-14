import { relations } from "drizzle-orm/relations";
import { users, billingHistory, books, bookPages } from "./schema";

export const billingHistoryRelations = relations(billingHistory, ({one}) => ({
	user: one(users, {
		fields: [billingHistory.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	billingHistories: many(billingHistory),
	books: many(books),
}));

export const booksRelations = relations(books, ({one, many}) => ({
	user: one(users, {
		fields: [books.userId],
		references: [users.id]
	}),
	bookPages: many(bookPages),
}));

export const bookPagesRelations = relations(bookPages, ({one}) => ({
	book: one(books, {
		fields: [bookPages.bookId],
		references: [books.id]
	}),
}));