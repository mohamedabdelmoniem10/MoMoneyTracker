/*
  # Initial Schema for Money Tracker App

  1. Tables
    - users
      - id (uuid, primary key)
      - email (text)
      - created_at (timestamp)
      - updated_at (timestamp)
      - currency_preference (text)
      - theme_preference (text)
      
    - categories
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - name (text)
      - type (text) - income/expense
      - color (text)
      - icon (text)
      - parent_id (uuid, self-reference)
      - created_at (timestamp)
      
    - transactions
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - category_id (uuid, foreign key)
      - amount (decimal)
      - currency (text)
      - type (text) - income/expense
      - description (text)
      - date (timestamp)
      - payment_method (text)
      - created_at (timestamp)
      - updated_at (timestamp)
      
    - attachments
      - id (uuid, primary key)
      - transaction_id (uuid, foreign key)
      - url (text)
      - type (text)
      - created_at (timestamp)
      
    - budgets
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - category_id (uuid, foreign key)
      - amount (decimal)
      - currency (text)
      - period (text) - monthly/yearly
      - start_date (timestamp)
      - end_date (timestamp)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  currency_preference text DEFAULT 'USD',
  theme_preference text DEFAULT 'light'
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  color text NOT NULL,
  icon text,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name, parent_id)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  amount decimal NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  description text,
  date timestamptz DEFAULT now(),
  payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  amount decimal NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  period text NOT NULL CHECK (period IN ('monthly', 'yearly')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, category_id, period, start_date)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can access their own categories" ON categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own attachments" ON attachments
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM transactions WHERE id = transaction_id
    )
  );

CREATE POLICY "Users can access their own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id);