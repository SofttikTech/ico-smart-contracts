import { assert } from 'chai';
import { ether, wei, BN } from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import { latestTime } from './helpers/latestTime';
import { increaseTimeTo, duration } from './helpers/increaseTime';

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber'))
  .should();

const UnitedWorldToken = artifacts.require("./UnitedWorldToken.sol");
const TokenTimelock = artifacts.require('TokenTimelock');

contract('UnitedWorldToken', function ([developerFund, foundersFund, charityFund, marketingFund, companyFund,
  _icoPublicFundRound1, _icoPublicFundRound2, _icoPublicFundRound3]) {

  beforeEach(async function () {
    // Token config
    this.decimals = 18;
    this.symbol = "UWT";
    this.name = "UnitedWorldToken";

    // this.wallet = wallet;

    // Deploy Token
    this.token = await UnitedWorldToken.new(
      this.name,
      this.symbol,
      this.decimals,
      // this.wallet
    );

    this.foundersFund = foundersFund;                                          // TODO: Replace me: 10 Million & Lock for 3 years
    this.developerFund = developerFund;                                          // TODO: Replace me: 10 Million & Lock for 1 to 2 years
    this.charityFund = charityFund;                                            // TODO: Replace me: 10 Million & Lock for 3 months
    this.marketingFund = marketingFund;                                       // TODO: Replace me: 10 Million will be send directly
    this.companyFund = companyFund;                                            // TODO: Replace me: 10 Million & Lock for 3 years
    this._icoPublicFundRound1 = _icoPublicFundRound1;                          // TODO: Replace me: 10 Million for ICO
    this._icoPublicFundRound2 = _icoPublicFundRound2;                          // TODO: Replace me: 15 Million for ICO
    this._icoPublicFundRound3 = _icoPublicFundRound3;                          // TODO: Replace me: 15 Million for ICO

    this.totalSupply = "100000000";       // 100 Million

    /** Founder Round1 */
    this._releaseTimeFounder1 = (await web3.eth.getBlock('latest')).timestamp + duration.years(1);                            // 1 Year Founder Tokens TimeLock for Round 1
    this.foundersTimeLock1 = await TokenTimelock.new(this.token.address, this.foundersFund, this._releaseTimeFounder1);
    await this.token.mint(this.foundersTimeLock1.address, ether(this.totalSupply * 0.05));

    /** Founder Round1 */
    this._releaseTimeFounder2 = (await web3.eth.getBlock('latest')).timestamp + duration.years(2);                            // 2 Year Founder Tokens TimeLock for Round 2
    this.foundersTimeLock2 = await TokenTimelock.new(this.token.address, this.foundersFund, this._releaseTimeFounder2);
    await this.token.mint(this.foundersTimeLock2.address, ether(this.totalSupply * 0.05));


    /** Charity Round1 */
    this._releaseTimeCharityRound1 = (await web3.eth.getBlock('latest')).timestamp + duration.months(3);                          // 3 Months Charity Tokens TimeLock (Round 1)
    this.charityTimeLockRound1 = await TokenTimelock.new(this.token.address, this.charityFund, this._releaseTimeCharityRound1);
    await this.token.mint(this.charityTimeLockRound1.address, ether(this.totalSupply * 0.1));


    /** Charity Round2 */
    this._releaseTimeCharityRound2 = (await web3.eth.getBlock('latest')).timestamp + duration.years(1) + duration.months(3);                          // 1 year 3 Months Reserve Tokens TimeLock (Round 1)
    this.charityTimeLockRound2 = await TokenTimelock.new(this.token.address, this.charityFund, this._releaseTimeCharityRound2);
    await this.token.mint(this.charityTimeLockRound2.address, ether(this.totalSupply * 0.1));


    /** Charity Round3 */
    this._releaseTimeCharityRound3 = (await web3.eth.getBlock('latest')).timestamp + duration.years(2) + duration.months(3);                          // 2 year 3 Months Reserve Tokens TimeLock (Round 1)
    this.charityTimeLockRound3 = await TokenTimelock.new(this.token.address, this.charityFund, this._releaseTimeCharityRound3);
    await this.token.mint(this.charityTimeLockRound3.address, ether(this.totalSupply * 0.1));


    /*********** Marketing  ************/
    await this.token.mint(this.marketingFund, ether(this.totalSupply * 0.05));         //10Million tokens will be sent directly to the marketing address


    /**************Company Reserve ************/

    this._releaseTimeCompany = (await web3.eth.getBlock('latest')).timestamp + duration.years(3);                          // 3 Years Reserve Tokens TimeLock
    this.companyTimeLock = await TokenTimelock.new(this.token.address, this.companyFund, this._releaseTimeCompany);
    await this.token.mint(this.companyTimeLock.address, ether(this.totalSupply * 0.1));



    /** Developer Round1 */
    this._releaseTimeDeveloper1 = (await web3.eth.getBlock('latest')).timestamp + duration.years(1);                            // 1 Year Founder Tokens TimeLock for Round 1
    this.developerTimeLock1 = await TokenTimelock.new(this.token.address, this.developerFund, this._releaseTimeDeveloper1);
    await this.token.mint(this.developerTimeLock1.address, ether(this.totalSupply * 0.025));

    /** Developer Round1 */
    this._releaseTimeDeveloper2 = (await web3.eth.getBlock('latest')).timestamp + duration.years(2);                            // 2 Year Founder Tokens TimeLock for Round 2
    this.developerTimeLock2 = await TokenTimelock.new(this.token.address, this.developerFund, this._releaseTimeDeveloper2);
    await this.token.mint(this.developerTimeLock2.address, ether(this.totalSupply * 0.025));



  });

  describe('Token Parameters', function () {
    it('checks the symbol', async function () {
      const symbol = await this.token.symbol();
      symbol.toString().should.be.equal(this.symbol.toString());
    });

    it('checks the name', async function () {
      const name = await this.token.name();
      name.toString().should.be.equal(this.name.toString());
    });

    it('checks the decimals', async function () {
      const decimals = await this.token.decimals();
      decimals.toString().should.be.equal(this.decimals.toString());
    });
  });


  describe('TokenTimeLock and Token Distributions', function () {

    it('founder should have 5 Million Token and then Lock in round 1', async function () {
      let founderTokens = BN(await this.token.balanceOf(this.foundersTimeLock1.address));
      assert.equal(founderTokens, ether("5000000"));

      let beneficiary = await this.foundersTimeLock1.beneficiary();
      assert.equal(beneficiary, foundersFund);

      await increaseTimeTo(this._releaseTimeFounder1 + 1000);

      await this.foundersTimeLock1.release();
    });

    it('founder should have 5 Million Token and then Lock in round 2', async function () {
      let founderTokens = BN(await this.token.balanceOf(this.foundersTimeLock2.address));
      assert.equal(founderTokens, ether("5000000"));

      let beneficiary = await this.foundersTimeLock2.beneficiary();
      assert.equal(beneficiary, foundersFund);

      await increaseTimeTo(this._releaseTimeFounder2 + 1000);

      await this.foundersTimeLock2.release();
    });

    it('developer should have 2.5 Million Token and then Lock in round 1', async function () {
      let developerTokens = BN(await this.token.balanceOf(this.developerTimeLock1.address));
      assert.equal(developerTokens, ether("2500000"));

      let beneficiary = await this.developerTimeLock1.beneficiary();
      assert.equal(beneficiary, developerFund);

      await increaseTimeTo(this._releaseTimeDeveloper1 + 1000);

      await this.developerTimeLock1.release();
    });

    it('developer should have 2.5 Million Token and then Lock in round 2', async function () {
      let developerTokens = BN(await this.token.balanceOf(this.developerTimeLock2.address));
      assert.equal(developerTokens, ether("2500000"));

      let beneficiary = await this.developerTimeLock2.beneficiary();
      assert.equal(beneficiary, developerFund);

      await increaseTimeTo(this._releaseTimeDeveloper2 + 1000);

      await this.developerTimeLock2.release();
    });

    it('charity should have 10 Million Token and then Lock in round 1', async function () {

      let charityTokensRound1 = BN(await this.token.balanceOf(this.charityTimeLockRound1.address));
      assert.equal(charityTokensRound1, ether("10000000"));

      let beneficiary = await this.charityTimeLockRound1.beneficiary();
      assert.equal(beneficiary, charityFund);

      await increaseTimeTo(this._releaseTimeCharityRound1 + 1000);

      await this.charityTimeLockRound1.release();
    });

    it('charity should have 10 Million Token and then Lock in round 2', async function () {

      let charityTokensRound2 = BN(await this.token.balanceOf(this.charityTimeLockRound2.address));
      assert.equal(charityTokensRound2, ether("10000000"));

      let beneficiary = await this.charityTimeLockRound2.beneficiary();
      assert.equal(beneficiary, charityFund);

      await increaseTimeTo(this._releaseTimeCharityRound2 + 1000);

      await this.charityTimeLockRound2.release();
    });

    it('charity should have 10 Million Token and then Lock in round 3', async function () {

      let charityTokensRound3 = BN(await this.token.balanceOf(this.charityTimeLockRound3.address));
      assert.equal(charityTokensRound3, ether("10000000"));

      let beneficiary = await this.charityTimeLockRound3.beneficiary();
      assert.equal(beneficiary, charityFund);

      await increaseTimeTo(this._releaseTimeCharityRound3 + 1000);

      await this.charityTimeLockRound3.release();
    });

    it('company should have 10 Million Token and then Lock', async function () {

      let companyTokens = BN(await this.token.balanceOf(this.companyTimeLock.address));
      assert.equal(companyTokens, ether("10000000"));

      let beneficiary = await this.companyTimeLock.beneficiary();
      assert.equal(beneficiary, companyFund);

      await increaseTimeTo(this._releaseTimeCompany + 1000);

      await this.companyTimeLock.release();

      const companyBalanceAfterRelease = BN(await this.token.balanceOf(this.companyFund));

      assert.equal(companyBalanceAfterRelease, ether("10000000"));
    });

    it('sum the round charity', async function () {

      let charityTokensRound1 = BN(await this.token.balanceOf(this.charityTimeLockRound1.address));
      assert.equal(charityTokensRound1, ether("10000000"));

      let beneficiary = await this.charityTimeLockRound1.beneficiary();
      assert.equal(beneficiary, charityFund);

      await increaseTimeTo(this._releaseTimeCharityRound1 + 1000);

      await this.charityTimeLockRound1.release();

      const charityBalanceAfterRound1 = BN(await this.token.balanceOf(this.charityFund));

      assert.equal(charityBalanceAfterRound1, ether("10000000"));


      //  Round 2 


      let charityTokensRound2 = BN(await this.token.balanceOf(this.charityTimeLockRound2.address));
      assert.equal(charityTokensRound2, ether("10000000"));

      beneficiary = await this.charityTimeLockRound2.beneficiary();
      assert.equal(beneficiary, charityFund);

      await increaseTimeTo(this._releaseTimeCharityRound2 + 1000);

      await this.charityTimeLockRound2.release();

      const charityBalanceAfterRound2 = BN(await this.token.balanceOf(this.charityFund));

      assert.equal(charityBalanceAfterRound2, ether("20000000"));

      // Round 3

      let charityTokensRound3 = BN(await this.token.balanceOf(this.charityTimeLockRound3.address));
      assert.equal(charityTokensRound3, ether("10000000"));

      beneficiary = await this.charityTimeLockRound3.beneficiary();
      assert.equal(beneficiary, charityFund);

      await increaseTimeTo(this._releaseTimeCharityRound3 + 1000);

      await this.charityTimeLockRound3.release();

      const charityBalanceAfterRound3 = BN(await this.token.balanceOf(this.charityFund));
      assert.equal(charityBalanceAfterRound3, ether("30000000"));
    });


    it('sum the round founder', async function () {

      let foundersTokens1 = BN(await this.token.balanceOf(this.foundersTimeLock1.address));
      assert.equal(foundersTokens1, ether("5000000"));

      let beneficiary = await this.foundersTimeLock1.beneficiary();
      assert.equal(beneficiary, foundersFund);

      await increaseTimeTo(this._releaseTimeFounder1 + 1000);

      await this.foundersTimeLock1.release();

      const founderBalanceAfterRound1 = BN(await this.token.balanceOf(this.foundersFund));

      assert.equal(founderBalanceAfterRound1, ether("5000000"));


      //  Round 2 

      let foundersTokens2 = BN(await this.token.balanceOf(this.foundersTimeLock2.address));
      assert.equal(foundersTokens2, ether("5000000"));

      beneficiary = await this.foundersTimeLock2.beneficiary();
      assert.equal(beneficiary, foundersFund);

      await increaseTimeTo(this._releaseTimeFounder2 + 1000);

      await this.foundersTimeLock2.release();

      const founderBalanceAfterRound2 = BN(await this.token.balanceOf(this.foundersFund));

      assert.equal(founderBalanceAfterRound2, ether("10000000"));

    });

    it('sum the round developer', async function () {

      let developerTokens1 = BN(await this.token.balanceOf(this.developerTimeLock1.address));
      assert.equal(developerTokens1, ether("2500000"));

      let beneficiary = await this.developerTimeLock1.beneficiary();
      assert.equal(beneficiary, developerFund);

      await increaseTimeTo(this._releaseTimeDeveloper1 + 1000);

      await this.developerTimeLock1.release();

      const developerBalanceAfterRound1 = BN(await this.token.balanceOf(this.developerFund));

      assert.equal(developerBalanceAfterRound1, ether("2500000"));


      //  Round 2 

      let developerTokens2 = BN(await this.token.balanceOf(this.developerTimeLock2.address));
      assert.equal(developerTokens2, ether("2500000"));

      beneficiary = await this.developerTimeLock2.beneficiary();
      assert.equal(beneficiary, developerFund);

      await increaseTimeTo(this._releaseTimeDeveloper2 + 1000);

      await this.developerTimeLock2.release();

      const developerBalanceAfterRound2 = BN(await this.token.balanceOf(this.developerFund));

      assert.equal(developerBalanceAfterRound2, ether("5000000"));
    });



    it('check the balance of marketing fund', async function () {
      let marketingTokens = BN(await this.token.balanceOf(this.marketingFund));
      assert.equal(marketingTokens, ether("5000000"));
    });
  });
});