import React from 'react';

import { Web3TransactionReceipt, Web3TransactionResponse } from './model';

export type TransactionPromise = Promise<Web3TransactionResponse>;

export interface Web3TransactionDetails {
  transactionPromise: TransactionPromise | null;
  transaction: Web3TransactionResponse | null;
  error: Error | null;
  receipt: Web3TransactionReceipt | null;
}

export const useWeb3Transaction = (): [Web3TransactionDetails, (newTransactionPromise: TransactionPromise | null) => void, () => void, () => void] => {
  const [transactionPromise, setTransactionPromise] = React.useState<TransactionPromise | null>(null);
  const [transaction, setTransaction] = React.useState<Web3TransactionResponse | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [receipt, setReceipt] = React.useState<Web3TransactionReceipt | null>(null);

  const clearError = React.useCallback((): void => {
    setError(null);
  }, []);

  const clearTransaction = React.useCallback((): void => {
    setError(null);
    setReceipt(null);
    setTransactionPromise(null);
    setTransaction(null);
  }, []);

  const setNewTransactionPromise = React.useCallback((newTransactionPromise: TransactionPromise | null): void => {
    setError(null);
    setReceipt(null);
    setTransactionPromise(newTransactionPromise);
  }, []);

  const waitForTransactionPromise = React.useCallback(async (): Promise<void> => {
    if (!transactionPromise) {
      return;
    }
    try {
      const newTransaction = await transactionPromise;
      setTransaction(newTransaction);
    } catch (newError: unknown) {
      setError(newError as Error);
    }
    setTransactionPromise(null);
  }, [transactionPromise]);

  React.useEffect((): void => {
    waitForTransactionPromise();
  }, [waitForTransactionPromise]);

  const waitForTransaction = React.useCallback(async (): Promise<void> => {
    if (!transaction) {
      return;
    }
    try {
      const newReceipt = await transaction.wait();
      setReceipt(newReceipt);
    } catch (newError: unknown) {
      setError(newError as Error);
      setReceipt(null);
    }
    setTransaction(null);
  }, [transaction]);

  React.useEffect((): void => {
    waitForTransaction();
  }, [waitForTransaction]);

  return [
    {
      transactionPromise,
      transaction,
      error,
      receipt,
    },
    setNewTransactionPromise,
    clearError,
    clearTransaction,
  ];
};
