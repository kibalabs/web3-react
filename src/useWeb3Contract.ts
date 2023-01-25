import { ethers } from 'ethers';
import React from 'react';

import { useWeb3, useWeb3ChainId } from "./Web3AccountContext";


export const useWeb3Contract = (contractChainIdAddressMap: Record<number, string>, abi: ethers.ContractInterface): ethers.Contract | null | undefined => {
  const web3 = useWeb3()
  const chainId = useWeb3ChainId()
  const contract = React.useMemo((): ethers.Contract | null | undefined => {
    if (web3 === undefined || chainId === undefined) {
      return undefined;
    }
    if (web3 === null || chainId === null) {
      return null;
    }
    const contractAddress = contractChainIdAddressMap[chainId];
    if (!contractAddress) {
      return null;
    }
    return new ethers.Contract(contractAddress, abi, web3);
  }, [web3, chainId]);
  return contract;
}
