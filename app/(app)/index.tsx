import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useCurrency } from '@/lib/CurrencyContext';
import { Currency, formatAmount } from '@/lib/currency';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { router, useFocusEffect } from 'expo-router';

type Summary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    currency: Currency;
    type: 'income' | 'expense';
    description: string;
    date: string;
    convertedAmount?: number;
  }>;
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    recentTransactions: [],
  });

  const { preferredCurrency, convertToPreferred } = useCurrency();

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [preferredCurrency])
  );

  async function loadData() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get all transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Convert amounts and calculate totals
      let totalIncome = 0;
      let totalExpense = 0;

      const processedTransactions = await Promise.all(
        (transactions || []).map(async (transaction) => {
          const convertedAmount = await convertToPreferred(
            transaction.amount,
            transaction.currency,
            new Date(transaction.date)
          );

          if (transaction.type === 'income') {
            totalIncome += convertedAmount;
          } else {
            totalExpense += convertedAmount;
          }

          return {
            ...transaction,
            convertedAmount,
          };
        })
      );

      setSummary({
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        recentTransactions: processedTransactions.slice(0, 5),
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  const getChartData = () => {
    if (summary.recentTransactions.length === 0) {
      // Return dummy data if no transactions
      return {
        labels: ['Today'],
        datasets: [{ data: [0] }],
      };
    }

    const dates = summary.recentTransactions
      .slice()
      .reverse()
      .reduce((acc: { [key: string]: number }, transaction) => {
        const date = new Date(transaction.date).toLocaleDateString();
        const amount = transaction.convertedAmount || 0;
        acc[date] =
          (acc[date] || 0) + (transaction.type === 'income' ? amount : -amount);
        return acc;
      }, {});

    let balance = 0;
    const labels: string[] = [];
    const data: number[] = [];

    Object.entries(dates).forEach(([date, change]) => {
      balance += change;
      // Ensure we don't add any invalid numbers
      if (isFinite(balance)) {
        labels.push(date);
        data.push(balance);
      }
    });

    // If somehow we still have no valid data points
    if (data.length === 0) {
      return {
        labels: ['Today'],
        datasets: [{ data: [0] }],
      };
    }

    return {
      labels,
      datasets: [{ data }],
    };
  };

  const chartData = getChartData();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>
          {formatAmount(summary.balance, preferredCurrency)}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.incomeCard]}>
          <View style={styles.statHeader}>
            <ArrowUpRight size={20} color="#10b981" />
            <Text style={styles.statLabel}>Income</Text>
          </View>
          <Text style={[styles.statAmount, styles.incomeAmount]}>
            {formatAmount(summary.totalIncome, preferredCurrency)}
          </Text>
        </View>

        <View style={[styles.statCard, styles.expenseCard]}>
          <View style={styles.statHeader}>
            <ArrowDownRight size={20} color="#ef4444" />
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
          <Text style={[styles.statAmount, styles.expenseAmount]}>
            {formatAmount(summary.totalExpense, preferredCurrency)}
          </Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Income vs Expenses</Text>
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 40}
          height={220}
          yAxisLabel={preferredCurrency === 'USD' ? '$' : ''}
          yAxisSuffix={
            preferredCurrency !== 'USD' ? ` ${preferredCurrency}` : ''
          }
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#0891b2',
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>

      <View style={styles.recentTransactions}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {summary.recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first transaction to get started
            </Text>
          </View>
        ) : (
          summary.recentTransactions.map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              style={styles.transactionItem}
              onPress={() => router.push(`/transaction/${transaction.id}`)}
            >
              <View>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.date).toLocaleDateString()}
                </Text>
              </View>
              <View>
                <Text
                  style={[
                    styles.transactionAmount,
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
                    {formatAmount(
                      transaction.convertedAmount!,
                      preferredCurrency
                    )}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
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
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  balanceCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#0891b2',
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#e0f2fe',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '600',
  },
  incomeAmount: {
    color: '#10b981',
  },
  expenseAmount: {
    color: '#ef4444',
  },
  chartCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  recentTransactions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionDescription: {
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#64748b',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
