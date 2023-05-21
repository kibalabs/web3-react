import { Contract as EthersContract, InterfaceAbi as EthersContractInterface, Signer as EthersSigner, TransactionReceipt as EthersTransactionReceipt, TransactionResponse as EthersTransactionResponse } from 'ethers';

export type Web3Signer = EthersSigner;
export type Web3ContractInterface = EthersContractInterface;
export type Web3Contract = EthersContract;
export type Web3TransactionResponse = EthersTransactionResponse;
export type Web3TransactionReceipt = EthersTransactionReceipt;
