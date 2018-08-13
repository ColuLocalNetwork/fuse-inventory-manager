const contract = require('truffle-contract')

module.exports = class Community {
  constructor (model, doc) {
    this.model = model
    this.doc = doc
  }

  model () {
    return this.model
  }

  doc () {
    return this.doc
  }
}
