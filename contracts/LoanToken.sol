// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LoanToken is ERC20, Ownable {
    mapping(address => bool) public minters;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {}

    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");

        minters[minter] = true;

        emit MinterAdded(minter);
    }

    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Not a minter");

        minters[minter] = false;

        emit MinterRemoved(minter);
    }

    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "Caller is not a minter");

        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(minters[msg.sender], "Caller is not a minter");

        _burn(from, amount);
    }
}