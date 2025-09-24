import React from 'react';

import { createBaseAccountSDK } from '@base-org/account';
import { dateToString, generateRandomString, LocalStorageClient } from '@kibalabs/core';
import { IMultiAnyChildProps, useEventListener, useInitialization } from '@kibalabs/core-react';
import { BrowserProvider, Eip1193Provider, BrowserProvider as EthersBrowserProvider } from 'ethers';

import { Eip6963AnnounceProviderEvent, Eip6963ProviderDetail, Web3Provider, Web3Signer } from './model';

// Extend the Window interface to include the ethereum property
declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export type Web3Account = {
  address: string;
  signer: Web3Signer;
}

export type Web3LoginSignature = {
  message: string;
  signature: string;
}

type Web3AccountControl = {
  web3: Web3Provider | undefined | null;
  web3ChainId: number | undefined | null;
  web3Account: Web3Account | undefined | null;
  web3LoginSignature: Web3LoginSignature | undefined | null;
  providers: Eip6963ProviderDetail[];
  chooseEip1193Provider: (eip1193ProviderRdns: string) => void;
  onLinkWeb3AccountsClicked: () => Promise<boolean>;
  onWeb3BaseLoginClicked: (chainId: number, statement: string, appName: string, appLogUrl: string) => Promise<Web3LoginSignature | null>;
  onWeb3LoginClicked: (statement?: string, shouldIncludeProtocol?: boolean) => Promise<Web3LoginSignature | null>;
  onSwitchToChainIdClicked: (chainId: number) => Promise<void>;
}

export const Web3AccountContext = React.createContext<Web3AccountControl | undefined | null>(undefined);

interface IWeb3AccountControlProviderProps extends IMultiAnyChildProps {
  localStorageClient: LocalStorageClient;
  onError: (error: Error) => void;
}

