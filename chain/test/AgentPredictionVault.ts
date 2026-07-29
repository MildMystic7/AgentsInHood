import { expect } from "chai";
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.create();
const { time } = networkHelpers;

async function deployVault() {
  const [owner, alice, bob, carol] = await ethers.getSigners();
  const now = await time.latest();
  const startsAt = now + 60;
  const vault = await ethers.deployContract("AgentPredictionVault", [
    startsAt,
    owner.address,
  ]);
  await vault.waitForDeployment();

  return {
    vault,
    owner,
    alice,
    bob,
    carol,
    startsAt,
    bettingClosesAt: startsAt + 3_600,
    challengeEndsAt: startsAt + 10_800,
  };
}

describe("AgentPredictionVault", function () {
  it("opens for one hour and lets a participant add, switch, and withdraw stake", async function () {
    const { vault, alice, startsAt } = await networkHelpers.loadFixture(deployVault);

    expect(await vault.phase()).to.equal(0n);
    await time.increaseTo(startsAt);
    expect(await vault.phase()).to.equal(1n);

    await expect(vault.connect(alice).placeBet(1, { value: ethers.parseEther("1") }))
      .to.emit(vault, "BetPlaced")
      .withArgs(alice.address, 1, ethers.parseEther("1"), ethers.parseEther("1"));

    await expect(vault.connect(alice).changeAgent(3))
      .to.emit(vault, "AgentChanged")
      .withArgs(alice.address, 1, 3);

    await expect(vault.connect(alice).withdrawStake(ethers.parseEther("0.4")))
      .to.emit(vault, "StakeWithdrawn")
      .withArgs(alice.address, 3, ethers.parseEther("0.4"));

    const position = await vault.positionOf(alice.address);
    expect(position.amount).to.equal(ethers.parseEther("0.6"));
    expect(position.agentId).to.equal(3n);
    expect(await vault.agentPool(1)).to.equal(0n);
    expect(await vault.agentPool(3)).to.equal(ethers.parseEther("0.6"));
    expect(await vault.totalPool()).to.equal(ethers.parseEther("0.6"));
  });

  it("locks every stake mutation after the first hour", async function () {
    const { vault, alice, startsAt, bettingClosesAt } =
      await networkHelpers.loadFixture(deployVault);

    await time.increaseTo(startsAt);
    await vault.connect(alice).placeBet(0, { value: ethers.parseEther("1") });
    await time.increaseTo(bettingClosesAt);

    expect(await vault.phase()).to.equal(2n);
    await expect(
      vault.connect(alice).placeBet(0, { value: 1n }),
    ).to.be.revertedWithCustomError(vault, "BettingNotOpen");
    await expect(vault.connect(alice).changeAgent(1)).to.be.revertedWithCustomError(
      vault,
      "BettingNotOpen",
    );
    await expect(vault.connect(alice).withdrawStake(1n)).to.be.revertedWithCustomError(
      vault,
      "BettingNotOpen",
    );
  });

  it("allows only the owner to resolve and only after the full three hours", async function () {
    const { vault, alice, startsAt, challengeEndsAt } =
      await networkHelpers.loadFixture(deployVault);
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("challenge-02-result"));

    await time.increaseTo(startsAt);
    await vault.connect(alice).placeBet(2, { value: ethers.parseEther("1") });

    await expect(vault.resolve(2, evidenceHash)).to.be.revertedWithCustomError(
      vault,
      "ChallengeStillRunning",
    );

    await time.increaseTo(challengeEndsAt);
    expect(await vault.phase()).to.equal(3n);
    await expect(vault.connect(alice).resolve(2, evidenceHash))
      .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);

    await expect(vault.resolve(2, evidenceHash))
      .to.emit(vault, "RoundResolved")
      .withArgs(2, evidenceHash, ethers.parseEther("1"));
    expect(await vault.phase()).to.equal(4n);
  });

  it("distributes the complete pool proportionally among winner backers", async function () {
    const { vault, alice, bob, carol, startsAt, challengeEndsAt } =
      await networkHelpers.loadFixture(deployVault);
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("public-score-snapshot"));

    await time.increaseTo(startsAt);
    await vault.connect(alice).placeBet(3, { value: ethers.parseEther("1") });
    await vault.connect(bob).placeBet(3, { value: ethers.parseEther("3") });
    await vault.connect(carol).placeBet(1, { value: ethers.parseEther("6") });

    await time.increaseTo(challengeEndsAt);
    await vault.resolve(3, evidenceHash);

    expect(await vault.payoutOf(alice.address)).to.equal(ethers.parseEther("2.5"));
    await expect(vault.connect(alice).claim())
      .to.emit(vault, "PayoutClaimed")
      .withArgs(alice.address, 3, ethers.parseEther("1"), ethers.parseEther("2.5"));

    expect(await vault.payoutOf(bob.address)).to.equal(ethers.parseEther("7.5"));
    await expect(vault.connect(bob).claim())
      .to.emit(vault, "PayoutClaimed")
      .withArgs(bob.address, 3, ethers.parseEther("3"), ethers.parseEther("7.5"));

    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0n);
    await expect(vault.connect(alice).claim()).to.be.revertedWithCustomError(
      vault,
      "PositionAlreadyClaimed",
    );
    await expect(vault.connect(carol).claim()).to.be.revertedWithCustomError(
      vault,
      "WinningAgentRequired",
    );
  });

  it("cancels automatically and returns exact stakes when the winner has no backers", async function () {
    const { vault, alice, bob, startsAt, challengeEndsAt } =
      await networkHelpers.loadFixture(deployVault);
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("unbacked-winner"));

    await time.increaseTo(startsAt);
    await vault.connect(alice).placeBet(0, { value: ethers.parseEther("1.25") });
    await vault.connect(bob).placeBet(1, { value: ethers.parseEther("2.75") });

    await time.increaseTo(challengeEndsAt);
    await expect(vault.resolve(4, evidenceHash))
      .to.emit(vault, "RoundCancelled")
      .withArgs(evidenceHash, ethers.parseEther("4"));
    expect(await vault.phase()).to.equal(5n);

    await expect(vault.connect(alice).claimRefund())
      .to.emit(vault, "RefundClaimed")
      .withArgs(alice.address, ethers.parseEther("1.25"));
    await expect(vault.connect(bob).claimRefund())
      .to.emit(vault, "RefundClaimed")
      .withArgs(bob.address, ethers.parseEther("2.75"));
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0n);
  });

  it("rejects accidental direct transfers and has no operator withdrawal path", async function () {
    const { vault, owner } = await networkHelpers.loadFixture(deployVault);

    await expect(
      owner.sendTransaction({ to: await vault.getAddress(), value: 1n }),
    ).to.be.revertedWithCustomError(vault, "DirectTransferDisabled");

    const operatorWithdrawal = vault.interface.fragments.find(
      (fragment) =>
        fragment.type === "function" &&
        ["withdraw", "sweep", "drain"].some((word) =>
          fragment.name.toLowerCase().includes(word),
        ) &&
        fragment.name !== "withdrawStake",
    );
    expect(operatorWithdrawal).to.equal(undefined);
  });
});
