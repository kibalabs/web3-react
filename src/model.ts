import { Contract as EthersContract, InterfaceAbi as EthersInterfaceAbi, Provider as EthersProvider, Signer as EthersSigner, TransactionReceipt as EthersTransactionReceipt, TransactionResponse as EthersTransactionResponse } from 'ethers';

export type Web3Signer = EthersSigner;
export type Web3Provider = EthersProvider;
export type Web3ContractInterface = EthersInterfaceAbi;
export type Web3Contract = EthersContract;
export type Web3TransactionResponse = EthersTransactionResponse;
export type Web3TransactionReceipt = EthersTransactionReceipt;
