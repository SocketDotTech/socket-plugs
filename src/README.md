### Gauge

- Abstract contract used to implement rate limits.

### ConnectorPlugs

- Vault and Controller connect to socket via ConnectorPlugs
- This is to enable support of multiple switchboards on same path.

### Vault

- Contract on non App chains.
- Lock and unlock amounts.
- Implements Gauge.
  - Revert on lock throttle.
  - Store pending and unlock later on unlock throttle.

### Controller

- Contract on App chain.
- Has mint and burn rights on token.
- Calls ExchangeRate contract for lock >> mint and burn >> unlock conversion.
- Implements sibling chain specific Gauge.
  - Revert on burn throttle.
  - Store pending and mint later on mint throttle.

### ExchangeRate

- Contract for lock >> mint and burn >> unlock conversion.
- Enables path to AMM based bridging.

### Todo

- [ ] Multi token support
- [ ] Update only rate and max limits of LimitParams
- [ ] Errors and events
- [ ] Rescue, pause functions
- [ ] limits scripts
- [ ]
