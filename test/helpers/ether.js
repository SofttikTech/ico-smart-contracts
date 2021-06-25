exports.ether = (n) => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  )
}

exports.wei = (n) => {
  return web3.utils.fromWei(n.toString(), 'ether')
}

exports.BN = n => {
  return new web3.utils.BN(n).toString();
}