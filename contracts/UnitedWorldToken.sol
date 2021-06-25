pragma solidity ^0.5.0;

import "./token/ERC20/ERC20Detailed.sol";
import "./token/ERC20/ERC20Mintable.sol";
import "./token/ERC20/ERC20Burnable.sol";


contract UnitedWorldToken is ERC20Mintable, ERC20Detailed, ERC20Burnable {

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) public ERC20Detailed(_name, _symbol, _decimals) {}
}