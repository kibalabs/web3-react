import React from 'react';

import { Interface, isCallException } from 'ethers';

import { Web3ContractInterface, Web3TransactionReceipt, Web3TransactionResponse } from './model';

export type TransactionPromise = Promise<Web3TransactionResponse>;

export interface Web3TransactionDetails {
  transactionPromise: TransactionPromise | null;
  transaction: Web3TransactionResponse | null;
  error: Error | null;
  errorMessage: string | null;
  receipt: Web3TransactionReceipt | null;
}

const decodeErrorMessage = (newError: unknown, abi?: Web3ContractInterface): string => {
  if (abi && isCallException(newError) && newError.data) {
    try {
      const parsedError = new Interface(abi).parseError(newError.data);
      if (parsedError) {
        return parsedError.name;
      }
    } catch {
      // Revert data present but not decodable with this ABI (e.g. selector from a different contract)
    }
  }
  return newError instanceof Error ? newError.message : String(newError);
};

export const useWeb3Transaction = (abi?: Web3ContractInterface): [Web3TransactionDetails, (newTransactionPromise: TransactionPromise | null) => void, () => void, () => void] => {
  const [transactionPromise, setTransactionPromise] = React.useState<TransactionPromise | null>(null);
  const [transaction, setTransaction] = React.useState<Web3TransactionResponse | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<Web3TransactionReceipt | null>(null);

  const clearError = React.useCallback((): void => {
    setError(null);
    setErrorMessage(null);
  }, []);

  const clearTransaction = React.useCallback((): void => {
    setError(null);
    setErrorMessage(null);
    setReceipt(null);
    setTransactionPromise(null);
    setTransaction(null);
  }, []);

  const setNewTransactionPromise = React.useCallback((newTransactionPromise: TransactionPromise | null): void => {
    setError(null);
    setErrorMessage(null);
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
      setErrorMessage(decodeErrorMessage(newError, abi));
    }
    setTransactionPromise(null);
  }, [transactionPromise, abi]);

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
      setErrorMessage(decodeErrorMessage(newError, abi));
      setReceipt(null);
    }
    setTransaction(null);
  }, [transaction, abi]);

  React.useEffect((): void => {
    waitForTransaction();
  }, [waitForTransaction]);

  return [
    {
      transactionPromise,
      transaction,
      error,
      errorMessage,
      receipt,
    },
    setNewTransactionPromise,
    clearError,
    clearTransaction,
  ];
};
