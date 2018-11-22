# Getting Started

Before using the inventory manager you will need to have a community currency issued on the blockchain (testnet/mainnet).

You issue a community currency through [civitas](https://communities.cln.network/) or using this [tutorial](https://github.com/ColuLocalNetwork/CLN-solidity/wiki/CLN-Tutorial).

After you have issued your community currency you can use the available [Inventory Manager API](https://colulocalnetwork.github.io/inventory-manager/).

## Example

For this example we will use the ropsten testnet CLN at [0x41c9d91e96b933b74ae21bcbb617369cbe022530](https://ropsten.etherscan.io/address/0x41c9d91e96b933b74ae21bcbb617369cbe022530) and issue a new community currency IMT at [0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3](https://ropsten.etherscan.io/token/0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3).

Now we will [run the inventory manager locally](https://github.com/ColuLocalNetwork/inventory-manager#run-locally-npm-run-dev) and can start using the API.

### Authorization
All requests send to the API should contain a valid JWT `Authorization` header of type `Bearer Token`.

The secret for the JWT token is the value of the config param `OSSEUS_ROUTER_JWT_SECRET`.

### Flow

* Create the CLN currency using the [create currency endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Currency-CreateCurrency).

	* Request `curl  -X POST http://localhost:8080/api/currency -H 'Content-Type: application/json' -H 'Authorization:Bearer <JWT_TOKEN>' -d '{
"cln": true, "address": "0x41C9d91E96b933b74ae21bCBb617369CBE022530", "creationTransactionHash": "0xa06b0a418df1ce9c1a315b8570c2c5a2c1ba2712fee61293499d429883d55dad", "creationBlockHash": "0x1997f3345a9b75557c5fa0d1a187265267c1a8b332239fd85ebc12be717850f4", "creationBlockNumber": 2684045}'`

	* Response `{"id":"5bcdca167b42b274bab942c6","createdAt":"2018-10-22T13:01:10.857Z","updatedAt":"2018-10-22T13:01:10.857Z","currencyType":"CLN","address":"0x41c9d91e96b933b74ae21bcbb617369cbe022530","blockchainInfo":{"blockHash":"0x1997f3345a9b75557c5fa0d1a187265267c1a8b332239fd85ebc12be717850f4","blockNumber":2684045,"transactionHash":"0xa06b0a418df1ce9c1a315b8570c2c5a2c1ba2712fee61293499d429883d55dad"}}`

* Create the IMT community currency using the [create currency endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Currency-CreateCurrency).

	* Request `curl -X POST http://localhost:8080/api/currency -H 'Content-Type: application/json' -H 'Authorization:Bearer <JWT_TOKEN>' -d '{
  "address": "0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3",
  "creationTransactionHash": "0xe7307b4f1f49f7a5f75e03e419c08d8f3405f65fe70dfba8b5814be3c9c9e69e",
  "creationBlockHash": "0xc5143f36a8129eea1faae562f9dac21e307b54a12ccf833824a3f6d8d02d09f5",
  "creationBlockNumber": 4279718
}'`
	* Response `{"id":"5bcdcb0d7b42b274bab942c9","createdAt":"2018-10-22T13:05:17.281Z","updatedAt":"2018-10-22T13:05:17.281Z","currencyType":"CC","address":"0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3","blockchainInfo":{"blockHash":"0xc5143f36a8129eea1faae562f9dac21e307b54a12ccf833824a3f6d8d02d09f5","blockNumber":4279718,"transactionHash":"0xe7307b4f1f49f7a5f75e03e419c08d8f3405f65fe70dfba8b5814be3c9c9e69e"}}`

* Create the IMT market maker using the [create market maker endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-MarketMaker-CreateMarketMaker).
	* Request `curl -X POST http://localhost:8080/api/market-maker -H 'Content-Type: application/json' -H 'Authorization:Bearer <JWT_TOKEN>' -d '{
  "address": "0xb31f0146812cc08d2e86cd69f16c777d9f934368",
  "tokenAddress1": "0x41C9d91E96b933b74ae21bCBb617369CBE022530", "tokenAddress2": "0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3"
}'`
	* Response `{"id":"5bf6a00aea709e4a595bec39","address":"0xb31f0146812cc08d2e86cd69f16c777d9f934368","tokenAddress1":"0x41c9d91e96b933b74ae21bcbb617369cbe022530","tokenAddress2":"0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3"}`

* Create the community for the IMT using the [create community endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Community-CreateCommunity)

	* Request `curl -X POST http://localhost:8080/api/community -H 'Content-Type: application/json' -H 'Authorization:Bearer <JWT_TOKEN>' -d '{"name": "The IMT community", "defaultCurrency": "5bcdb7106e60de63018bfd22", "wallets": [{"type": "manager"}, {"type": "users"}]}'`
	* Response `{"id":"5bcdcb377b42b274bab942ce","createdAt":"2018-10-22T13:05:59.650Z","updatedAt":"2018-10-22T13:05:59.650Z","name":"The IMT community","wallets":[{"id":"5bcdcb377b42b274bab942cf","createdAt":"2018-10-22T13:05:59.730Z","updatedAt":"2018-10-22T13:05:59.730Z","type":"manager","address":"0xfb0783859a45d0d42b0c451e0c0444389d2edf46","index":0},{"id":"5bcdcb377b42b274bab942d1","createdAt":"2018-10-22T13:05:59.732Z","updatedAt":"2018-10-22T13:05:59.732Z","type":"users","address":"0x36f7f7ac5d9e0bdc7cfe5dd8097da4c04845aee5","index":1}],"defaultCurrency":"5bcdb7106e60de63018bfd22","mnemonic":"barely cook now winter feature onion latin innocent twin sorry unlock miracle","uuid":"dc23d0d2-07c4-4078-98ec-a5b919e96b0b"}`

###### ***IMPORTANT NOTE*** 
In the response for this endpoint there are two very imporant values which you have to store in a secure location - `mnemonic` and `uuid`.

Those two values along with the value of `SECRET` config param are the only way to generate the private keys for the wallets of the community.


At this point the initial setup is done and we can start making offchain transactions and reflecting them on the inventory manager using the [transfer endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Transaction-Transfer) and using other API capabilities as described in the documentation.
