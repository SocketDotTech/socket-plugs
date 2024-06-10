### Socket Plug

- Socket DL supported plug contract which is used to enable bridge for vault and super token.

### SuperToken

- Super token is an ERC20 contract which allows socket bridge to mint and burn the tokens within a certain daily limit and rate.
- If max limits reaches, it stores the pending amounts which can be minted when limit replenishes.
- This contract also support execution of a `payload` on `destination` after all the funds are transferred to the `receiver` address. This payload can only be executed when pending mint amount is zero.
- If there is no pending amount and payload execution fails, it is cached with the `msgId` which can be retried by anyone using `retryPayloadExecution(msgId)`.

### Vault

- Vault contract is used to lock and unlock tokens within a certain daily limit and rate.
- If max limits reaches, it stores the pending amounts which can be unlocked when limit replenishes.
- This contract also support execution of a `payload` on `destination` after all the funds are transferred to the `receiver` address. This payload can only be executed when pending unlock amount is zero.
- If there is no pending amount and payload execution fails, it is cached with the `msgId` which can be retried by anyone using `retryPayloadExecution(msgId)`.

## Throttling

- Each connector has a configurable `maxLimit` and `ratePerSecond`.
- `maxLimit` defines the maximum amount that can be bridged in the decided time frame.
- `ratePerSecond` defines the rate at which limit is replenished once it is used. The limit keeps increasing with time till it reaches `maxLimit`.
- Eg. Suppose we want to allow maximum 3600 tokens to be deposited per hour.
  - `maxLimit = 3600`
  - `ratePerSecond = maxLimit / duration = 1`
  - If a user were to deposit 3600 tokens, no one would be able to deposit more tokens immediately.
    After 10 minutes, users would be able to deposit `10 * 60 * 1 = 600` tokens.
    After an hour, they would be able to deposit `60 * 60 * 1 = 3600` tokens.
  - If a user were to deposit 1200 tokens, users could deposit `3600 - 1200 = 2400` more tokens immediately.
    And after 10 minutes they would be able to deposit `2400 + 10 * 60 * 1 = 3000` tokens.
