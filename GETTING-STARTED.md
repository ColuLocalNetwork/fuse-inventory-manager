# Getting Started

Before using the inventory manager you will need to have a community currency issued on the blockchain (testnet/mainnet).

You issue a community currency through [civitas](https://communities.cln.network/) or using this [tutorial](https://github.com/ColuLocalNetwork/CLN-solidity/wiki/CLN-Tutorial).

After you have issued your community currency you can use the available [Inventory Manager API](https://colulocalnetwork.github.io/inventory-manager/).

## Example

For this example we will use the ropsten testnet CLN at [0x41c9d91e96b933b74ae21bcbb617369cbe022530](https://ropsten.etherscan.io/address/0x41c9d91e96b933b74ae21bcbb617369cbe022530) and issue a new community currency IMT at [0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3](https://ropsten.etherscan.io/token/0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3).

Now we will [run the inventory manager locally](https://github.com/ColuLocalNetwork/inventory-manager/blob/master/config/LOCAL.js) and can start using the API.

### Authorization
All requests send to the API should contain a valid JWT `Authorization` header of type `Bearer Token`.

The secret for the JWT token is the value of the config param `OSSEUS_ROUTER_JWT_SECRET`.

### Flow

* Create the CLN currency using the [create currency endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Currency-CreateCurrency).

`curl  -X POST http://localhost:8080/api/currency -H 'Content-Type: application/json' -H 'Authorization:Bearer <JWT_TOKEN>' -d '{
"cln": true, "currencyAddress": "0x41C9d91E96b933b74ae21bCBb617369CBE022530", "creationTransactionHash": "0xa06b0a418df1ce9c1a315b8570c2c5a2c1ba2712fee61293499d429883d55dad", "creationBlockHash": "0x1997f3345a9b75557c5fa0d1a187265267c1a8b332239fd85ebc12be717850f4", "creationBlockNumber": 2684045}'`
	
* Create the IMT community currency using the [create currency endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Currency-CreateCurrency).

`curl -X POST http://localhost:8080/api/currency -H 'Content-Type: application/json' -H 'Authorization:Bearer <JWT_TOKEN>' -d '{
  "currencyAddress": "0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3",
  "marketMakerAddress": "0x54b35ee5d1739018a9ce29c44bdf145529136716",
  "creationTransactionHash": "0xe7307b4f1f49f7a5f75e03e419c08d8f3405f65fe70dfba8b5814be3c9c9e69e",
  "creationBlockHash": "0xc5143f36a8129eea1faae562f9dac21e307b54a12ccf833824a3f6d8d02d09f5",
  "creationBlockNumber": 4279718
}'`

* Check that the CLN was created successfuly using the [get currency by address endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Currency-GetCurrencyByAddress).

`curl http://localhost:8080/api/currency/address/0x41C9d91E96b933b74ae21bCBb617369CBE022530 -H 'Authorization:Bearer <JWT_TOKEN>'`

* Check that the IMT was created successfuly using the [get currency by address endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Currency-GetCurrencyByAddress).

`curl http://localhost:8080/api/currency/address/0xbc2a27de3e15f61012d855b7372f1bf6dcf8f2a3 -H 'Authorization:Bearer <JWT_TOKEN>'`

* Create the community for the IMT using the [create community endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Community-CreateCommunity)

`curl -X POST http://localhost:8080/api/community -H 'Content-Type: application/json' -H 'Authorization:Bearer <JWT_TOKEN>' -d '{"name": "The IMT community", "defaultCurrency": "5bcdb7106e60de63018bfd22", "wallets": [{"type": "manager"}, {"type": "users"}]}'`

###### ***IMPORTANT NOTE*** 
In the response for this endpoint there are two very imporant values which you have to store in a secure location - `mnemonic` and `uuid`.

Those two values along with the value of `SECRET` config param are the only way to generate the private keys for the wallets of the community.

* Check that the community was created successfuly using the [get community by id endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Community-GetCommunity).

`curl http://localhost:8080/api/community/id/5bcdc45f18b9c66ce99355a8 -H 'Authorization:Bearer <JWT_TOKEN>'`

* At this point the initial setup is done and we can start making offchain transactions and reflecting them on the inventory manager using the [transfer endpoint](https://colulocalnetwork.github.io/inventory-manager/#api-Transaction-Transfer) and using other API capabilities as described in the documentation.
