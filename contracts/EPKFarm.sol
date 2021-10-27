// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract EPKFarm is Ownable {
    IERC20 private EPK_LP_TOKEN = IERC20(address(0));
    IERC20 private EPK_TOKEN = IERC20(address(0));

    uint256 private constant RACE_DECIMALS = 10000;

    uint256 public globalEPKBalance;
    uint256 public blockReward;
    uint256 public globalLPBalance;
    uint256 public endBlock;
    uint256 private latestSettleBlock;
    uint256 private latestSettledRate;

    event Harvest(address to, uint256 amount);
    event IncreaseJackpot(address from, uint256 amount);
    event Stake(address from, uint256 amount);
    event Unstake(address from, uint256 amount);

    struct Account {
        uint256 lpBalance;
        uint256 rate;
    }

    mapping(address => Account) accStacks;

    constructor(address _epkContract, address _epkLPContract) {
        EPK_TOKEN = IERC20(_epkContract);
        EPK_LP_TOKEN = IERC20(_epkLPContract);
    }

    function increaseJackpot(uint256 _amount, uint256 _endBlock)
        public
        onlyOwner
    {
        require(_amount > 0, "_amount should be positive");
        require(
            _endBlock > block.number,
            "_endblock should be greater than current block number"
        );
        SafeERC20.safeTransferFrom(
            EPK_TOKEN,
            msg.sender,
            address(this),
            _amount
        );
        uint256 _balance = 0;
        if (endBlock > block.number) {
            _balance = SafeMath.mul(
                blockReward,
                SafeMath.sub(endBlock, block.number)
            );
        }
        _balance = SafeMath.add(_balance, _amount);
        endBlock = _endBlock;
        globalEPKBalance = SafeMath.add(globalEPKBalance, _amount);
        uint256 _newBlockReward = SafeMath.div(
            _balance,
            SafeMath.sub(endBlock, block.number)
        );
        _refreshGlobalRate(globalLPBalance, _newBlockReward);
        emit IncreaseJackpot(msg.sender, _amount);
    }

    function stake(uint256 _amount) public payable {
        require(_amount > 0, "_amount should be positive");
        require(endBlock > block.number, "farm over");
        SafeERC20.safeTransferFrom(
            EPK_LP_TOKEN,
            msg.sender,
            address(this),
            _amount
        );
        Account storage _acc = accStacks[msg.sender];
        _harvest(_acc);
        uint256 _newLPBalance = SafeMath.add(globalLPBalance, _amount);
        _refreshGlobalRate(_newLPBalance, blockReward);
        _acc.lpBalance = SafeMath.add(_acc.lpBalance, _amount);
        _acc.rate = latestSettledRate;
        emit Stake(msg.sender, _amount);
    }

    function unstake() public payable {
        Account storage _acc = accStacks[msg.sender];
        require(_acc.lpBalance > 0, "lp out of balance");
        _harvest(_acc);
        emit Unstake(msg.sender, _acc.lpBalance);
        SafeERC20.safeTransfer(EPK_LP_TOKEN, msg.sender, _acc.lpBalance);
        uint256 _newLPBalance = SafeMath.sub(globalLPBalance, _acc.lpBalance);
        _acc.lpBalance = 0;
        _refreshGlobalRate(_newLPBalance, blockReward);
    }

    function harvest() public payable {
        Account storage _acc = accStacks[msg.sender];
        require(_acc.lpBalance > 0, "lp out of balance");
        _harvest(_acc);
    }

    function rewardBalanceOf(address _account)
        public
        view
        returns (uint256 _balance)
    {
        Account memory _acc = accStacks[_account];
        if (_acc.lpBalance <= 0) {
            return 0;
        }
        uint256 _runningRace = _caculateRate(
            blockReward,
            globalLPBalance,
            latestSettleBlock,
            block.number < endBlock ? block.number : endBlock
        );
        uint256 _availableRace = SafeMath.sub(
            SafeMath.add(latestSettledRate, _runningRace),
            _acc.rate
        );
        return
            SafeMath.div(
                SafeMath.mul(_availableRace, _acc.lpBalance),
                RACE_DECIMALS
            );
    }

    function lpStaked(address _account) public view returns (uint256 _balance) {
        Account memory _acc = accStacks[_account];
        return _acc.lpBalance;
    }

    function _harvest(Account storage _acc) internal {
        if (_acc.lpBalance <= 0) {
            return;
        }
        uint256 _runningrate = _caculateRate(
            blockReward,
            globalLPBalance,
            latestSettleBlock,
            block.number < endBlock ? block.number : endBlock
        );
        uint256 _latestRate = SafeMath.add(latestSettledRate, _runningrate);
        uint256 _rewardRate = SafeMath.sub(_latestRate, _acc.rate);
        if (_rewardRate > 0) {
            uint256 _rewardEPK = SafeMath.div(
                SafeMath.mul(_acc.lpBalance, _rewardRate),
                RACE_DECIMALS
            );
            SafeERC20.safeTransfer(EPK_TOKEN, msg.sender, _rewardEPK);
            _acc.rate = _latestRate;
            globalEPKBalance = SafeMath.sub(globalEPKBalance, _rewardEPK);
            emit Harvest(msg.sender, _rewardEPK);
        }
    }

    function _refreshGlobalRate(uint256 _newLPBalance, uint256 _newBlockReward)
        internal
    {
        uint256 _rate = _caculateRate(
            blockReward,
            globalLPBalance,
            latestSettleBlock,
            block.number < endBlock ? block.number : endBlock
        );
        latestSettledRate = SafeMath.add(latestSettledRate, _rate);
        latestSettleBlock = block.number;
        globalLPBalance = _newLPBalance;
        blockReward = _newBlockReward;
    }

    function _caculateRate(
        uint256 _blockReward,
        uint256 _lpBalance,
        uint256 _start,
        uint256 _end
    ) internal pure returns (uint256 _race) {
        if (_end <= _start || _lpBalance <= 0) {
            return 0;
        }
        _race = SafeMath.mul(
            SafeMath.sub(_end, _start),
            SafeMath.div(SafeMath.mul(_blockReward, RACE_DECIMALS), _lpBalance)
        );
    }
}
