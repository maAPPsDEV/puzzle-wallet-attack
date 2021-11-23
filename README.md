# Solidity Game - PuzzleWallet Attack

_Inspired by OpenZeppelin's [Ethernaut](https://ethernaut.openzeppelin.com), PuzzleWallet Level_

⚠️Do not try on mainnet!

## Task

Nowadays, paying for DeFi operations is impossible, fact.

A group of friends discovered how to slightly decrease the cost of performing multiple transactions by batching them in one transaction, so they developed a smart contract for doing this.

They needed this contract to be upgradeable in case the code contained a bug, and they also wanted to prevent people from outside the group from using it. To do so, they voted and assigned two people with special roles in the system: The admin, which has the power of updating the logic of the smart contract. The owner, which controls the whitelist of addresses allowed to use the contract. The contracts were deployed, and the group was whitelisted. Everyone cheered for their accomplishments against evil miners.

Little did they know, their lunch money was at risk…

  You'll need to hijack this wallet to become the admin of the proxy.

_Hint:_

1. Understanding how `delegatecall`s work and how `msg.sender` and `msg.value` behaves when performing one.
2. Knowing about proxy patterns and the way they handle storage variables.

## What will you learn?

1. The whole thing about `delegatecall` vulnerability
2. The storage slot order between proxy and its implementation

## Spoiler: Solution 🤐

### Keyword

**`delegatecall`**

`delegatecall` basically says that I'm a contract and I'm allowing (delegating) you to do whatever you want to my storage. `delegatecall` is a security risk for the sending contract which needs to trust that the receiving contract will treat the storage well. i.e. If Alice invokes Bob who does `delegatecall` to Charlie, the `msg.sender` in the `delegatecall` is Alice. So, `delegatecall` just uses the code of the target contract, but the storage of the current contract.

**Proxy Pattern**

One of the biggest advantages of Ethereum is that every transaction of moving funds, every contract deployed, and every transaction made to a contract is immutable on a public ledger we call the blockchain. There is no way to hide or amend any transactions ever made. The huge benefit is that any node on the Ethereum network can verify the validity and state of every transaction making Ethereum a very robust decentralized system. But the biggest disadvantage is that you cannot change the source code of your smart contract after it’s been deployed. Developers working on centralized applications (like Facebook, or Airbnb) are used to frequent updates in order to fix bugs or introduce new features. This is impossible to do on Ethereum with traditional patterns.

So, in order to build an upgradable contract, we can consider a proxy contract that interacts user and pass through it to our logic contract. Every proxy contract use `delegatecall` to execute the logic in logic contract.

### Step by step


## Source Code

⚠️This contract contains a bug or risk. Do not use on mainnet!

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/proxy/UpgradeableProxy.sol";

contract PuzzleProxy is UpgradeableProxy {
    address public pendingAdmin;
    address public admin;

    constructor(address _admin, address _implementation, bytes memory _initData) UpgradeableProxy(_implementation, _initData) public {
        admin = _admin;
    }

    modifier onlyAdmin {
      require(msg.sender == admin, "Caller is not the admin");
      _;
    }

    function proposeNewAdmin(address _newAdmin) external {
        pendingAdmin = _newAdmin;
    }

    function approveNewAdmin(address _expectedAdmin) external onlyAdmin {
        require(pendingAdmin == _expectedAdmin, "Expected new admin by the current admin is not the pending admin");
        admin = pendingAdmin;
    }

    function upgradeTo(address _newImplementation) external onlyAdmin {
        _upgradeTo(_newImplementation);
    }
}

contract PuzzleWallet {
    using SafeMath for uint256;
    address public owner;
    uint256 public maxBalance;
    mapping(address => bool) public whitelisted;
    mapping(address => uint256) public balances;

    function init(uint256 _maxBalance) public {
        require(maxBalance == 0, "Already initialized");
        maxBalance = _maxBalance;
        owner = msg.sender;
    }

    modifier onlyWhitelisted {
        require(whitelisted[msg.sender], "Not whitelisted");
        _;
    }

    function setMaxBalance(uint256 _maxBalance) external onlyWhitelisted {
      require(address(this).balance == 0, "Contract balance is not 0");
      maxBalance = _maxBalance;
    }

    function addToWhitelist(address addr) external {
        require(msg.sender == owner, "Not the owner");
        whitelisted[addr] = true;
    }

    function deposit() external payable onlyWhitelisted {
      require(address(this).balance <= maxBalance, "Max balance reached");
      balances[msg.sender] = balances[msg.sender].add(msg.value);
    }

    function execute(address to, uint256 value, bytes calldata data) external payable onlyWhitelisted {
        require(balances[msg.sender] >= value, "Insufficient balance");
        balances[msg.sender] = balances[msg.sender].sub(value);
        (bool success, ) = to.call{ value: value }(data);
        require(success, "Execution failed");
    }

    function multicall(bytes[] calldata data) external payable onlyWhitelisted {
        bool depositCalled = false;
        for (uint256 i = 0; i < data.length; i++) {
            bytes memory _data = data[i];
            bytes4 selector;
            assembly {
                selector := mload(add(_data, 32))
            }
            if (selector == this.deposit.selector) {
                require(!depositCalled, "Deposit can only be called once");
                // Protect against reusing msg.value
                depositCalled = true;
            }
            (bool success, ) = address(this).delegatecall(data[i]);
            require(success, "Error while delegating call");
        }
    }
}

```

## Configuration

### Install Dependencies

```
yarn install
```

## Test and Attack!💥

### Run Tests

```
yarn test
```

You should see the result like following:

```
  Hacker
    √ initialize a PuzzleWallet and setup the game (186ms)
    Attack
      √ propose new admin for proxy, it should update owner for wallet (44ms)
      √ add hacker in whitelist
      √ manipulate hacker balance to be double (58ms)
      √ drain all ether out from the wallet
      √ set maxBalance again, it should finally change the admin of the proxy


  6 passing (641ms)

```
