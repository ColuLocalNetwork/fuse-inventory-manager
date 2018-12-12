# Configuration

See [LOCAL.js](https://github.com/ColuLocalNetwork/inventory-manager/blob/master/config/LOCAL.js) for an example of a configuration file.

See [osseus-config](https://github.com/colucom/osseus-config) for detailed explanation on how to set/use the configuration.

#### non-osseus config variables

|                Key                  | Mandatory   |   Type    |                                                              Description                                                              | Default   |
|:---------------------------------:  |:---------:  |:-------:  |:------------------------------------------------------------------------------------------------------------------------------------: |:-------:  |
|              `DEBUG`                |     x       | Boolean   |                                                     Activate specific debug logs                                                      |  false    |
|          `WEB3_PROVIDER`            |     v       |  String   |                                          URL through which the app "talks" to the blockchain                                          |           |
|              `SECRET`               |     v       |  String   |                                          Part of the password to encrypt community mnemonic                                           |           |
|      `BLOCKS_TO_CONFIRM_BCTX`       |     v       |  Number   |                                  Blocks to be mined until a transaction is considered as "CONFIRMED"                                  |           |
|    `NOTIFICATIONS_WEBHOOK_URL`      |     x       |  String   |                                                    URL to receive notifications on                                                    |           |
| `NOTIFICATIONS_WEBHOOK_MIN_LEVEL`   |     x       |  String   | Minimum [notification level](https://github.com/ColuLocalNetwork/inventory-manager/blob/master/NOTIFICATIONS.md#levels) for web-hook  |           |
|      `CURRENCIES_BATCH_SIZE`        |     x       |  Number   |                                    Currencies to process in parallel on transmit & events listener                                    |    10     |
|           `NO_LISTENERS`            |     x       | Boolean   |                                                      Deactivate events listeners                                                      |  false    |
|       `PAST_EVENTS_INTERVAL`        |     x       |  Number   |                                               Milliseconds interval to get past events                                                |  60000    |
|     `PAST_EVENTS_BLOCK_LIMIT`       |     x       |  Number   |                                                   Blocks to get past events at once                                                   |   1000    |