import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, DollarSign, SaudiRiyal } from 'lucide-react-native';
import { useCurrency } from '@/lib/CurrencyContext';
import { Currency } from '@/lib/currency';

const SUPPORTED_CURRENCIES = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: <DollarSign size={20} color="#64748b" />,
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: <SaudiRiyal size={20} color="#64748b" />,
  },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'EGP' },
];

export default function CurrencySettings() {
  const [updating, setUpdating] = useState(false);
  const { preferredCurrency, setPreferredCurrency, loading } = useCurrency();

  async function updateCurrencyPreference(currency: Currency) {
    try {
      setUpdating(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First update user preference
      const { error: updateError } = await supabase
        .from('users')
        .update({
          currency_preference: currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update the global context
      setPreferredCurrency(currency);
      Alert.alert(
        'Success',
        'Currency preference updated. All amounts will be converted accordingly.'
      );
    } catch (error) {
      console.error('Error updating currency preference:', error);
      Alert.alert('Error', 'Failed to update currency preference');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Currency Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.description}>
          Select your preferred currency. All transaction amounts will be
          converted to this currency using real-time exchange rates.
        </Text>

        <View style={styles.currencyList}>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyOption,
                preferredCurrency === currency.code &&
                  styles.currencyOptionActive,
              ]}
              onPress={() =>
                updateCurrencyPreference(currency.code as Currency)
              }
              disabled={updating}
            >
              <View style={styles.currencyInfo}>
                <View style={styles.currencySymbol}>
                  {typeof currency.symbol === 'string' ? (
                    <Text style={styles.currencySymbolText}>
                      {currency.symbol}
                    </Text>
                  ) : (
                    currency.symbol
                  )}
                </View>
                <View>
                  <Text style={styles.currencyCode}>{currency.code}</Text>
                  <Text style={styles.currencyName}>{currency.name}</Text>
                </View>
              </View>
              {preferredCurrency === currency.code && (
                <View style={styles.selectedIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.note}>
          Note: Exchange rates are updated in real-time using ExchangeRate-API.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 24,
  },
  currencyList: {
    marginBottom: 24,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currencyOptionActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#0891b2',
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currencySymbolText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  currencyName: {
    fontSize: 14,
    color: '#64748b',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0891b2',
  },
  note: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
