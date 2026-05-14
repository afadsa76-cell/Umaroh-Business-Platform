import { Transaction } from '../types/transaction';

const STORAGE_KEY = 'umrah_transactions';

export const getTransactions = (): Transaction[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveTransaction = (transaction: Transaction) => {
  const transactions = getTransactions();
  transactions.push(transaction);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
};

export const deleteTransaction = (id: string) => {
  const transactions = getTransactions().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
};

export const updateTransaction = (updatedTransaction: Transaction) => {
  const transactions = getTransactions();
  const index = transactions.findIndex(t => t.id === updatedTransaction.id);
  if (index !== -1) {
    transactions[index] = updatedTransaction;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }
};
