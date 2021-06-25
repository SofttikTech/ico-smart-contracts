import { assert } from 'chai';
import EVMRevert from './helpers/EVMRevert';
import { ether, wei, BN } from './helpers/ether';
import { latestTime } from './helpers/latestTime';
import { increaseTimeTo, duration } from './helpers/increaseTime';

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const UnitedWorldICO = artifacts.require('UnitedWorldICO');
const StableCoin = artifacts.require('StableCoin');
const UnitedWorldToken = artifacts.require('UnitedWorldToken');
const TokenTimelock = artifacts.require('TokenTimelock');

contract('UnitedWorldICO', function ([wallet, ICOWallet, investor1, investor2, investor3, investor4, foundersFund, charityFund, marketingFund, companyFund, icoFund, _]) {
  beforeEach(async function () {
    /******************************** Token configuration ********************************/

    // Stable Coin
    this._decimalsStable = 18;
    this._symbolStable = "USDT";
    this._nameStable = "USDT Token";

    // Deploy Token
    this.stableCoin = await StableCoin.new(
      this._nameStable,
      this._symbolStable,
      this._decimalsStable
    );
    this.stableCoin.mint(investor1, ether(50000000));                // Mint Investor1 almost 5 Million USDT tokens so he can invest in ICO
    this.stableCoin.mint(investor2, ether(50000000));                // Mint Investor1 almost 5 Million USDT tokens so he can invest in ICO

    this.decimals = 18;
    this.symbol = "UWT";
    this.name = "UnitedWorld Token";

    // Crowdsale config
    this.wallet = wallet;


    // Deploy Token
    this.token = await UnitedWorldToken.new(
      this.name,
      this.symbol,
      this.decimals,
      // this.wallet
    );


    /**************************** ICO Configuration ****************************/

    this.goal = ether("1000");                                   // Minimum USDT raise amount is 0.1 Million
    this.cap = ether("20000000");                                  // We want to raise 2 Million USDT


    this.rate = ether(1);                                               // 1 UWT Token is equal to 1 USDT Token

    this.openingTime = (await latestTime()).timestamp + duration.minutes(10);
    this.closingTime = this.openingTime + duration.weeks(1);


    // Investor caps
    this.investorMinCap = ether("100");                                 // Minimin invesment is 100 USDT
    this.investorHardCap = ether("100000");;                           // Maximum investment is 100,000


    this.crowdsale = await UnitedWorldICO.new(
      this.rate,
      this.wallet,
      this.token.address,
      this.cap,
      this.openingTime,
      this.closingTime,
      this.goal,
      this.stableCoin.address,
    );


    // Give ICO ability to Mint new Tokens
    await this.token.addMinter(this.crowdsale.address);


    // Track refund vault
    this.escrowAddress = await this.crowdsale.escrow();
    // this.refundVault = RefundEscrow.at(this.escrowAddress);

    // Advance time to crowdsale start
    // await increaseTimeTo(this.openingTime + 100);
  });

  describe('crowdsale', function () {
    it('tracks the rate', async function () {

      const rate = await this.crowdsale.rate();
      rate.toString().should.be.equal(this.rate.toString());
    });

    it('tracks the wallet', async function () {
      const wallet = await this.crowdsale.wallet();
      wallet.should.equal(this.wallet);
    });

    it('tracks the token', async function () {
      const token = await this.crowdsale.token();
      token.should.equal(this.token.address);
    });


    it('stable coin address', async function () {
      const usdtAddress = await this.crowdsale.USDT();
      usdtAddress.should.equal(this.stableCoin.address);
    });

  });

  describe('minted crowdsale', function () {
    it('mints tokens after purchase', async function () {
      await increaseTimeTo(this.openingTime + 1000);

      const originalTotalSupply = await this.token.totalSupply();

      this.investAmount = 150;
      await this.stableCoin.approve(this.crowdsale.address, ether(this.investAmount), { from: investor1 });
      await this.crowdsale.buyTokens(investor1, ether(this.investAmount), { value: 0, from: investor1 });

      const newTotalSupply = await this.token.totalSupply();
      assert.isTrue(newTotalSupply > originalTotalSupply);
    });
  });

  describe('capped crowdsale', async function () {
    it('has the correct hard cap', async function () {
      const cap = await this.crowdsale.cap();

      cap.toString().should.be.equal(this.cap.toString());
    });
    it('should be able to invest when invest is equal to hard cap', async function () {

      await increaseTimeTo(this.openingTime + 10);
      await this.stableCoin.approve(this.crowdsale.address, this.investorHardCap, { from: investor1 });
      await this.crowdsale.buyTokens(investor1, this.investorHardCap, { value: 0, from: investor1 });
    });

    it('should not be able to invest more than hard cap', async function () {

      await this.stableCoin.approve(this.crowdsale.address, (this.investorHardCap + ether(1)), { from: investor1 });
      await this.crowdsale.buyTokens(investor1, (this.investorHardCap + ether(1)), { value: 0, from: investor1 }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('when ico is not open', async function () {
    const currentTime = (await latestTime()).timestamp;
    it('should be able to invest', async function () {
      await this.stableCoin.approve(this.crowdsale.address, ether(1), { from: investor1 });
      await this.crowdsale.buyTokens(investor1, ether(1), { value: 0, from: investor1 });
      assert.isTrue(currentTime > this.openingTime);
    });
  });


  /*** *********************                 ************************* */
  describe('When ICO is Open', async function () {

    it('Should be able to invest', async function () {

      await increaseTimeTo(this.openingTime + 1000);
      const openingTime = this.openingTime;
      const currentTime = (await latestTime()).timestamp;

      assert.isTrue(currentTime > openingTime);
      const isOpen = await this.crowdsale.isOpen();
      isOpen.should.be.true;

      const isClosed = await this.crowdsale.hasClosed();
      isClosed.should.be.false;

      this.investAmount = 150
      const oldStableBalance = await this.stableCoin.balanceOf(investor1);

      await this.stableCoin.approve(this.crowdsale.address, ether(this.investAmount), { from: investor1 });
      await this.crowdsale.buyTokens(investor1, ether(this.investAmount), { value: 0, from: investor1 });

      const newStableBalance = await this.stableCoin.balanceOf(investor1);
      assert.isTrue(newStableBalance < oldStableBalance);


      const oldEscrowBalance = await this.stableCoin.balanceOf(this.escrowAddress);
      assert.equal(oldEscrowBalance.toString(), ether(this.investAmount))
    });
  });

  describe('timed crowdsale', function () {
    it('is open', async function () {
      const isClosed = await this.crowdsale.hasClosed();
      isClosed.should.be.false;
    });
  });

  describe('invest crowdsale before Goal', function () {
    beforeEach(async function () {

      await increaseTimeTo(this.openingTime + 100);

      this.investAmount = 200;
      this.token.balance = await this.token.balanceOf(investor1);
      this.stableBalance = await this.stableCoin.balanceOf(investor1);

      await this.stableCoin.approve(this.crowdsale.address, ether(this.investAmount), { from: investor1 });
      await this.crowdsale.buyTokens(investor1, ether(this.investAmount), { value: 0, from: investor1 });

    });

    it('transfer tokens to users escrow', async function () {

      let escrowBalance = wei(await this.crowdsale.balanceOf(investor1));
      let expectedTokens = this.investAmount / wei(this.rate);

      assert.equal(escrowBalance, expectedTokens);
    });

    it('stable coin check after purchase', async function () {

      let afterStable = await this.stableCoin.balanceOf(investor1);
      let difference = wei(this.stableBalance) - wei(afterStable);

      assert.equal(difference, this.investAmount);
    });
  });

  describe('refundable ICO', function () {
    beforeEach(async function () {

      await increaseTimeTo(this.openingTime + 10);

      const oldCurrentTime = (await latestTime()).timestamp;
      const openingTime = this.openingTime;


      assert.isTrue(oldCurrentTime > openingTime)

      await this.stableCoin.approve(this.crowdsale.address, this.investorMinCap, { from: investor1 });
      await this.crowdsale.buyTokens(investor1, this.investorMinCap, { value: 0, from: investor1 });

      // Advance time to crowdsale start //
      await increaseTimeTo(this.closingTime + 1000);

      await this.crowdsale.finalize();
    });

    it('should not have completed goal', async function () {
      let goalReached = await this.crowdsale.goalReached();
      assert.equal(goalReached, false);
    });

    it('should refund investor funds', async function () {
      let beforeBalance = wei(await this.stableCoin.balanceOf(investor1));
      await this.crowdsale.claimRefund(investor1);

      let afterBalance = wei(await this.stableCoin.balanceOf(investor1));

      let difference = afterBalance - beforeBalance;
      assert.isTrue(difference == wei(this.investorMinCap));
    });
  });

  // describe('when the crowdsale stage is ICO', function () {
  //   beforeEach(async function () {
  //     await this.crowdsale.setCrowdsaleStage(this.icoStage, { from: this.wallet });
  //     await this.stableCoin.approve(this.crowdsale.address, this.goal, { value: 0, from: investor1 });
  //     await this.crowdsale.buyTokens(investor1, this.goal, { value: 0, from: investor1 });

  //     this.oldBalance = wei(await this.stableCoin.balanceOf(this.wallet));

  //     await this.stableCoin.approve(this.crowdsale.address, this.investorMinCap, { value: 0, from: investor2 });
  //     await this.crowdsale.buyTokens(investor2, this.investorMinCap, { value: 0, from: investor2 });
  //   });

  //   it('should transfer Stable coin to admin', async function () {
  //     let newBalance = wei(await this.stableCoin.balanceOf(this.wallet));
  //     assert.isTrue(newBalance > this.oldBalance);
  //   });
  // });

  describe('Goal reached finalized ICO', function () {
    beforeEach(async function () {

      await increaseTimeTo(this.openingTime + 100);

      await this.stableCoin.approve(this.crowdsale.address, this.investorMinCap, { value: 0, from: investor2 });
      await this.crowdsale.buyTokens(investor2, this.investorMinCap, { value: 0, from: investor2 });

      await this.stableCoin.approve(this.crowdsale.address, this.goal, { value: 0, from: investor1 });
      await this.crowdsale.buyTokens(investor1, this.goal, { value: 0, from: investor1 });

      await this.stableCoin.approve(this.crowdsale.address, this.investorMinCap, { value: 0, from: investor2 });
      await this.crowdsale.buyTokens(investor2, this.investorMinCap, { value: 0, from: investor2 });

      this.adminBalanceBefore = wei(await this.stableCoin.balanceOf(this.wallet));

      // Advance time to crowdsale start //
      await increaseTimeTo(this.closingTime + 100);
      await this.crowdsale.finalize();
    });

    it('should finalized ICO', async function () {
      let finalized = await this.crowdsale.finalized();
      assert.equal(finalized, true);
    });

    it('should not be able to refund', async function () {
      await this.crowdsale.claimRefund(investor1).should.be.rejectedWith(EVMRevert);
    });

    it('should transfer stable funds raised to admin', async function () {
      this.adminBalanceAfter = wei(await this.stableCoin.balanceOf(this.wallet));
      assert.isTrue(this.adminBalanceAfter > this.adminBalanceBefore);
    });
    it('should return true on the goal reached function', async function () {
      const goalReached = await this.crowdsale.goalReached();
      assert.isTrue(goalReached)
    });

    it('should received the tokens', async function () {
      await this.crowdsale.withdrawTokens(investor1)
      const stableBalanceInvestor1 = wei(await this.stableCoin.balanceOf(investor1));
      const tokenBalanceInvestor1 = wei(await this.token.balanceOf(investor1));
      const totalSupply = await this.token.totalSupply();
      console.log(`**** totalSupply`, totalSupply.toString());
      console.log(`**** tokenBalanceInvestor1`, tokenBalanceInvestor1);

    });
  });

  describe('Finalize: TestCases', function () {

    beforeEach(async function () {

      await increaseTimeTo(this.openingTime + 100);

      await this.stableCoin.approve(this.crowdsale.address, this.investorMinCap, { value: 0, from: investor2 });
      await this.crowdsale.buyTokens(investor2, this.investorMinCap, { value: 0, from: investor2 });

      await this.stableCoin.approve(this.crowdsale.address, this.goal, { value: 0, from: investor1 });
      await this.crowdsale.buyTokens(investor1, this.goal, { value: 0, from: investor1 });

      await this.stableCoin.approve(this.crowdsale.address, this.investorMinCap, { value: 0, from: investor2 });
      await this.crowdsale.buyTokens(investor2, this.investorMinCap, { value: 0, from: investor2 });

      this.adminBalanceBefore = wei(await this.stableCoin.balanceOf(this.wallet));

      // Advance time to crowdsale start //
      await increaseTimeTo(this.closingTime + 100);
      // await this.crowdsale.finalize();
    });

    it('Invested USDT before goal reached should be able to released in Admin wallet', async function () {
      const oldAdminWalletBalance = wei(await this.stableCoin.balanceOf(this.wallet));
    });

  });


  describe('extendTime', function () {
    beforeEach(async function () {
      const isClosed = await this.crowdsale.hasClosed();
      isClosed.should.be.false;
    });

    it('extends the closingTime', async function () {
      const oldClosingTime = await this.crowdsale.closingTime();

      const newClosingTime = await this.closingTime + duration.days(1);
      await this.crowdsale.extendTime(newClosingTime);

      const extendedClosingTime = await this.crowdsale.closingTime();
      expect(extendedClosingTime.toNumber()).to.be.above(oldClosingTime.toNumber());
    });
  });


  describe('InvestNow: Testcases', async function () {

    describe('when goal is not reached', async function () {
      it('user usdt must go into the escrow', async function () {

        const oldTotalSupply = await this.token.totalSupply();

        const isOpen = await increaseTimeTo(this.openingTime + 100);
        this.investAmount = 200;
        this.token.balance = await this.token.balanceOf(investor1);
        this.stableBalance = await this.stableCoin.balanceOf(investor1);

        await this.stableCoin.approve(this.crowdsale.address, ether(this.investAmount), { from: investor1 });
        await this.crowdsale.buyTokens(investor1, ether(this.investAmount), { value: 0, from: investor1 });


        const oldEscrowBalance = await this.stableCoin.balanceOf(this.escrowAddress);
        const oldEscrowUWTBalance = await this.token.balanceOf(this.escrowAddress);
        assert.equal(oldEscrowBalance.toString(), ether(this.investAmount))

        const newTotalSupply = await this.token.totalSupply();
        assert.isTrue(newTotalSupply > oldTotalSupply)
      });

    });



    describe('when goal is  reached', async function () {
      it('user usdt must go into the adminwallet', async function () {

        await increaseTimeTo(this.openingTime + 100)
        const weiRaised = await this.crowdsale.weiRaised();

        this.investAmount = 1000;

        await this.stableCoin.approve(this.crowdsale.address, ether(this.investAmount), { from: investor1 });
        await this.crowdsale.buyTokens(investor1, ether(this.investAmount), { value: 0, from: investor1 });

        const goal = await this.crowdsale.goal()

        const newWeiRaised = await this.crowdsale.weiRaised();
        const goalReaced = await this.crowdsale.goalReached();

      });

    });
  });

  describe(' ICO FAILS, When goal is not reached, All investors USDT should be able to withdraw back their USDT', async function () {

    beforeEach(async function () {

      await increaseTimeTo(this.openingTime + 100);

      this.investAmount = 200;
      this.token.balance = await this.token.balanceOf(investor1);

      await this.stableCoin.approve(this.crowdsale.address, ether(this.investAmount), { from: investor1 });
      await this.crowdsale.buyTokens(investor1, ether(this.investAmount), { value: 0, from: investor1 });

      await increaseTimeTo(this.closingTime + 100)
      await this.crowdsale.finalize();

    });
    it('should refund usdt to investors', async function () {
      const oldBalance = await this.stableCoin.balanceOf(investor1);
      await this.crowdsale.claimRefund(investor1)
      const newBalance = await this.stableCoin.balanceOf(investor1);
      assert.isTrue(newBalance > oldBalance)
    });

    it('should Revoke mint access from ico address', async function () {

      const isMinter = await this.token.isMinter(this.crowdsale.address);
      isMinter.should.be.false;
    });
  });




});