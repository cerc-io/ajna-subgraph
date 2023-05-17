# Ajna Pools Subgraph

[Ajna](https://www.ajna.finance/) is a non-custodial, peer-to-peer, permissionless lending, borrowing and trading system that requires no governance or external price feeds to function.

This Subgraph ingests contracts used by the Ajna Protocol. Core contracts can be found [here](https://github.com/ajna-finance/contracts).


## Installation
Install using `yarn`, because `npm` has an issue installing [Gluegun](https://github.com/infinitered/gluegun).
```
sudo yarn global add @graphprotocol/graph-cli
yarn install
```

Configure `ETH_RPC_URL` for your target network in `.env`.

If you will change ABIs, please install `jq`.


## Querying
The dockerized deployment offers a query UI at http://localhost:8000/subgraphs/name/ajna/graphql.

Below are some examples of queries that can be made to the Ajna Subgraph.

List pools showing their tokens and how many transactions have been performed on them:
```
{
  pools {
    id
    txCount
    quoteToken {
      id
      symbol
    }
    collateralToken {
      id
      symbol
    }
  }
}
```

Positions for a specific lender across all pools:
```
{
  accounts(where: {id:"0x31bcbe14ad30b2f7e1e4a14cab2c16849b73dac3"}) {
    id
    lends {
      bucket {
        bucketIndex
        deposit
        collateral
      }
      pool {
        id
        quoteToken {
          symbol
        }
        collateralToken {
          symbol
        }
      }
    }
  }
}
```

Details for a specific pool:
```
{
  pool(id: "0xe1200aefd60559d494d4419e17419571ef8fc1eb") {
    id
    actualUtilization
    debt
    htp
    hpb
    lup
    maxBorrower
    poolSize
    reserves
    targetUtilization
    totalAjnaBurned
    totalInterestEarned
    quoteToken {
      symbol
    }
    collateralToken {
      symbol
    }
  }
}
```


## Known issues
- LP amounts on entities are not properly maintained when moving or removing liquidity.  This will be resolved in RC4.
- Support for ERC-721 collateral pools has not been implemented.
- Integration testing has not been completed.


## Design
### Types

| Value              | Type         |
| ------------------ | ------------ |
| Prices and amounts | `BigDecimal` |
| Bucket indicies    | `Int` (*u32* in AssemblyScript, *number* in TypeScript) |
| Counts and timestamps | `BigInt`  |

### Persistence / Rentention Policy

This subgraph does not retain a history of `Lends` and `Loans`.  `Lends` are discarded when all LP balance has been redeemed.  `Loans` are discarded when the lender has no debt and no collateral.

[Time-travel queries](https://thegraph.com/docs/en/querying/graphql-api/#time-travel-queries) can be used to query historical state.

This subgraph will retain a list of `Pools`, even if they have no liquidity. Pools will also retain a history of `LiquidationAuctions` and `ReserveAuctions`, which can be filtered by status.


## Development and Deployment
Commands for adding new data sources to the subgraph are listed in the [add-commands.txt](./add-commands.txt) file.

Once data sources have been added, entites can be modified in the [schema.graphql](./schema.graphql) file. After any update, the following commands must be run to ensure the new types are available for the event handlers:
```
yarn codegen
yarn build
```

After building, this subgraph can be run locally using provided docker container. To start, set the environment variable *ETH_RPC_URL* in your .env file. Then, run `docker-compose up`. Once the node is running, deploy the subgraph with:
```
yarn create-local
yarn deploy-local
```

For rough estimates, it takes ~15 minutes to index a month worth of data from an empty container.  Redeployment to an existing container takes 2-3 minutes to sync up.

Instructions on creating your own deployment are available in the [Graph Protocols Documentation](https://thegraph.com/docs/en/cookbook/quick-start/).

### Tests
Unit tests are written using the [Matchstick unit testing framework](https://github.com/LimeChain/matchstick/blob/main/README.md).  Unit tests do not guarantee your subgraph is deployable or functional.

Run the Matchstick tests by executing: 
```
yarn test
```

### Maintenance
To update for new release candidates:
1. Update ABIs using the provided `copy-abis.sh` script.  This script requires `jq` be installed.  Note `codegen` and `build` commands are not sensitive to ABI formatting, but deployment is.  ABIs formatted by Ethers.js will not work.  ABIs generated by `graph add` will not work.  In the ABI, note that all _output_ parameters must have a `name` field.  It may be blank, but the field must exist.
2. Update addresses in `constants.ts` and `subgraph.yaml`.
3. Run `npm run codegen` to find and resolve errors in code generation.
4. Review contract changes, adjusting subgraph and schema accordingly.  
5. Run `npm run build` to and resolve compliation errors.  
6. Update handlers, test mocks, and unit tests.  Run `npm run test` to find and resolve issues.
7. Start the dockerized environment and perform a local deployment to confirm functionality.

To clean out container data and autogenerated code, run the `clean.sh` script.


### Debugging
To check health, visit http://localhost:8030/graphql/playground and paste the following query:
```
{
  indexingStatuses(subgraphs: ["Qm..."]) {
    subgraph
    synced
    health
    entityCount
    fatalError {
      handler
      message
      deterministic
      block {
        hash
        number
      }
    }
    chains {
      chainHeadBlock {
        number
      }
      earliestBlock {
        number
      }
      latestBlock {
        number
      }
    }
  }
}
```
Replace `Qm...` with the `subgraph_id` from logs, and query.  If the indexer has failed, this may reveal the error.

The following red herrings occassionally appear in logs:
- `ERRO registering metric [deployment_handler_execution_time] failed because it was already registered`
- `WARN Bytes contain invalid UTF8. This may be caused by attempting to convert a value such as an address that cannot be parsed to a unicode string. You may want to use 'toHexString()' instead.`
These sometimes disappear upon redeployment with no changes.