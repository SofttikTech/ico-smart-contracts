// Returns the time of the last mined block in seconds
exports.latestTime = async () => {
  return web3.eth.getBlock('latest');
}