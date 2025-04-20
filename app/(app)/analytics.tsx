import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { PieChart } from 'react-native-chart-kit';
import { Currency, formatAmount } from '@/lib/currency';
import { useCurrency } from '@/lib/CurrencyContext';
import { useFocusEffect } from 'expo-router';

type Category = {
  id: string;
  name: string;
  color: string;
};

type Transaction = {
  id: string;
  amount: number;
  currency: Currency;
  type: 'income' | 'expense';
  date: string;
  category_id: string | null;
  categories: Category | null;
};

type CategoryTotal = {
  category: string;
  total: number;
  color: string;
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryTotal[]>(
    []
  );
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const { preferredCurrency, convertToPreferred } = useCurrency();

  useFocusEffect(
    React.useCallback(() => {
      fetchAnalytics();
    }, [preferredCurrency])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch transactions with their categories
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select(
          `
          id,
          amount,
          currency,
          type,
          date,
          category_id,
          categories:category_id (
            id,
            name,
            color
          )
        `
        )
        .eq('user_id', user.id)
        .returns<Transaction[]>();

      if (transactionError) throw transactionError;

      if (!transactions || transactions.length === 0) {
        setExpensesByCategory([]);
        setTotalExpenses(0);
        setTotalIncome(0);
        return;
      }

      // Process data for charts
      const categoryTotals: Record<string, CategoryTotal> = {};
      let totalExp = 0;
      let totalInc = 0;

      await Promise.all(
        transactions.map(async (transaction) => {
          const convertedAmount = await convertToPreferred(
            transaction.amount,
            transaction.currency as Currency,
            new Date(transaction.date)
          );

          if (transaction.type === 'expense') {
            totalExp += convertedAmount;
            const categoryName =
              transaction.categories?.name || 'Uncategorized';
            const categoryColor = transaction.categories?.color || '#cbd5e1';

            if (!categoryTotals[categoryName]) {
              categoryTotals[categoryName] = {
                category: categoryName,
                total: 0,
                color: categoryColor,
              };
            }
            categoryTotals[categoryName].total += convertedAmount;
          } else {
            totalInc += convertedAmount;
          }
        })
      );

      setExpensesByCategory(Object.values(categoryTotals));
      setTotalExpenses(totalExp);
      setTotalIncome(totalInc);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  const chartData = expensesByCategory.map((item) => ({
    name: item.category,
    total: item.total,
    color: item.color,
    legendFontColor: '#64748b',
    legendFontSize: 12,
  }));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.incomeCard]}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryAmount, styles.incomeAmount]}>
              {formatAmount(totalIncome, preferredCurrency)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.expenseCard]}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={[styles.summaryAmount, styles.expenseAmount]}>
              {formatAmount(totalExpenses, preferredCurrency)}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        ) : expensesByCategory.length > 0 ? (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Expenses by Category</Text>
            <PieChart
              data={chartData}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="total"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No expense data available</Text>
            <Text style={styles.emptyStateSubtext}>
              Add some transactions to see your spending patterns
            </Text>
          </View>
        )}

        <View style={styles.categoryList}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {expensesByCategory.map((category) => (
            <View key={category.category} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: category.color },
                  ]}
                />
                <Text style={styles.categoryName}>{category.category}</Text>
              </View>
              <Text style={styles.categoryAmount}>
                {formatAmount(category.total, preferredCurrency)}
              </Text>
            </View>
          ))}
        </View>
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
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
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
  content: {
    padding: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  summaryAmount: {
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  categoryList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    color: '#0f172a',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
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
    textAlign: 'center',
  },
});
