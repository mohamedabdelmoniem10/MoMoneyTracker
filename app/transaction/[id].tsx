import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Tag, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { Currency, formatAmount } from '@/lib/currency';
import { useCurrency } from '@/lib/CurrencyContext';

type RawDatabaseTransaction = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  type: string;
  date: string;
  category: {
    name: string;
    color: string;
  } | null;
};

type DatabaseTransaction = {
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
};

type Transaction = DatabaseTransaction & {
  convertedAmount?: number;
};

export default function TransactionDetails() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const { preferredCurrency, convertToPreferred } = useCurrency();

  useEffect(() => {
    loadTransaction();
  }, [id]);

  async function loadTransaction() {
    try {
      setLoading(true);
      const { data: rawData, error } = await supabase
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
        .eq('id', id)
        .single();

      if (error) throw error;

      if (rawData) {
        const raw = rawData as unknown as RawDatabaseTransaction;
        // Process the raw data into the correct shape
        const data: DatabaseTransaction = {
          id: raw.id,
          amount: Number(raw.amount),
          currency: raw.currency as Currency,
          description: String(raw.description),
          type: raw.type as 'income' | 'expense',
          date: String(raw.date),
          category: raw.category,
        };

        // Convert amount if necessary
        const convertedAmount = await convertToPreferred(
          data.amount,
          data.currency,
          new Date(data.date)
        );

        setTransaction({
          ...data,
          convertedAmount,
        });
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
      Alert.alert('Error', 'Failed to load transaction details');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

              if (error) throw error;

              router.replace('/transactions');
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.container}>
        <Text>Transaction not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.title}>Transaction Details</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.amountCard}>
            <Text
              style={[
                styles.amount,
                transaction.type === 'expense'
                  ? styles.expenseAmount
                  : styles.incomeAmount,
              ]}
            >
              {formatAmount(transaction.amount, transaction.currency)}
            </Text>
            {transaction.currency !== preferredCurrency && (
              <Text style={styles.convertedAmount}>
                ≈{' '}
                {formatAmount(transaction.convertedAmount!, preferredCurrency)}
              </Text>
            )}
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Calendar size={20} color="#64748b" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {format(new Date(transaction.date), 'MMMM d, yyyy')}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Tag size={20} color="#64748b" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Category</Text>
                <View style={styles.categoryContainer}>
                  {transaction.category && (
                    <View
                      style={[
                        styles.categoryTag,
                        { backgroundColor: transaction.category.color + '80' },
                      ]}
                    >
                      <Text style={styles.categoryText}>
                        {transaction.category.name}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>
                  {transaction.description}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete Transaction</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
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
    padding: 20,
  },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expenseAmount: {
    color: '#ef4444',
  },
  incomeAmount: {
    color: '#10b981',
  },
  convertedAmount: {
    fontSize: 18,
    color: '#64748b',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
