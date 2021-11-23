// SPDX-License-Identifier: MIT
pragma solidity >=0.8.5 <0.9.0;

contract Hacker {
  address public hacker;

  modifier onlyHacker() {
    require(msg.sender == hacker, "caller is not the hacker");
    _;
  }

  constructor() {
    hacker = payable(msg.sender);
  }

  /**
   * @dev This time, we don't use contract to hijack the target.
   * Instead, look at test file.
   */
  function attack(address _target) public onlyHacker {}
}
