import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardType,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ChevronDown,
  Calendar,
  DollarSign,
  SaudiRiyal,
  Banknote,
} from 'lucide-react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';

type TransactionType = 'income' | 'expense';

export default function AddTransaction() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; color: string; type: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [type]);

  async function fetchCategories() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color, type')
        .eq('type', type);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  const currencies = [
    { code: 'USD', symbol: <DollarSign color={'#64748b'} /> },
    { code: 'SAR', symbol: <SaudiRiyal color={'#64748b'} /> },
    { code: 'EGP', symbol: 'EGP' },
  ];

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setType('expense');
    setCategory(null);
    setCurrency('USD');
    setError(null);
  };

  const handleAmountChange = (text: string) => {
    // Remove any non-numeric characters except decimal point
    const numericValue = text.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }

    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }

    setAmount(numericValue);
  };

  async function handleSubmit() {
    try {
      setLoading(true);
      setError(null);

      if (!amount || !description) {
        throw new Error('Please fill in all required fields');
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          description,
          type,
          category_id: category?.id,
          currency,
          date: date.toISOString(),
        });

      if (transactionError) throw transactionError;

      resetForm();
      router.push('/transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Transaction</Text>
      </View>

      <View style={styles.form}>
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.amountContainer}>
          <TouchableOpacity
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            style={styles.currencySelector}
          >
            <Text style={styles.currencySymbol}>
              {currencies.find((c) => c.code === currency)?.symbol}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholderTextColor="#94a3b8"
            maxLength={10}
          />
        </View>

        {showCurrencyPicker && (
          <View style={styles.currencyPicker}>
            {currencies.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={styles.currencyOption}
                onPress={() => {
                  setCurrency(c.code);
                  setShowCurrencyPicker(false);
                }}
              >
                <Text style={styles.currencyOptionText}>
                  {c.symbol} {c.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'expense' && styles.typeButtonActive,
            ]}
            onPress={() => setType('expense')}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === 'expense' && styles.typeButtonTextActive,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'income' && styles.typeButtonActive,
            ]}
            onPress={() => setType('income')}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === 'income' && styles.typeButtonTextActive,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.inputContent}>
            <View style={styles.categoryDisplay}>
              {category && (
                <View
                  style={[
                    styles.categoryIndicator,
                    { backgroundColor: category.color },
                  ]}
                />
              )}
              <Text style={styles.inputText}>
                {category?.name || 'Select category'}
              </Text>
            </View>
            <ChevronDown size={20} color="#64748b" />
          </View>
        </TouchableOpacity>

        {showCategoryPicker && (
          <View style={styles.categoryPicker}>
            <ScrollView
              style={styles.categoryScroll}
              showsVerticalScrollIndicator={false}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryOption}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                >
                  <View style={styles.categoryOptionContent}>
                    <View
                      style={[
                        styles.categoryIndicator,
                        { backgroundColor: cat.color },
                      ]}
                    />
                    <Text style={styles.categoryOptionText}>{cat.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity
          style={styles.input}
          onPress={() => {
            if (Platform.OS === 'ios') {
              setShowDatePicker(true);
            } else {
              setShowDatePicker(true);
            }
          }}
        >
          <Text style={styles.inputLabel}>Date</Text>
          <View style={styles.inputContent}>
            <Calendar size={20} color="#64748b" />
            <Text style={styles.inputText}>
              {format(date, 'EEEE, MMMM d, yyyy')}
            </Text>
          </View>
        </TouchableOpacity>

        {Platform.OS === 'ios' && showDatePicker && (
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerButton}
              >
                <Text style={styles.datePickerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerButton}
              >
                <Text
                  style={[
                    styles.datePickerButtonText,
                    styles.datePickerDoneText,
                  ]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
              style={styles.datePickerIOS}
            />
          </View>
        )}

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        <View style={styles.input}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Enter description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Adding...' : 'Add Transaction'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  categoryPicker: {
    position: 'absolute',
    top: 250,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: 200,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  form: {
    padding: 20,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    marginLeft: 8,
    color: '#0f172a',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#fff',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 16,
    color: '#0f172a',
  },
  descriptionInput: {
    fontSize: 16,
    color: '#0f172a',
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#0891b2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Add to styles
  currencySelector: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    lineHeight: 0,
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '500',
  },
  currencyPicker: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  currencyOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  currencyOptionText: {
    fontSize: 16,
    color: '#0f172a',
  },
  datePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  datePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#0891b2',
    fontWeight: '500',
  },
  datePickerDoneText: {
    fontWeight: '600',
  },
  datePickerIOS: {
    height: 200,
    width: '100%',
  },
});
