import { supabase } from './supabase';

export type Currency = 'USD' | 'SAR' | 'EGP';

interface ExchangeRates {
  [date: string]: {
    [fromCurrency in Currency]?: {
      [toCurrency in Currency]?: {
        rate: number;
        timestamp: number;
      };
    };
  };
}

// Cache exchange rates for better performance
const exchangeRatesCache: ExchangeRates = {};

// Cache expiration time (6 hours in milliseconds)
const CACHE_EXPIRATION = 6 * 60 * 60 * 1000;

// Rate limiting
const API_CALLS: { timestamp: number }[] = [];
const MAX_CALLS_PER_MINUTE = 30;
const ONE_MINUTE = 60 * 1000;

const API_KEY = 'f9a58f72ab3a0f83d914574b';
const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';

/**
 * Check if we can make an API call based on rate limiting
 */
function canMakeApiCall(): boolean {
  const now = Date.now();
  // Remove calls older than 1 minute
  while (API_CALLS.length > 0 && now - API_CALLS[0].timestamp > ONE_MINUTE) {
    API_CALLS.shift();
  }
  return API_CALLS.length < MAX_CALLS_PER_MINUTE;
}

/**
 * Get the exchange rate for a specific date and currency pair
 */
export async function getExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency,
  date: Date
): Promise<number> {
  if (fromCurrency === toCurrency) return 1;

  const dateStr = date.toISOString().split('T')[0];
  const now = Date.now();

  // Check cache first
  if (
    exchangeRatesCache[dateStr]?.[fromCurrency]?.[toCurrency]?.rate &&
    now - exchangeRatesCache[dateStr][fromCurrency][toCurrency].timestamp <
      CACHE_EXPIRATION
  ) {
    return exchangeRatesCache[dateStr][fromCurrency][toCurrency].rate;
  }

  try {
    // Get exchange rate from the database first
    const { data: dbRate, error: dbError } = await supabase
      .from('exchange_rates')
      .select('rate, updated_at')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .eq('date', dateStr)
      .single();

    if (!dbError && dbRate) {
      const updatedAt = new Date(dbRate.updated_at).getTime();
      if (now - updatedAt < CACHE_EXPIRATION) {
        // Cache the result
        if (!exchangeRatesCache[dateStr]) {
          exchangeRatesCache[dateStr] = {};
        }
        if (!exchangeRatesCache[dateStr][fromCurrency]) {
          exchangeRatesCache[dateStr][fromCurrency] = {} as {
            [key in Currency]?: { rate: number; timestamp: number };
          };
        }
        exchangeRatesCache[dateStr][fromCurrency][toCurrency] = {
          rate: dbRate.rate,
          timestamp: now,
        };
        return dbRate.rate;
      }
    }

    // Check rate limiting before making API call
    if (!canMakeApiCall()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Add timestamp for rate limiting
    API_CALLS.push({ timestamp: now });

    // If no rate found in DB or rate is expired, fetch from API
    const response = await fetch(
      `${API_BASE_URL}/${API_KEY}/latest/${fromCurrency}`
    );
    const data = await response.json();

    if (data.result === 'error') {
      throw new Error(`API Error: ${data['error-type']}`);
    }

    const rate = data.conversion_rates[toCurrency];
    if (!rate) {
      throw new Error(`No conversion rate found for ${toCurrency}`);
    }

    // Store or update the rate in the database using upsert
    const { error: upsertError } = await supabase.from('exchange_rates').upsert(
      {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        date: dateStr,
        rate,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'from_currency,to_currency,date',
      }
    );

    if (upsertError) {
      console.error('Error storing exchange rate:', upsertError);
    }

    // Cache the result
    if (!exchangeRatesCache[dateStr]) {
      exchangeRatesCache[dateStr] = {};
    }
    if (!exchangeRatesCache[dateStr][fromCurrency]) {
      exchangeRatesCache[dateStr][fromCurrency] = {} as {
        [key in Currency]?: { rate: number; timestamp: number };
      };
    }
    exchangeRatesCache[dateStr][fromCurrency][toCurrency] = {
      rate,
      timestamp: now,
    };

    return rate;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to get exchange rate');
  }
}

/**
 * Convert an amount from one currency to another
 */
export async function convertAmount(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  date: Date
): Promise<number> {
  try {
    const rate = await getExchangeRate(fromCurrency, toCurrency, date);
    return amount * rate;
  } catch (error) {
    console.error('Error converting amount:', error);
    throw new Error('Failed to convert amount');
  }
}

/**
 * Format an amount with its currency symbol
 */
export function formatAmount(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}
