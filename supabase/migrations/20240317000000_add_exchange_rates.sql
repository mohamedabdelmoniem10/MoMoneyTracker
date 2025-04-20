-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  date date NOT NULL,
  rate decimal NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS exchange_rates_currency_pair_date_idx ON exchange_rates (from_currency, to_currency, date);

-- Add a unique constraint to prevent duplicate rates for the same currency pair and date
ALTER TABLE exchange_rates
ADD CONSTRAINT exchange_rates_currency_pair_date_unique 
UNIQUE (from_currency, to_currency, date);

-- Add check constraint for supported currencies
ALTER TABLE exchange_rates
ADD CONSTRAINT exchange_rates_supported_currencies
CHECK (
  from_currency IN ('USD', 'SAR', 'EGP') AND
  to_currency IN ('USD', 'SAR', 'EGP')
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 