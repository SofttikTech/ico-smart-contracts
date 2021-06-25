pragma solidity ^0.5.0;

import "./token/ERC20/ERC20Detailed.sol";
import "./token/ERC20/ERC20Mintable.sol";
import "./token/ERC20/ERC20Burnable.sol";

contract StableCoin is ERC20Mintable, ERC20Burnable, ERC20Detailed {
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) public ERC20Detailed(_name, _symbol, _decimals) {}
}
