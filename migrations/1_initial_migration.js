var Migrations = artifacts.require("./Migrations.sol");

module.exports = async function(deployer) {
  // console.log('******************Looking into wallet = ', await web3.eth.getAccounts());
  deployer.deploy(Migrations);
};