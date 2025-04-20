-- Seed default categories

-- Expense Categories
INSERT INTO categories (name, type, color, icon) VALUES
  ('Food & Dining', 'expense', '#ef4444', 'utensils'),
  ('Transportation', 'expense', '#f97316', 'car'),
  ('Shopping', 'expense', '#8b5cf6', 'shopping-bag'),
  ('Bills & Utilities', 'expense', '#3b82f6', 'file-text'),
  ('Housing', 'expense', '#10b981', 'home'),
  ('Healthcare', 'expense', '#14b8a6', 'heart'),
  ('Entertainment', 'expense', '#f59e0b', 'film'),
  ('Education', 'expense', '#6366f1', 'book-open'),
  ('Personal Care', 'expense', '#ec4899', 'user'),
  ('Travel', 'expense', '#0ea5e9', 'plane');

-- Income Categories
INSERT INTO categories (name, type, color, icon) VALUES
  ('Salary', 'income', '#22c55e', 'briefcase'),
  ('Investments', 'income', '#059669', 'trending-up'),
  ('Freelance', 'income', '#0d9488', 'code'),
  ('Business', 'income', '#0891b2', 'building'),
  ('Rental Income', 'income', '#6366f1', 'key'),
  ('Gifts', 'income', '#d946ef', 'gift'),
  ('Other Income', 'income', '#64748b', 'plus-circle');