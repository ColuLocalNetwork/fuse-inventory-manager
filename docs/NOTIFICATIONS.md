# Notifications

## Levels
* INFO
* WARNING
* CRITICAL

## Types
* SYSTEM
* GENERAL
* API
* JOB
* LISTENER
* TRANSFER_EVENT
* BLOCKCHAIN

## Defined

|           Description           	|      Type      	|   Level  	| Community Specific 	|                      Data                      	|
|:-------------------------------:	|:--------------:	|:--------:	|:------------------:	|:----------------------------------------------:	|
|   Inventory Manager is running  	|     SYSTEM     	|   INFO   	|          x         	|                        x                       	|
|        Community created        	|       API      	|   INFO   	|          v         	|              `String` community id             	|
|         Community edited        	|       API      	|   INFO   	|          v         	|              `String` community id             	|
|         Currency created        	|       API      	|   INFO   	|          x         	|              `String` currency id              	|
|         Currency edited         	|       API      	|   INFO   	|          x         	|              `String` currency id              	|
|       Market Maker created      	|       API      	|   INFO   	|          x         	|            `String` market maker id            	|
|       Market Maker edited       	|       API      	|   INFO   	|          x         	|            `String` market maker id            	|
|          Wallet created         	|       API      	|   INFO   	|          v         	|               `String` wallet id               	|
|          Wallet edited          	|       API      	|   INFO   	|          x         	|               `String` wallet id               	|
|       Transfer successful       	|       API      	|   INFO   	|          x         	|             `String` transaction id            	|
|        Change successful        	|       API      	|   INFO   	|          x         	|             `String` transaction id            	|
|        Revert successful        	|       API      	|   INFO   	|          x         	|  `Object` transaction & revert transaction ids 	|
|       Transmit successful       	|       API      	|   INFO   	|          x         	|       `Object[]` currency & transmit ids       	|
|              Start              	|       JOB      	|   INFO   	|          x         	|             `Object` job attributes            	|
|             Complete            	|       JOB      	|   INFO   	|          x         	|             `Object` job attributes            	|
|             Success             	|       JOB      	|   INFO   	|          x         	|             `Object` job attributes            	|
|               Fail              	|       JOB      	|  WARNING 	|          x         	|             `Object` job attributes            	|
|  Process currencies batch error 	|    LISTENER    	|  WARNING 	|          x         	|               `Object` the error               	|
|    Get transfer events error    	|    LISTENER    	|  WARNING 	|          x         	|               `Object` the error               	|
|        Disabled in config       	|    LISTENER    	|  WARNING 	|          x         	|                        x                       	|
|        To unknown address       	| TRANSFER_EVENT 	|  WARNING 	|          x         	|     `Object` from & to addresses and amount    	|
|       From unknown address      	| TRANSFER_EVENT 	|   INFO   	|          x         	|     `Object` from & to addresses and amount    	|
|   Deposit transaction created   	| TRANSFER_EVENT 	|   INFO   	|          x         	| `Object` blockchain & offchain transaction ids 	|
|    Known from & to addresses    	| TRANSFER_EVENT 	|   INFO   	|          x         	|     `Object` from & to addresses and amount    	|
|   Get blockchain balance error  	|   BLOCKCHAIN   	| CRITICAL 	|          x         	|            `Object` address & token            	|
| Update blockchain balance error 	|   BLOCKCHAIN   	| CRITICAL 	|          x         	|            `Object` address & token            	|
|                                 	|                	|          	|                    	|                                                	|
|                                 	|                	|          	|                    	|                                                	|