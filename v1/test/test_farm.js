const BigNumber = require('./bignumber.js');
const EPKFarm = artifacts.require("EPKFarm");
const ERC20PresetMinterPauser = artifacts.require("ERC20PresetMinterPauser");

const DECIMAL18 = new BigNumber('1000000000000000000');

contract("EPKFarm test", async accounts => {
    const TotalEPK = 1000;
    const LP = [100, 100];
    var farm, epk, lp;
    it("init contracts", async () => {
        epk = await ERC20PresetMinterPauser.new("EPK-Token", "EPK");
        lp = await ERC20PresetMinterPauser.new("LP-Token", "LP");
        farm = await EPKFarm.new(epk.address, lp.address);
        console.log("EPK:       ", epk.address);
        console.log("LP:        ", lp.address);
        console.log("EPKFarm:   ", farm.address);
    });

    it("mint epk and lp", async () => {
        await epk.mint(accounts[0], toDec18(TotalEPK));
        await lp.mint(accounts[1], toDec18(LP[0]));
        await lp.mint(accounts[2], toDec18(LP[1]));
        console.log("ACC0 EPK:  ", fromDec18((await epk.balanceOf(accounts[0])).toString()));
        console.log("ACC1 LP:   ", fromDec18((await lp.balanceOf(accounts[1])).toString()));
        console.log("ACC2 LP:   ", fromDec18((await lp.balanceOf(accounts[2])).toString()));
    });

    it("approve", async () => {
        await epk.approve(farm.address, toDec18(TotalEPK));
        await lp.approve(farm.address, toDec18(LP[0]), { from: accounts[1] });
        await lp.approve(farm.address, toDec18(LP[1]), { from: accounts[2] });
    });

    it("increase jackpot", async () => {
        var amount = 800;
        var blocks = 100;
        var blockNumber = (await web3.eth.getBlockNumber()) + 1;
        var globalEPKBalance = fromDec18((await farm.globalEPKBalance()));
        var blockReward = 0;
        await farm.increaseJackpot(toDec18(amount), blocks + blockNumber);

        console.log("blockNumber:           ", (await web3.eth.getBlockNumber()));
        console.log("farm.globalEPKBalance: ", fromDec18((await farm.globalEPKBalance()).toString()));
        console.log("farm.globalLPBalance:  ", fromDec18((await farm.globalLPBalance()).toString()));
        console.log("farm.blockReward:      ", fromDec18((await farm.blockReward()).toString()));
        console.log("farm.endBlock:         ", (await farm.endBlock()).toString());

        assert.equal(blockNumber + blocks, (await farm.endBlock()), "block number error");
        assert.equal(Number(globalEPKBalance) + amount, fromDec18((await farm.globalEPKBalance())), "epk balance error");
        assert.equal(amount / blocks, fromDec18((await farm.blockReward())), 'reward error');
    });
    it("skip 10 blocks", async () => {
        for (var i = 0; i < 10; i++) {
            await epk.transfer(accounts[0], 1, { from: accounts[0] });
        }
        console.log("blockNumber:   ", (await web3.eth.getBlockNumber()));
    });

    it("accounts[1] stake", async () => {
        var amount = 10;
        var account = accounts[1];
        var lpBalance = fromDec18(await farm.globalLPBalance());
        await farm.stake(toDec18(amount), { from: account });
        console.log("blockNumber:           ", (await web3.eth.getBlockNumber()));
        console.log("farm.globalEPKBalance: ", fromDec18((await farm.globalEPKBalance()).toString()));
        console.log("farm.globalLPBalance:  ", fromDec18((await farm.globalLPBalance()).toString()));
        console.log("farm.blockReward:      ", fromDec18((await farm.blockReward()).toString()));
        console.log("farm.endBlock:         ", (await farm.endBlock()).toString());

        assert.equal(amount, fromDec18(await farm.lpStaked(account)), "account[0]'s lp balance error");
        assert.equal(amount + Number(lpBalance), fromDec18(await farm.globalLPBalance()), "farm lp balance error");
    });

    it("skip 10 blocks...", async () => {
        for (var i = 0; i < 10; i++) {
            await epk.transfer(accounts[0], 1, { from: accounts[0] });
        }
        console.log("blockNumber:   ", (await web3.eth.getBlockNumber()));
    });

    it("accounts[2] stake", async () => {
        var amount = 20;
        var account = accounts[2];
        var lpBalance = fromDec18(await farm.globalLPBalance());
        await farm.stake(toDec18(amount), { from: account });
        console.log("blockNumber:           ", (await web3.eth.getBlockNumber()));
        console.log("farm.globalEPKBalance: ", fromDec18((await farm.globalEPKBalance()).toString()));
        console.log("farm.globalLPBalance:  ", fromDec18((await farm.globalLPBalance()).toString()));
        console.log("farm.blockReward:      ", fromDec18((await farm.blockReward()).toString()));
        console.log("farm.endBlock:         ", (await farm.endBlock()).toString());

        assert.equal(amount, fromDec18(await farm.lpStaked(account)), "account[0]'s lp balance error");
        assert.equal(amount + Number(lpBalance), fromDec18(await farm.globalLPBalance()), "farm lp balance error");
    });

    it("skip 10 blocks...", async () => {
        for (var i = 0; i < 10; i++) {
            await epk.transfer(accounts[0], 1, { from: accounts[0] });
        }
        console.log("blockNumber:   ", (await web3.eth.getBlockNumber()));
    });

    it("accounts[1] harvest", async () => {
        var account = accounts[1];
        var epkBalance = Number(fromDec18(await epk.balanceOf(account)));
        var farmEPKBalance = Number(fromDec18(await farm.globalEPKBalance()));
        var reward = Number(fromDec18(await farm.rewardBalanceOf(account)));
        await farm.harvest({ from: account });

        console.log("farm.globalEPKBalance: ", fromDec18((await farm.globalEPKBalance()).toString()));
        console.log("farm.rewardBalanceOf:  ", fromDec18((await farm.rewardBalanceOf(account)).toString()));
        console.log("epk.balanceOf:         ", fromDec18((await epk.balanceOf(account)).toString()));
        console.log(farmEPKBalance - Number(fromDec18(await farm.globalEPKBalance())));
        assert.equal(0, fromDec18(await farm.rewardBalanceOf(account)), "account[1]'s reward balance error");
        assert.equal((farmEPKBalance - Number(fromDec18(await farm.globalEPKBalance()))).toFixed(3), (Number(fromDec18(await epk.balanceOf(account))) - epkBalance).toFixed(3), "account[1]'s epk balance error");
    });

    it("accounts[1] reward", async () => {
        var account = accounts[1];
        var rewardBalance = Number(fromDec18(await farm.rewardBalanceOf(account)));
        await epk.transfer(accounts[0], 1, { from: accounts[0] });//skip 1 block
        console.log("farm.rewardBalanceOf:  ", fromDec18((await farm.rewardBalanceOf(account)).toString()));
        var blockReward = Number(fromDec18(await farm.blockReward()));
        var lpBalance = fromDec18(await farm.globalLPBalance());
        var staked = Number(fromDec18(await farm.lpStaked(account)));
        console.log("farm.blockReward:      ", blockReward);
        console.log("farm.globalLPBalance:  ", lpBalance);
        console.log("farm.lpStaked:         ", staked);
        assert.isTrue(Math.abs((rewardBalance + (blockReward * staked / lpBalance)).toFixed(3) - (Number(fromDec18(await farm.rewardBalanceOf(account))) - rewardBalance).toFixed(3)) <= 0.001, "account[1]'s reward balance error");
    });

    it("accounts[1] unStake", async () => {
        var account = accounts[1];
        var amount = fromDec18(await farm.lpStaked(account));
        var lpBalance = fromDec18(await farm.globalLPBalance());
        await farm.unstake({ from: account });
        console.log("blockNumber:           ", (await web3.eth.getBlockNumber()));
        console.log("farm.globalEPKBalance: ", fromDec18((await farm.globalEPKBalance()).toString()));
        console.log("farm.globalLPBalance:  ", fromDec18((await farm.globalLPBalance()).toString()));
        console.log("farm.blockReward:      ", fromDec18((await farm.blockReward()).toString()));
        console.log("farm.endBlock:         ", (await farm.endBlock()).toString());

        assert.equal(0, fromDec18(await farm.lpStaked(account)), "account[1]'s lp balance error");
        assert.equal(Number(lpBalance) - amount, fromDec18(await farm.globalLPBalance()), "farm lp balance error");
    });

    it("skip 10 blocks...", async () => {
        for (var i = 0; i < 10; i++) {
            await epk.transfer(accounts[0], 1, { from: accounts[0] });
        }
        console.log("blockNumber:   ", (await web3.eth.getBlockNumber()));
    });

    it("accounts[2] harvest", async () => {
        var account = accounts[2];
        var epkBalance = Number(fromDec18(await epk.balanceOf(account)));
        var farmEPKBalance = Number(fromDec18(await farm.globalEPKBalance()));
        var reward = Number(fromDec18(await farm.rewardBalanceOf(account)));
        await farm.harvest({ from: account });

        console.log("farm.globalEPKBalance: ", fromDec18((await farm.globalEPKBalance()).toString()));
        console.log("farm.rewardBalanceOf:  ", fromDec18((await farm.rewardBalanceOf(account)).toString()));
        console.log("epk.balanceOf:         ", fromDec18((await epk.balanceOf(account)).toString()));
        console.log(farmEPKBalance - Number(fromDec18(await farm.globalEPKBalance())));
        assert.equal(0, fromDec18(await farm.rewardBalanceOf(account)), "account[1]'s reward balance error");
        assert.equal((farmEPKBalance - Number(fromDec18(await farm.globalEPKBalance()))).toFixed(3), (Number(fromDec18(await epk.balanceOf(account))) - epkBalance).toFixed(3), "account[1]'s epk balance error");
    });

    it("skip 10 blocks...", async () => {
        for (var i = 0; i < 10; i++) {
            await epk.transfer(accounts[0], 1, { from: accounts[0] });
        }
        console.log("blockNumber:   ", (await web3.eth.getBlockNumber()));
    });

    it("accounts[2] unStake", async () => {
        var account = accounts[2];
        var amount = fromDec18(await farm.lpStaked(account));
        var lpBalance = fromDec18(await farm.globalLPBalance());
        await farm.unstake({ from: account });
        console.log("blockNumber:           ", (await web3.eth.getBlockNumber()));
        console.log("farm.globalEPKBalance: ", fromDec18((await farm.globalEPKBalance()).toString()));
        console.log("farm.globalLPBalance:  ", fromDec18((await farm.globalLPBalance()).toString()));
        console.log("farm.blockReward:      ", fromDec18((await farm.blockReward()).toString()));
        console.log("farm.endBlock:         ", (await farm.endBlock()).toString());

        assert.equal(0, fromDec18(await farm.lpStaked(account)), "account[0]'s lp balance error");
        assert.equal(Number(lpBalance) - amount, fromDec18(await farm.globalLPBalance()), "farm lp balance error");
    });

});

function toDec18(input) {
    return ((new BigNumber(input)).multipliedBy(DECIMAL18)).toFixed();
}

function fromDec18(input) {
    input = new BigNumber(input);
    return input.div(DECIMAL18).toFixed();
}
