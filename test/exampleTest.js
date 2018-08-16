contract('ColuLocalNetwork', async (accounts) => {
  const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
  const totalSupply = 1000

  it('should deploy the CLN token.', async () => {
    let cln = await ColuLocalNetwork.new(totalSupply, {from: accounts[0]})
    let balance = await cln.balanceOf(accounts[0])
    console.log('balance', balance.toString())
    assert.equal(balance.valueOf(), totalSupply, totalSupply + " wasn't in the first account")
  })
})
