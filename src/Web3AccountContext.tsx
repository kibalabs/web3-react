import React from 'react';

import { dateToString, LocalStorageClient } from '@kibalabs/core';
import { IMultiAnyChildProps, useInitialization } from '@kibalabs/core-react';
import { Eip1193Provider, BrowserProvider as EthersBrowserProvider, Provider as EthersProvider, JsonRpcApiProvider as EthersWritableProvider } from 'ethers';

import { Web3Signer } from './model';

export type Web3Account = {
  address: string;
  signer: Web3Signer;
}

export type Web3LoginSignature = {
  message: string;
  signature: string;
}

type Web3AccountControl = {
  web3: EthersProvider | undefined | null;
  web3ChainId: number | undefined | null;
  web3Account: Web3Account | undefined | null;
  web3LoginSignature: Web3LoginSignature | undefined | null;
  onLinkWeb3AccountsClicked: () => void;
  onWeb3LoginClicked: () => Promise<Web3LoginSignature | null>;
}

export const Web3AccountContext = React.createContext<Web3AccountControl | undefined | null>(undefined);

interface IWeb3AccountControlProviderProps extends IMultiAnyChildProps {
  localStorageClient: LocalStorageClient;
  onError: (error: Error) => void;
}

export const Web3AccountControlProvider = (props: IWeb3AccountControlProviderProps): React.ReactElement => {
  const [eip1193Provider, setEip1193Provider] = React.useState<Eip1193Provider | null | undefined>(undefined);
  const [web3, setWeb3] = React.useState<EthersBrowserProvider | null | undefined>(undefined);
  const [web3ChainId, setWeb3ChainId] = React.useState<number | null | undefined>(undefined);
  const [web3Account, setWeb3Account] = React.useState<Web3Account | undefined | null>(undefined);
  const [loginCount, setLoginCount] = React.useState<number>(0);

  const loadWeb3 = async (): Promise<void> => {
    // NOTE(krishan711): keep an eye on how metamask provider does this: https://github.com/MetaMask/detect-provider/blob/main/src/index.ts
    // NOTE(krishan711): could use ethers.getDefaultProvider() for non-wallet scenarios
    // @ts-expect-error
    const provider = window.ethereum != null ? new EthersBrowserProvider(window.ethereum) : null;
    if (!provider) {
      setWeb3Account(null);
      setEip1193Provider(null);
      return;
    }
    setWeb3(provider);
    // @ts-expect-error
    setEip1193Provider(window.ethereum);
  };

  const onChainChanged = React.useCallback((): void => {
    window.location.reload();
  }, []);

  const onWeb3AccountsChanged = React.useCallback(async (web3AccountAddresses: string[]): Promise<void> => {
    if (!web3) {
      return;
    }
    const potentialLinkedWeb3Accounts: (Web3Signer | null)[] = await Promise.all(web3AccountAddresses.map((web3AccountAddress: string): Promise<Web3Signer | null> => {
      if (!(web3 instanceof EthersWritableProvider)) {
        return Promise.resolve(null);
      }
      return (web3 as EthersWritableProvider).getSigner(web3AccountAddress);
    }));
    const linkedWeb3Accounts = potentialLinkedWeb3Accounts.filter((potentialSigner: Web3Signer | null): boolean => potentialSigner != null) as Web3Signer[];
    if (linkedWeb3Accounts.length === 0) {
      setWeb3Account(null);
      return;
    }
    // NOTE(krishan711): metamask only deals with one web3Account at the moment but returns an array for future compatibility
    const linkedWeb3Account = linkedWeb3Accounts[0];
    const linkedWeb3AccountAddress = await linkedWeb3Account.getAddress();
    setWeb3Account({ address: linkedWeb3AccountAddress, signer: linkedWeb3Account });
  }, [web3]);

  const loadWeb3Accounts = React.useCallback(async (): Promise<void> => {
    if (!web3) {
      return;
    }
    const newWeb3AccountAddresses = await web3.send('eth_accounts', []);
    onWeb3AccountsChanged(newWeb3AccountAddresses);
    const newChainId = await web3.send('eth_chainId', []);
    setWeb3ChainId(Number(newChainId));
  }, [web3, onWeb3AccountsChanged]);

  React.useEffect((): void => {
    loadWeb3Accounts();
  }, [loadWeb3Accounts]);

  const monitorWeb3AccountChanges = React.useCallback(async (): Promise<void> => {
    if (!eip1193Provider) {
      return;
    }
    // @ts-expect-error
    eip1193Provider.on('accountsChanged', onWeb3AccountsChanged);
    // @ts-expect-error
    eip1193Provider.on('chainChanged', onChainChanged);
  }, [eip1193Provider, onWeb3AccountsChanged, onChainChanged]);

  React.useEffect((): void => {
    monitorWeb3AccountChanges();
  }, [monitorWeb3AccountChanges]);

  const onLinkWeb3AccountsClicked = async (): Promise<void> => {
    if (!web3) {
      return;
    }
    // @ts-expect-error
    web3.send('eth_requestAccounts').then(async (): Promise<void> => {
      await loadWeb3();
    }).catch((error: unknown): void => {
      if ((error as Error).message?.includes('wallet_requestPermissions')) {
        props.onError(new Error('WALLET_REQUEST_ALREADY_OPEN'));
      } else {
        props.onError(new Error('WALLET_CONNECTION_FAILED'));
      }
    });
  };

  const web3LoginSignature = React.useMemo((): Web3LoginSignature | null => {
    if (!web3Account || loginCount < 0) {
      return null;
    }
    const stringValue = props.localStorageClient.getValue(`web3Account-signature-${web3Account.address}`);
    if (!stringValue) {
      return null;
    }
    const signature = JSON.parse(stringValue);
    // TODO(krishan711): could do some checking here
    return signature as Web3LoginSignature;
  }, [web3Account, loginCount, props.localStorageClient]);

  const onWeb3LoginClicked = async (): Promise<Web3LoginSignature | null> => {
    if (!web3Account) {
      return null;
    }
    const message = `This one-time signature simply proves you're the owner of the wallet address for use with Token Page:

${web3Account.address}

Signature signings do not affect your assets in any way.

Date: ${dateToString(new Date())}
    `;
    try {
      const signature = await web3Account.signer.signMessage(message);
      const newWeb3LoginSignature = { message, signature };
      props.localStorageClient.setValue(`web3Account-signature-${web3Account.address}`, JSON.stringify(newWeb3LoginSignature));
      setLoginCount(loginCount + 1);
      return newWeb3LoginSignature;
    } catch (error: unknown) {
      console.error(error);
    }
    return null;
  };

  useInitialization((): void => {
    loadWeb3();
  });

  return (
    <Web3AccountContext.Provider value={{ web3Account, web3LoginSignature: web3LoginSignature as Web3LoginSignature, onLinkWeb3AccountsClicked, onWeb3LoginClicked, web3, web3ChainId }}>
      {props.children}
    </Web3AccountContext.Provider>
  );
};

export const useWeb3 = (): EthersProvider | undefined | null => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.web3;
};

export const useWeb3Account = (): Web3Account | undefined | null => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.web3Account;
};

export const useOnLinkWeb3AccountsClicked = (): (() => void) => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.onLinkWeb3AccountsClicked;
};

export const useWeb3OnLoginClicked = (): (() => Promise<Web3LoginSignature | null>) => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.onWeb3LoginClicked;
};

export const useWeb3LoginSignature = (): Web3LoginSignature | undefined | null => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.web3LoginSignature;
};

export const useWeb3ChainId = (): number | undefined | null => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.web3ChainId;
};
