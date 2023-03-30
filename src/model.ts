import { Contract as EthersContract, InterfaceAbi as EthersContractInterface, Signer as EthersSigner, TransactionReceipt as EthersTransactionReceipt, TransactionResponse as EthersTransactionResponse } from 'ethers';

export type Signer = EthersSigner;
export type ContractInterface = EthersContractInterface;
export type Contract = EthersContract;
export type TransactionResponse = EthersTransactionResponse;
export type TransactionReceipt = EthersTransactionReceipt;
