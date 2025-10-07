# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) with some additions:
- For all changes include one of [PATCH | MINOR | MAJOR] with the scope of the change being made.

## [Unreleased]

### Added

### Changed
- [MAJOR] Updated to ethers v6
- [MINOR] Added model to abstract away ethers types
- [MAJOR] Updated package to es-module
- [MAJOR] Updated onChainChanged to not refresh page if account is not initialized (to fix Phantom constant refresh)
- [MAJOR] Refactored Web3AccountContext to use eip-6963
- [MINOR] Added `useWeb3Providers` and `useOnSwitchToWeb3ChainIdClicked`
- [MINOR] Added `onSwitchToChainIdClicked` to `Web3AccountContext` to allow switching chains
- [MAJOR] Updated default message to be SIWE compliant
- [MINOR] Implemented login with base via `useWeb3OnBaseLoginClicked`
- [MAJOR] Don't force refresh when the chainId changes

### Removed

## [0.2.0] - 2023-01-26

### Added
- [MINOR] Added `Web3AccountContext` and related hooks to access user and web3
- [MINOR] Added `useWeb3Contract` to initiate contracts
- [MINOR] Added `useWeb3Transaction` to simplify transaction management

### Changed

### Removed
