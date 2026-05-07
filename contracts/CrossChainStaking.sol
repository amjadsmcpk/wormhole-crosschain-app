// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

interface ILoanToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

contract CrossChainStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public stakingToken;
    ILoanToken public loanToken;
    AggregatorV3Interface public priceFeed;

    uint256 public ltvBps; // 5000 = 50%
    uint256 public totalStaked;

    struct StakeInfo {
        uint256 stakedAmount;
        uint256 loanedAmount;
    }

    mapping(address => StakeInfo) public stakes;

    event Staked(address indexed user, uint256 amount, uint256 loanedAmount);
    event Unstaked(address indexed user, uint256 amount, uint256 burnedAmount);
    event LtvUpdated(uint256 oldLtv, uint256 newLtv);
    event PriceFeedUpdated(address oldFeed, address newFeed);

    constructor(
        address _stakingToken,
        address _loanToken,
        address _priceFeed,
        uint256 _ltvBps,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_loanToken != address(0), "Invalid loan token");
        require(_priceFeed != address(0), "Invalid price feed");
        require(_ltvBps > 0 && _ltvBps <= 10000, "Invalid LTV");

        stakingToken = IERC20(_stakingToken);
        loanToken = ILoanToken(_loanToken);
        priceFeed = AggregatorV3Interface(_priceFeed);
        ltvBps = _ltvBps;
    }

    function getLatestPrice() public view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid oracle price");
        return uint256(price); // usually 8 decimals for USD feeds
    }

    function getCollateralValueUsd(uint256 tokenAmount) public view returns (uint256) {
        uint256 price = getLatestPrice();

        // tokenAmount assumed 18 decimals, price assumed 8 decimals
        // returns USD value with 18 decimals
        return (tokenAmount * price * 1e10) / 1e18;
    }

    function getBorrowLimit(uint256 tokenAmount) public view returns (uint256) {
        uint256 collateralValueUsd = getCollateralValueUsd(tokenAmount);
        return (collateralValueUsd * ltvBps) / 10000;
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 loanAmount = getBorrowLimit(amount);

        stakes[msg.sender].stakedAmount += amount;
        stakes[msg.sender].loanedAmount += loanAmount;

        totalStaked += amount;

        loanToken.mint(msg.sender, loanAmount);

        emit Staked(msg.sender, amount, loanAmount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(stakes[msg.sender].stakedAmount >= amount, "Insufficient stake");

        uint256 burnAmount =
            (amount * stakes[msg.sender].loanedAmount) /
            stakes[msg.sender].stakedAmount;

        stakes[msg.sender].stakedAmount -= amount;
        stakes[msg.sender].loanedAmount -= burnAmount;
        totalStaked -= amount;

        loanToken.burn(msg.sender, burnAmount);
        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount, burnAmount);
    }

    function updateLtv(uint256 newLtvBps) external onlyOwner {
        require(newLtvBps > 0 && newLtvBps <= 10000, "Invalid LTV");

        uint256 oldLtv = ltvBps;
        ltvBps = newLtvBps;

        emit LtvUpdated(oldLtv, newLtvBps);
    }

    function updatePriceFeed(address newFeed) external onlyOwner {
        require(newFeed != address(0), "Invalid feed");

        address oldFeed = address(priceFeed);
        priceFeed = AggregatorV3Interface(newFeed);

        emit PriceFeedUpdated(oldFeed, newFeed);
    }
}