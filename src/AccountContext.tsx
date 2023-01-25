import React from 'react';

import { dateToString, LocalStorageClient } from '@kibalabs/core';
import { IMultiAnyChildProps, useInitialization } from '@kibalabs/core-react';
import detectEthereumProvider from '@metamask/detect-provider';
import { BigNumber, ethers } from 'ethers';

// import { useToastManager } from './components/Toast';

export type Account = {
  address: string;
  signer: ethers.Signer;
}

export type LoginSignature = {
  message: string;
  signature: string;
}

type AccountControl = {
  web3: ethers.providers.Web3Provider | undefined | null;
  chainId: number | undefined | null;
  account: Account | undefined | null;
  loginSignature: LoginSignature | undefined | null;
  onLinkAccountsClicked: () => void;
  onLoginClicked: () => Promise<LoginSignature | null>;
}

export const AccountContext = React.createContext<AccountControl | undefined | null>(undefined);

interface IAccountControlProviderProps extends IMultiAnyChildProps {
  localStorageClient: LocalStorageClient;
  onError: (error: Error) => void;
}

export const AccountControlProvider = (props: IAccountControlProviderProps): React.ReactElement => {
  const [web3, setWeb3] = React.useState<ethers.providers.Web3Provider | null | undefined>(undefined);
  const [chainId, setChainId] = React.useState<number | null | undefined>(undefined);
  const [account, setAccount] = React.useState<Account | undefined | null>(undefined);
  const [loginCount, setLoginCount] = React.useState<number>(0);

  const loadWeb3 = async (): Promise<void> => {
    const provider = await detectEthereumProvider() as ethers.providers.ExternalProvider;
    if (!provider) {
      setAccount(null);
      return;
    }
    const web3Connection = new ethers.providers.Web3Provider(provider);
    setWeb3(web3Connection);
  };

  const onChainChanged = React.useCallback((): void => {
    window.location.reload();
  }, []);

  const onAccountsChanged = React.useCallback(async (accountAddresses: string[]): Promise<void> => {
    if (!web3) {
      return;
    }
    const linkedAccounts = accountAddresses.map((accountAddress: string): ethers.Signer => web3.getSigner(accountAddress));
    if (linkedAccounts.length === 0) {
      return;
    }
    // NOTE(krishan711): metamask only deals with one account at the moment but returns an array for future compatibility
    const linkedAccount = linkedAccounts[0];
    const linkedAccountAddress = await linkedAccount.getAddress();
    setAccount({ address: linkedAccountAddress, signer: linkedAccount });
  }, [web3]);

  const loadAccounts = React.useCallback(async (): Promise<void> => {
    if (!web3) {
      return;
    }
    // @ts-expect-error
    onAccountsChanged(await web3.provider.request({ method: 'eth_accounts' }));
    // @ts-expect-error
    web3.provider.on('accountsChanged', onAccountsChanged);
    // @ts-expect-error
    const newChainId = await web3.provider.request({ method: 'eth_chainId' });
    setChainId(BigNumber.from(newChainId).toNumber());
    // @ts-expect-error
    web3.provider.on('chainChanged', onChainChanged);
  }, [web3, onAccountsChanged, onChainChanged]);

  React.useEffect((): void => {
    loadAccounts();
  }, [loadAccounts]);

  const onLinkAccountsClicked = async (): Promise<void> => {
    if (!web3) {
      return;
    }
    // @ts-expect-error
    web3.provider.request({ method: 'eth_requestAccounts', params: [] }).then(async (): Promise<void> => {
      await loadWeb3();
    }).catch((error: unknown): void => {
      if ((error as Error).message?.includes('wallet_requestPermissions')) {
        props.onError(new Error('WALLET_REQUEST_ALREADY_OPEN'));
        // toastManager.showToast('error', 'You already have a MetaMask request window open, please find it!');
      } else {
        props.onError(new Error('WALLET_CONNECTION_FAILED'));
        // toastManager.showToast('error', 'Something went wrong connecting to MetaMask. Please try refresh the page / your browser and try again');
      }
    });
  };

  const loginSignature = React.useMemo((): LoginSignature | null => {
    if (!account || loginCount < 0) {
      return null;
    }
    const stringValue = props.localStorageClient.getValue(`account-signature-${account.address}`);
    if (!stringValue) {
      return null;
    }
    const signature = JSON.parse(stringValue);
    // TODO(krishan711): could do some checking here
    return signature as LoginSignature;
  }, [account, loginCount, props.localStorageClient]);

  const onLoginClicked = async (): Promise<LoginSignature | null> => {
    if (!account) {
      return null;
    }
    const message = `This one-time signature simply proves you're the owner of the wallet address for use with Token Page:

${account.address}

Signature signings do not affect your assets in any way.

Date: ${dateToString(new Date())}
    `;
    try {
      const signature = await account.signer.signMessage(message);
      const newLoginSignature = { message, signature };
      props.localStorageClient.setValue(`account-signature-${account.address}`, JSON.stringify(newLoginSignature));
      setLoginCount(loginCount + 1);
      return newLoginSignature;
    } catch (error: unknown) {
      console.error(error);
    }
    return null;
  };

  useInitialization((): void => {
    loadWeb3();
  });

  return (
    <AccountContext.Provider value={{ account, loginSignature: loginSignature as LoginSignature, onLinkAccountsClicked, onLoginClicked, web3, chainId }}>
      {props.children}
    </AccountContext.Provider>
  );
};

export const useWeb3 = (): ethers.providers.Web3Provider | undefined | null => {
  const accountsControl = React.useContext(AccountContext);
  if (!accountsControl) {
    throw Error('accountsControl has not been initialized correctly.');
  }
  return accountsControl.web3;
};

export const useWeb3Account = (): Account | undefined | null => {
  const accountsControl = React.useContext(AccountContext);
  if (!accountsControl) {
    throw Error('accountsControl has not been initialized correctly.');
  }
  return accountsControl.account;
};

export const useWeb3OnLinkAccountsClicked = (): (() => void) => {
  const accountsControl = React.useContext(AccountContext);
  if (!accountsControl) {
    throw Error('accountsControl has not been initialized correctly.');
  }
  return accountsControl.onLinkAccountsClicked;
};

export const useWeb3OnLoginClicked = (): (() => Promise<LoginSignature | null>) => {
  const accountsControl = React.useContext(AccountContext);
  if (!accountsControl) {
    throw Error('accountsControl has not been initialized correctly.');
  }
  return accountsControl.onLoginClicked;
};

export const useWeb3LoginSignature = (): LoginSignature | undefined | null => {
  const accountsControl = React.useContext(AccountContext);
  if (!accountsControl) {
    throw Error('accountsControl has not been initialized correctly.');
  }
  return accountsControl.loginSignature;
};

export const useWeb3ChainId = (): number | undefined | null => {
  const accountsControl = React.useContext(AccountContext);
  if (!accountsControl) {
    throw Error('accountsControl has not been initialized correctly.');
  }
  return accountsControl.chainId;
};
