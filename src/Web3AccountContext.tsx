import React from 'react';

import { dateToString, LocalStorageClient } from '@kibalabs/core';
import { IMultiAnyChildProps, useInitialization } from '@kibalabs/core-react';
import detectEthereumProvider from '@metamask/detect-provider';
import { BigNumber, ethers } from 'ethers';

// import { useToastManager } from './components/Toast';

export type Web3Account = {
  address: string;
  signer: ethers.Signer;
}

export type Web3LoginSignature = {
  message: string;
  signature: string;
}

type Web3AccountControl = {
  web3: ethers.providers.Web3Provider | undefined | null;
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
  const [web3, setWeb3] = React.useState<ethers.providers.Web3Provider | null | undefined>(undefined);
  const [web3ChainId, setWeb3ChainId] = React.useState<number | null | undefined>(undefined);
  const [web3Account, setWeb3Account] = React.useState<Web3Account | undefined | null>(undefined);
  const [loginCount, setLoginCount] = React.useState<number>(0);

  const loadWeb3 = async (): Promise<void> => {
    const provider = await detectEthereumProvider() as ethers.providers.ExternalProvider;
    if (!provider) {
      setWeb3Account(null);
      return;
    }
    const web3Connection = new ethers.providers.Web3Provider(provider);
    setWeb3(web3Connection);
  };

  const onChainChanged = React.useCallback((): void => {
    window.location.reload();
  }, []);

  const onWeb3AccountsChanged = React.useCallback(async (web3AccountAddresses: string[]): Promise<void> => {
    if (!web3) {
      return;
    }
    const linkedWeb3Accounts = web3AccountAddresses.map((web3AccountAddress: string): ethers.Signer => web3.getSigner(web3AccountAddress));
    if (linkedWeb3Accounts.length === 0) {
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
    // @ts-expect-error
    onWeb3AccountsChanged(await web3.provider.request({ method: 'eth_web3Accounts' }));
    // @ts-expect-error
    web3.provider.on('web3AccountsChanged', onWeb3AccountsChanged);
    // @ts-expect-error
    const newChainId = await web3.provider.request({ method: 'eth_web3ChainId' });
    setWeb3ChainId(BigNumber.from(newChainId).toNumber());
    // @ts-expect-error
    web3.provider.on('chainChanged', onChainChanged);
  }, [web3, onWeb3AccountsChanged, onChainChanged]);

  React.useEffect((): void => {
    loadWeb3Accounts();
  }, [loadWeb3Accounts]);

  const onLinkWeb3AccountsClicked = async (): Promise<void> => {
    if (!web3) {
      return;
    }
    // @ts-expect-error
    web3.provider.request({ method: 'eth_requestWeb3Accounts', params: [] }).then(async (): Promise<void> => {
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

export const useWeb3 = (): ethers.providers.Web3Provider | undefined | null => {
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
