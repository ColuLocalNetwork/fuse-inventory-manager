const contract = require('truffle-contract')

module.exports = class Currency {
  constructor (model, doc) {
    this.model = model
    this.doc = doc
    this.ccContract = contract({abi: doc.ccABI})
    this.mmContract = contract({abi: doc.mmABI})
  }

  model () {
    return this.model
  }

  doc () {
    return this.doc
  }

  ccContract () {
    return this.ccContract
  }

  mmContract () {
    return this.mmContract
  }
}
