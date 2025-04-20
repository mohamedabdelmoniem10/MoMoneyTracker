import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Currency, convertAmount } from './currency';

interface CurrencyContextType {
  preferredCurrency: Currency;
  setPreferredCurrency: (currency: Currency) => void;
  convertToPreferred: (
    amount: number,
    fromCurrency: Currency,
    date: Date
  ) => Promise<number>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserPreference();
  }, []);

  async function loadUserPreference() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('currency_preference')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.currency_preference) {
        setPreferredCurrency(data.currency_preference as Currency);
      }
    } catch (error) {
      console.error('Error loading currency preference:', error);
    } finally {
      setLoading(false);
    }
  }

  async function convertToPreferred(
    amount: number,
    fromCurrency: Currency,
    date: Date
  ) {
    if (fromCurrency === preferredCurrency) return amount;
    return await convertAmount(amount, fromCurrency, preferredCurrency, date);
  }

  return (
    <CurrencyContext.Provider
      value={{
        preferredCurrency,
        setPreferredCurrency,
        convertToPreferred,
        loading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
