pragma solidity ^0.5.0;

import "./ownership/Ownable.sol";
import "./token/ERC20/IERC20.sol";
import "./crowdsale/emission/MintedCrowdsale.sol";

import "./crowdsale/Crowdsale.sol";
import "./crowdsale/validation/CappedCrowdsale.sol";
import "./crowdsale/validation/TimedCrowdsale.sol";

import "./crowdsale/distribution/RefundableCrowdsale.sol";
import "./crowdsale/distribution/PostDeliveryCrowdsale.sol";
import "./crowdsale/distribution/FinalizableCrowdsale.sol";

contract UnitedWorldICO is
    Crowdsale,
    MintedCrowdsale,
    CappedCrowdsale,
    TimedCrowdsale,
    RefundableCrowdsale,
    PostDeliveryCrowdsale,
    Ownable
{
    /* Track investor contributions */
    uint256 public investorMinCap = 100000000000000000000; // 100 USDT
    uint256 public investorHardCap = 100000000000000000000000; // 100,000 USDT
    mapping(address => uint256) public contributions;

    /* Crowdsale Stages */
    enum CrowdsaleStage {PreICO, ICO}

    /* Default to presale stage */
    CrowdsaleStage public stage = CrowdsaleStage.PreICO;

    constructor(
        uint256 _rate,
        address payable _wallet,
        IERC20 _token,
        uint256 _cap,
        uint256 _openingTime,
        uint256 _closingTime,
        uint256 _goal,
        IERC20 _stableCoin
    )
        public
        // address _icoWallet
        Crowdsale(_rate, _wallet, _token, _stableCoin)
        // Crowdsale(_rate, _wallet, _token, _stableCoin, _icoWallet)
        CappedCrowdsale(_cap)
        TimedCrowdsale(_openingTime, _closingTime)
        RefundableCrowdsale(_goal)
    {
        require(_goal <= _cap);
    }

    /**
     * @dev Returns the amount contributed so far by a sepecific user.
     * @param _beneficiary Address of contributor
     * @return User contribution so far
     */
    function getUserContribution(address _beneficiary)
        public
        view
        returns (uint256)
    {
        return contributions[_beneficiary];
    }

    function getminimumCap() public view returns (uint256) {
        return investorMinCap;
    }

    /**
     * @dev Allows admin to update the crowdsale stage
     * @param _stage Crowdsale stage
     */
    function setCrowdsaleStage(uint256 _stage) public onlyOwner {
        if (uint256(CrowdsaleStage.PreICO) == _stage) {
            stage = CrowdsaleStage.PreICO;
        } else if (uint256(CrowdsaleStage.ICO) == _stage) {
            stage = CrowdsaleStage.ICO;
        }

        // if (stage == CrowdsaleStage.PreICO) {
        //     rate = 250;
        // } else if (stage == CrowdsaleStage.ICO) {
        //     rate = 500;
        // }
    }

    /**
     * @dev forwards funds to the wallet during the PreICO stage, then the refund vault during ICO stage
     */
    function _forwardFunds(address beneficiary, uint256 weiAmount) internal {
        if (stage == CrowdsaleStage.PreICO) {
            super._forwardFunds(beneficiary, weiAmount);
        } else if (stage == CrowdsaleStage.ICO) {
            // wallet().transfer(msg.value);
            USDT.transferFrom(beneficiary, wallet(), weiAmount);
        }
    }

    /**
     * @dev Extend parent behavior requiring purchase to respect investor min/max funding cap.
     * @param _beneficiary Token purchaser
     * @param _weiAmount Amount of wei contributed
     */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount)
        internal
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);

        /* Check if user allowed ICO to sepend their USDT */
        require(
            USDT.allowance(msg.sender, address(this)) >= _weiAmount,
            "Please allow ICO to spend your USDT"
        );

        uint256 _existingContribution = contributions[_beneficiary];
        uint256 _newContribution = _existingContribution.add(_weiAmount);
        require(
            _newContribution >= investorMinCap,
            "UnitedWorldTokenCrowdsale : Investment amount is Below allowed investment amount"
        );
        require(
            _newContribution <= investorHardCap,
            "UnitedWorldTokenCrowdsale : Investment amount is Higher than allowed investment amount"
        );
        contributions[_beneficiary] = _newContribution;
    }

    function extendTime(uint256 closingTime) public onlyOwner {
        _extendTime(closingTime);
    }

    /**
     * @dev If goal is Reached then change to change to ICO Stage
     * etc.)
     * @param _beneficiary Address receiving the tokens
     * @param _weiAmount Value in wei involved in the purchase
     */
    function _updatePurchasingState(address _beneficiary, uint256 _weiAmount)
        internal
    {
        if (isOpen() && goalReached() && stage == CrowdsaleStage.PreICO)
            stage = CrowdsaleStage.ICO;
        super._updatePurchasingState(_beneficiary, _weiAmount);
    }

    /**
     * @dev enables token transfers, called when owner calls finalize()
     */
    function _finalization() internal {
        // Remove ICO as Minter
        ERC20Mintable _mintableToken = ERC20Mintable(address(token()));

        _mintableToken.renounceMinter();

        super._finalization();
    }
}