export function Web3AccountControlProvider(props: IWeb3AccountControlProviderProps): React.ReactElement {
  const [eip1193Provider, setEip1193Provider] = React.useState<Eip1193Provider | null | undefined>(undefined);
  const [web3ChainId, setWeb3ChainId] = React.useState<number | null | undefined>(undefined);
  const [web3Account, setWeb3Account] = React.useState<Web3Account | undefined | null>(undefined);
  const [loginCount, setLoginCount] = React.useState<number>(0);
  const [providers, setProviders] = React.useState<Eip6963ProviderDetail[] | undefined>(undefined);
  const [isWaitingToLinkAccount, setIsWaitingToLinkAccount] = React.useState<boolean>(false);
  const providersRef = React.useRef<Eip6963ProviderDetail[] | undefined>(undefined);
  providersRef.current = providers;
  const onError = props.onError;

  const chooseEip1193Provider = React.useCallback((eip1193ProviderRdns: string): void => {
    if (eip1193Provider != null) {
      return;
    }
    const provider = providersRef.current?.find((providerDetail: Eip6963ProviderDetail): boolean => providerDetail.info.rdns === eip1193ProviderRdns);
    if (provider) {
      setEip1193Provider(provider.provider);
      props.localStorageClient.setValue('web3Account-chosenEip1193ProviderRdns', eip1193ProviderRdns);
    } else {
      setEip1193Provider(null);
      props.localStorageClient.removeValue('web3Account-chosenEip1193ProviderRdns');
    }
  }, [eip1193Provider, providersRef, props.localStorageClient]);

  const web3 = React.useMemo((): EthersBrowserProvider | undefined | null => {
    if (eip1193Provider == null) {
      return null;
    }
    return new EthersBrowserProvider(eip1193Provider);
  }, [eip1193Provider]);

  useEventListener(window, 'eip6963:announceProvider', (event: Event): void => {
    const parsedEvent = event as Eip6963AnnounceProviderEvent;
    setProviders((prevProviders: Eip6963ProviderDetail[] | undefined): Eip6963ProviderDetail[] => {
      const newProviders = [...prevProviders ?? []];
      const existingProviderIndex = newProviders.findIndex((provider: Eip6963ProviderDetail): boolean => provider.info.uuid === parsedEvent.detail.info.uuid);
      if (existingProviderIndex >= 0) {
        newProviders[existingProviderIndex] = parsedEvent.detail;
        return newProviders;
      }
      newProviders.push(parsedEvent.detail);
      return newProviders;
    });
  });

  const loadWeb3 = async (): Promise<void> => {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    // NOTE(krishan711): need to keep window.ethereum as a fallback option for injected wallet
    if (window.ethereum != null) {
      const newProvider: Eip6963ProviderDetail = {
        info: {
          uuid: 'ethers',
          name: 'Injected wallet',
          icon: "data:image/svg+xml,%3Csvg width='500' height='500' viewBox='0 0 500 500' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_13_2)'%3E%3Crect width='500' height='500' rx='250' fill='white'/%3E%3Cpath d='M356.875 175.188H143.125C125.417 175.188 111.062 189.542 111.062 207.25V335.5C111.062 353.208 125.417 367.562 143.125 367.562H356.875C374.583 367.562 388.938 353.208 388.938 335.5V207.25C388.938 189.542 374.583 175.188 356.875 175.188Z' stroke='black' stroke-width='32' stroke-linejoin='round'/%3E%3Cpath d='M353.776 175.187V155.148C353.774 150.234 352.688 145.38 350.594 140.933C348.501 136.486 345.452 132.556 341.664 129.424C337.877 126.291 333.445 124.033 328.685 122.81C323.925 121.588 318.953 121.431 314.125 122.351L138.209 152.376C130.569 153.832 123.677 157.908 118.722 163.902C113.766 169.895 111.057 177.43 111.063 185.207V217.937' stroke='black' stroke-width='32' stroke-linejoin='round'/%3E%3Cpath d='M324.813 292.75C320.585 292.75 316.452 291.496 312.937 289.148C309.422 286.799 306.682 283.461 305.065 279.555C303.447 275.649 303.023 271.351 303.848 267.205C304.673 263.059 306.709 259.25 309.698 256.261C312.687 253.271 316.496 251.235 320.642 250.411C324.789 249.586 329.087 250.009 332.992 251.627C336.898 253.245 340.236 255.985 342.585 259.5C344.934 263.015 346.188 267.147 346.188 271.375C346.188 277.044 343.936 282.481 339.927 286.489C335.918 290.498 330.482 292.75 324.813 292.75Z' fill='black'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_13_2'%3E%3Crect width='500' height='500' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A",
          rdns: 'ethers',
        },
        provider: window.ethereum,
      };
      setProviders((prevProviders: Eip6963ProviderDetail[] | undefined): Eip6963ProviderDetail[] => {
        const previousProviders = prevProviders ?? [];
        const existingProviderIndex = previousProviders.findIndex((p: Eip6963ProviderDetail): boolean => p.info.rdns === 'ethers');
        if (existingProviderIndex >= 0) {
          const newProviders = [...previousProviders];
          newProviders[existingProviderIndex] = newProvider;
          return newProviders;
        }
        return [...previousProviders, newProvider];
      });
    } else {
      setProviders([]);
    }
  };

  useInitialization((): void => {
    loadWeb3();
  });

  const autoReconnectBaseProvider = React.useCallback(async (): Promise<boolean> => {
    const baseConnectionString = props.localStorageClient.getValue('web3Account-baseConnection');
    if (!baseConnectionString) {
      props.localStorageClient.removeValue('web3Account-chosenEip1193ProviderRdns');
      return false;
    }
    try {
      const baseConnection = JSON.parse(baseConnectionString);
      const { address, chainId, appName, appLogoUrl } = baseConnection;
      const signatureString = props.localStorageClient.getValue(`web3Account-signature-${address}`);
      if (!signatureString) {
        return false;
      }
      const sdk = createBaseAccountSDK({
        appName,
        appLogoUrl,
        appChainIds: [chainId],
      });
      const browserProvider = new BrowserProvider(sdk.getProvider());
      const signer = await browserProvider.getSigner();
      const currentAddress = await signer.getAddress();
      if (currentAddress.toLowerCase() === address.toLowerCase()) {
        setWeb3Account({ address: currentAddress, signer });
        setEip1193Provider(sdk.getProvider());
        setLoginCount((prev) => prev + 1);
        return true;
      }
    } catch (parseError) {
      console.error('Invalid Base connection data:', parseError);
      props.localStorageClient.removeValue('web3Account-baseConnection');
      props.localStorageClient.removeValue('web3Account-chosenEip1193ProviderRdns');
    }
    return false;
  }, [props.localStorageClient]);

  const autoReconnectProvider = React.useCallback(async (): Promise<void> => {
    if (eip1193Provider != null || providers === undefined) {
      return;
    }
    const savedProviderRdns = props.localStorageClient.getValue('web3Account-chosenEip1193ProviderRdns');
    if (savedProviderRdns === 'base') {
      const baseReconnected = await autoReconnectBaseProvider();
      if (!baseReconnected) {
        setWeb3Account(null);
        setEip1193Provider(null);
      }
      return;
    }
    if (savedProviderRdns && providers.length > 0) {
      const savedProvider = providers.find((provider: Eip6963ProviderDetail): boolean => provider.info.rdns === savedProviderRdns);
      if (savedProvider) {
        setEip1193Provider(savedProvider.provider);
      } else {
        props.localStorageClient.removeValue('web3Account-chosenEip1193ProviderRdns');
      }
    } else {
      setWeb3Account(null);
      setEip1193Provider(null);
    }
  }, [providers, props.localStorageClient, eip1193Provider, autoReconnectBaseProvider]);

  React.useEffect((): void => {
    autoReconnectProvider();
  }, [autoReconnectProvider]);

  const onChainChanged = React.useCallback(async (): Promise<void> => {
    // NOTE(krishan711): phantom wallet seems to hit these callbacks straight away, so dont reload here unless we have already initialised
    if (!web3 || !web3ChainId) {
      return;
    }
    window.location.reload();
  }, [web3, web3ChainId]);

  const onWeb3AccountsChanged = React.useCallback(async (web3AccountAddresses: string[]): Promise<void> => {
    if (!web3) {
      return;
    }
    const potentialLinkedWeb3Accounts: (Web3Signer | null)[] = await Promise.all(web3AccountAddresses.map((web3AccountAddress: string): Promise<Web3Signer | null> => {
      // if (!(web3 instanceof EthersJsonRpcApiProvider)) {
      //   return Promise.resolve(null);
      // }
      return web3.getSigner(web3AccountAddress);
    }));
    const linkedWeb3Accounts = potentialLinkedWeb3Accounts.filter((potentialSigner: Web3Signer | null): boolean => potentialSigner != null) as Web3Signer[];
    if (linkedWeb3Accounts.length === 0) {
      setWeb3Account(null);
      // NOTE(krishan711): Clean up Base connection if it was a Base provider
      const savedProviderRdns = props.localStorageClient.getValue('web3Account-chosenEip1193ProviderRdns');
      if (savedProviderRdns === 'base') {
        props.localStorageClient.removeValue('web3Account-baseConnection');
        props.localStorageClient.removeValue('web3Account-chosenEip1193ProviderRdns');
      }
      return;
    }
    // NOTE(krishan711): metamask only deals with one web3Account at the moment but returns an array for future compatibility
    const linkedWeb3Account = linkedWeb3Accounts[0];
    const linkedWeb3AccountAddress = await linkedWeb3Account.getAddress();
    setWeb3Account({ address: linkedWeb3AccountAddress, signer: linkedWeb3Account });
  }, [web3, props.localStorageClient]);

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

  const onLinkWeb3AccountsClicked = React.useCallback(async (): Promise<boolean> => {
    if (web3 == null) {
      setIsWaitingToLinkAccount(true);
      return false;
    }
    try {
      await web3.send('eth_requestAccounts', []);
      await loadWeb3Accounts();
      return true;
    } catch (error: unknown) {
      if ((error as Error).message?.includes('wallet_requestPermissions')) {
        onError(new Error('WALLET_REQUEST_ALREADY_OPEN'));
      } else {
        onError(new Error('WALLET_CONNECTION_FAILED'));
      }
    }
    return false;
  }, [web3, onError, loadWeb3Accounts]);

  React.useEffect((): void => {
    if (isWaitingToLinkAccount && web3) {
      setIsWaitingToLinkAccount(false);
      onLinkWeb3AccountsClicked();
    }
  }, [isWaitingToLinkAccount, web3, onLinkWeb3AccountsClicked]);

  const onSwitchToChainIdClicked = React.useCallback(async (chainId: number): Promise<void> => {
    if (!web3) {
      throw new Error('No web3 provider available to switch chain');
    }
    try {
      await web3.send('wallet_switchEthereumChain', [{
        chainId: `0x${chainId.toString(16)}`,
      }]);
    } catch (error: unknown) {
      // Error code 4902 means the chain hasn't been added to the wallet yet
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 4902) {
        const chainConfigurations: Record<number, { chainName: string; nativeCurrency: { name: string; symbol: string; decimals: number }; rpcUrls: string[]; blockExplorerUrls: string[] }> = {
          8453: { // Base Mainnet
            chainName: 'Base',
            nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          },
        };

        const chainConfig = chainConfigurations[chainId];
        if (!chainConfig) {
          throw error;
        }
        await web3.send('wallet_addEthereumChain', [{
          chainId: `0x${chainId.toString(16)}`,
          ...chainConfig,
        }]);
      } else {
        throw error;
      }
    }
  }, [web3]);

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

  const onWeb3BaseLoginClicked = React.useCallback(async (chainId: number, statement: string, appName: string, appLogoUrl: string): Promise<Web3LoginSignature | null> => {
    const sdk = createBaseAccountSDK({
      appName,
      appLogoUrl,
      appChainIds: [chainId],
    });
    const domain = window.location.protocol !== 'https:' ? window.location.origin : window.location.host;
    const actualStatement = statement || `Sign in to ${appName}.`;
    try {
      const response = await sdk.getProvider().request({
        method: 'wallet_connect',
        params: [{
          version: '1',
          capabilities: {
            signInWithEthereum: {
              version: '1',
              domain: domain,
              uri: window.location.origin,
              statement: actualStatement,
              nonce: generateRandomString(16),
              chainId: `0x${chainId.toString(16)}`,
              issuedAt: dateToString(new Date()),
            },
          },
        }],
      });
      // @ts-expect-error
      const address = response.accounts[0].address;
      // @ts-expect-error
      const message = response.accounts[0].capabilities.signInWithEthereum.message;
      // @ts-expect-error
      const signature = response.accounts[0].capabilities.signInWithEthereum.signature;
      const newWeb3LoginSignature = { message, signature };
      props.localStorageClient.setValue(`web3Account-signature-${address}`, JSON.stringify(newWeb3LoginSignature));
      setLoginCount(loginCount + 1);
      const browserProvider = new BrowserProvider(sdk.getProvider());
      const signer = await browserProvider.getSigner();
      setWeb3Account({ address, signer });
      setEip1193Provider(sdk.getProvider());
      const baseConnectionState = {
        address,
        chainId,
        appName,
        appLogoUrl,
        isBaseProvider: true,
      };
      props.localStorageClient.setValue('web3Account-baseConnection', JSON.stringify(baseConnectionState));
      props.localStorageClient.setValue('web3Account-chosenEip1193ProviderRdns', 'base');
      return newWeb3LoginSignature;
    } catch (error) {
      console.error('Sign in failed:', error);
    }
    return null;
  }, [loginCount, props.localStorageClient]);

  const onWeb3LoginClicked = React.useCallback(async (statement?: string, shouldIncludeProtocol?: boolean): Promise<Web3LoginSignature | null> => {
    if (!web3Account) {
      return null;
    }
    const domain = (shouldIncludeProtocol || window.location.protocol !== 'https:') ? window.location.origin : window.location.host;
    const actualStatement = statement ?? 'Sign in to the app.';
    // NOTE(krishan711): SIWE compliant message: https://eips.ethereum.org/EIPS/eip-4361
    let messageParts: string[] = [
      `${domain} wants you to sign in with your Ethereum account:`,
      `${web3Account.address}`,
      '',
      actualStatement,
      '',
    ];
    messageParts = messageParts.concat([
      `URI: ${window.location.origin}`,
      'Version: 1',
      `Chain ID: ${web3ChainId}`,
      `Nonce: ${generateRandomString(16)}`,
      `Issued At: ${dateToString(new Date())}`,
    ]);
    const message = messageParts.join('\n');
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
  }, [web3Account, web3ChainId, props.localStorageClient, loginCount]);

  const providerValue = React.useMemo((): Web3AccountControl => {
    return { web3Account, web3LoginSignature, providers: providers ?? [], onLinkWeb3AccountsClicked, onWeb3LoginClicked, onWeb3BaseLoginClicked, chooseEip1193Provider, onSwitchToChainIdClicked, web3, web3ChainId };
  }, [web3Account, web3LoginSignature, providers, chooseEip1193Provider, onLinkWeb3AccountsClicked, onWeb3LoginClicked, onWeb3BaseLoginClicked, onSwitchToChainIdClicked, web3, web3ChainId]);

  return (
    <Web3AccountContext.Provider value={providerValue}>
      {props.children}
    </Web3AccountContext.Provider>
  );
}

export const useWeb3 = (): Web3Provider | undefined | null => {
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

export const useOnLinkWeb3AccountsClicked = (): (() => Promise<boolean>) => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.onLinkWeb3AccountsClicked;
};

export const useWeb3OnLoginClicked = (): ((statement?: string, shouldIncludeProtocol?: boolean) => Promise<Web3LoginSignature | null>) => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.onWeb3LoginClicked;
};

export const useWeb3OnBaseLoginClicked = (): ((chainId: number, statement: string, appName: string, appLogoUrl: string) => Promise<Web3LoginSignature | null>) => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.onWeb3BaseLoginClicked;
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

export const useWeb3Providers = (): [Eip6963ProviderDetail[], ((eip1193ProviderRdns: string) => void)] => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return [web3AccountsControl.providers, web3AccountsControl.chooseEip1193Provider];
};

export const useOnSwitchToWeb3ChainIdClicked = (): ((chainId: number) => Promise<void>) => {
  const web3AccountsControl = React.useContext(Web3AccountContext);
  if (!web3AccountsControl) {
    throw Error('web3AccountsControl has not been initialized correctly.');
  }
  return web3AccountsControl.onSwitchToChainIdClicked;
};
