### Socket Yield Bridge

## Sync

- Sync: Used to push the total earnings from strategy to app chain for distribution.

## Rebalance

- Rebalance: Process of depositing collected funds to Strategy, maintaining idle and invested fund ratio and withdrawing if the ratio exceeds the limits.

- Rebalance delay: delay after which the funds should be pushed to strategy to batch the transfer and save gas

## Removed mint-redeem from yield vault

- As we don't want to use shares on the vault chains, the related operations are removed from here and only necessary logic is picked

- Cases:
  - what if strategy faces loss and total funds reduce on non app chain?
    As tokens are rebasing, it will reduce the amount in all wallets
