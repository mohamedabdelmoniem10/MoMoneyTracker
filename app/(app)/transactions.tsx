import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Currency, convertAmount, formatAmount } from '@/lib/currency';
import { useRouter } from 'expo-router';

type Transaction = {
  id: string;
  amount: number;
  currency: Currency;
  description: string;
  type: 'income' | 'expense';
  date: string;
  category: {
    name: string;
    color: string;
  } | null;
  convertedAmount?: number;
};

export default function Transactions() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>('USD');
  const router = useRouter();

  // Use useFocusEffect to reload transactions when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTransactions();
    }, [])
  );

  async function loadTransactions() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's preferred currency
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('currency_preference')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const userCurrency = (userData?.currency_preference || 'USD') as Currency;
      setPreferredCurrency(userCurrency);

      // Get transactions
      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          id,
          amount,
          currency,
          description,
          type,
          date,
          category:categories (
            name,
            color
          )
        `
        )
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Convert amounts to preferred currency
      const convertedTransactions = await Promise.all(
        (data || []).map(async (transaction: any) => {
          const processedTransaction: Transaction = {
            id: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            type: transaction.type,
            date: transaction.date,
            category: transaction.category
              ? {
                  name: String(transaction.category.name),
                  color: String(transaction.category.color),
                }
              : null,
          };

          if (transaction.currency !== userCurrency) {
            try {
              const convertedAmount = await convertAmount(
                transaction.amount,
                transaction.currency,
                userCurrency,
                new Date(transaction.date)
              );
              return { ...processedTransaction, convertedAmount };
            } catch (error) {
              console.error('Error converting amount:', error);
              return processedTransaction;
            }
          }
          return {
            ...processedTransaction,
            convertedAmount: transaction.amount,
          };
        })
      );

      setTransactions(convertedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => router.push(`/transaction/${item.id}`)}
    >
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionDate}>
          {format(new Date(item.date), 'MMM d, yyyy')}
        </Text>
        {item.category && (
          <View
            style={[
              styles.categoryTag,
              { backgroundColor: item.category.color + '80' }, // Add transparency
            ]}
          >
            <Text style={styles.categoryText}>{item.category.name}</Text>
          </View>
        )}
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View>
          <Text
            style={[
              styles.transactionAmount,
              item.type === 'expense'
                ? styles.expenseAmount
                : styles.incomeAmount,
            ]}
          >
            {formatAmount(item.amount, item.currency)}
          </Text>
          {item.currency !== preferredCurrency && item.convertedAmount && (
            <Text style={styles.convertedAmount}>
              ≈ {formatAmount(item.convertedAmount, preferredCurrency)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first transaction to get started
            </Text>
          </View>
        }
      />
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  list: {
    padding: 20,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 14,
    color: '#64748b',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionDescription: {
    fontSize: 16,
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  expenseAmount: {
    color: '#ef4444',
  },
  incomeAmount: {
    color: '#10b981',
  },
  convertedAmount: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
});
