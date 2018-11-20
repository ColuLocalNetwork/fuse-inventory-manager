[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

# Inventory Manager

The inventory manager is an [osseus](https://github.com/colucom/osseus) based server implementation for community currency issuers.

It provides blockchain reflection of offchain activities on community currencies issued against the [CLN](https://cln.network/).


## Docker

To avoid any sort of setup on your host machine, you may choose to use our docker-compose solution for a complete testing environment.

Alternatively, you can download and install Node.js and run the mongodb container only.

### Complete Testing Environment

```sh
git clone https://github.com/ColuLocalNetwork/inventory-manager
cd inventory-manager/docker/test
sudo docker-compose up -d
```

The last command will build and run the environment. A copy of the inventory-manager folder will be bound in the app container, so you can make changes to files on your local machine and run the tests within the container.

To enter the app container:
```sh
sudo docker exec -it inventory-manager-development bash
```

And go to `/inventory-manager/home/USERNAME/**/inventory-manager` to run `npm test` or other commands.

### MondoDB Container

```sh
git clone https://github.com/ColuLocalNetwork/inventory-manager
cd inventory-manager/docker/mongo
sudo docker-compose up -d
```

Then, you'll be able to reach the container by pinging http://localhost:27017.

With the MongoDB container, you won't be required to install it as a dependency in the list below.

## Dependencies

To make sure that the following instructions work, please install the following dependencies
on you machine:

- Node.js (comes with a bundled npm)
- Git
- MongoDB

## Installation

To get the source of `inventory-manager`, clone the git repository via:

````
$ git clone https://github.com/ColuLocalNetwork/inventory-manager
````

This will clone the complete source to your local machine.

Navigate to the project folder and install all needed dependencies via **npm**:

````
$ npm install
````

This commands installs everything which is required for building and testing the project.

## Developing
### Install nodemon: `npm i -g nodemon`
Firstly, you must install nodemon, as the dev environment uses it.

### Run locally: `npm run dev`
This task will run the application and start listening on port `8080`.

Under the hood, we use a complete [osseus](https://github.com/colucom/osseus) stack.

You will find the local configuration at [LOCAL.js](https://github.com/ColuLocalNetwork/inventory-manager/blob/master/config/LOCAL.js).

## Getting Started
See [tutorial](https://github.com/ColuLocalNetwork/inventory-manager/blob/master/GETTING-STARTED.md).


## Testing

### Source linting
`npm run lint` performs a lint for all source code using [standard js](https://standardjs.com/).

### Unit testing
`npm test` executes (as you might think) the unit tests, which are located
in [`test`](https://github.com/ColuLocalNetwork/inventory-manager/blob/master/test).

#### Enable a lot of transactions test
Before running `npm test` you should:

```
$ export A_LOT_OF_TXS={n}
```
***Notes***

* `{n}` is number of transactions to test
* There's a 1 second delay between each blockchain transaction so be patient :)

The task uses [truffle framework](https://truffleframework.com/).


## Contributing
Please see [contributing guidelines](https://github.com/ColuLocalNetwork/inventory-manager/blob/master/.github/CONTRIBUTING.md).

## License
Code released under the [MIT License](https://github.com/ColuLocalNetwork/inventory-manager/blob/master/LICENSE).
