# Notifications

## Levels
* INFO
* WARNING
* CRTITICAL

## Types
* SYSTEM
* GENERAL
* API

## Defined


|             Event            	|  Type  	| Level 	| Community Specific 	|                         Data                        	|
|:----------------------------:	|:------:	|:-----:	|:------------------:	|:---------------------------------------------------:	|
| Inventory Manager is running 	| SYSTEM 	|  INFO 	|          x         	|                          x                          	|
|       Community created      	|   API  	|  INFO 	|          v         	|                `String` community id                	|
|       Community edited       	|   API  	|  INFO 	|          v         	|                `String` community id                	|
|       Currency created       	|   API  	|  INFO 	|          x         	|                 `String` currency id                	|
|        Currency edited       	|   API  	|  INFO 	|          x         	|                 `String` currency id                	|
|     Market Maker created     	|   API  	|  INFO 	|          x         	|               `String` market maker id              	|
|      Market Maker edited     	|   API  	|  INFO 	|          x         	|               `String` market maker id              	|
|        Wallet Created        	|   API  	|  INFO 	|          v         	|                  `String` wallet id                 	|
|         Wallet Edited        	|   API  	|  INFO 	|          x         	|                  `String` wallet id                 	|
|      Transfer Successful     	|   API  	|  INFO 	|          x         	|               `String` transaction id               	|
|       Change Successful      	|   API  	|  INFO 	|          x         	|               `String` transaction id               	|
|       Revert Successful      	|   API  	|  INFO 	|          x         	|    `Object` transaction & revert transaction ids    	|
|      Transmit Successful     	|   API  	|  INFO 	|          x         	| `Object[]` array of currency & related transmit ids 	|
|                              	|        	|       	|                    	|                                                     	|