import { expect } from "chai";
import hre from "hardhat";

const { ethers, networkHelpers } = await hre.network.create();
const { time } = networkHelpers;

const MINIMUM_STAKE = ethers.parseEther("0.01");
const MAXIMUM_STAKE = ethers.parseEther("10");
const MAXIMUM_POOL = ethers.parseEther("20");
const DISPUTE_DURATION = 3_600;

async function deployVaultWithRegistry(restricted: boolean) {
  const [owner, alice, bob, carol, outsider] = await ethers.getSigners();
  const now = await time.latest();
  const startsAt = now + 60;

  const registry = await ethers.deployContract("WalletEligibilityRegistry", [
    owner.address,
    [],
  ]);
  await registry.waitForDeployment();
  await registry.setEligibilityBatch(
    [alice.address, bob.address, carol.address],
    [true, true, true],
  );

  const vault = await ethers.deployContract("AgentPredictionVault", [
    startsAt,
    owner.address,
    MINIMUM_STAKE,
    MAXIMUM_STAKE,
    MAXIMUM_POOL,
    DISPUTE_DURATION,
    restricted ? await registry.getAddress() : ethers.ZeroAddress,
  ]);
  await vault.waitForDeployment();

  return {
    vault,
    registry,
    owner,
    alice,
    bob,
    carol,
    outsider,
    startsAt,
    bettingClosesAt: startsAt + 3_600,
    challengeEndsAt: startsAt + 10_800,
  };
}

async function deployVault() {
  return deployVaultWithRegistry(false);
}

async function deployRestrictedVault() {
  return deployVaultWithRegistry(true);
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

  it("enforces minimum, per-wallet maximum, total pool cap, and the lock boundary", async function () {
    const { vault, alice, bob, carol, startsAt, bettingClosesAt } =
      await networkHelpers.loadFixture(deployVault);

    await time.increaseTo(startsAt);
    await expect(
      vault.connect(alice).placeBet(0, { value: MINIMUM_STAKE - 1n }),
    ).to.be.revertedWithCustomError(vault, "MinimumStakeRequired");
    await expect(
      vault.connect(alice).placeBet(0, { value: MAXIMUM_STAKE + 1n }),
    ).to.be.revertedWithCustomError(vault, "MaximumStakeExceeded");

    await vault.connect(alice).placeBet(0, { value: MAXIMUM_STAKE });
    await vault.connect(bob).placeBet(1, { value: MAXIMUM_STAKE });
    await expect(
      vault.connect(carol).placeBet(2, { value: MINIMUM_STAKE }),
    ).to.be.revertedWithCustomError(vault, "MaximumPoolExceeded");
    await expect(
      vault.connect(alice).withdrawStake(MAXIMUM_STAKE - MINIMUM_STAKE + 1n),
    ).to.be.revertedWithCustomError(vault, "MinimumStakeRequired");

    await time.increaseTo(bettingClosesAt);
    expect(await vault.phase()).to.equal(2n);
    await expect(
      vault.connect(alice).placeBet(0, { value: MINIMUM_STAKE }),
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

  it("enforces an optional on-chain eligibility gate", async function () {
    const { vault, registry, owner, alice, outsider, startsAt } =
      await networkHelpers.loadFixture(deployRestrictedVault);

    await time.increaseTo(startsAt);
    await vault.connect(alice).placeBet(0, { value: MINIMUM_STAKE });
    await expect(
      vault.connect(outsider).placeBet(0, { value: MINIMUM_STAKE }),
    ).to.be.revertedWithCustomError(vault, "IneligibleParticipant");

    await registry.connect(owner).setEligibility(outsider.address, true);
    await vault.connect(outsider).placeBet(1, { value: MINIMUM_STAKE });
  });

  it("requires owner proposal, evidence, and a full dispute period before finalization", async function () {
    const { vault, alice, startsAt, challengeEndsAt } =
      await networkHelpers.loadFixture(deployVault);
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("challenge-02-result"));

    await time.increaseTo(startsAt);
    await vault.connect(alice).placeBet(2, { value: ethers.parseEther("1") });

    await expect(vault.proposeResult(2, evidenceHash)).to.be.revertedWithCustomError(
      vault,
      "ChallengeStillRunning",
    );

    await time.increaseTo(challengeEndsAt);
    await expect(vault.connect(alice).proposeResult(2, evidenceHash))
      .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);
    await expect(vault.proposeResult(2, ethers.ZeroHash)).to.be.revertedWithCustomError(
      vault,
      "InvalidEvidence",
    );

    await expect(vault.proposeResult(2, evidenceHash))
      .to.emit(vault, "ResultProposed");
    await expect(vault.finalizeResult()).to.be.revertedWithCustomError(
      vault,
      "ResultDisputeActive",
    );

    await time.increaseTo(Number(await vault.resultFinalizesAt()));
    await expect(vault.retractResult(evidenceHash)).to.be.revertedWithCustomError(
      vault,
      "ResultDisputeEnded",
    );
    await expect(vault.cancel(evidenceHash)).to.be.revertedWithCustomError(
      vault,
      "ResultDisputeEnded",
    );
    await expect(vault.connect(alice).finalizeResult())
      .to.emit(vault, "RoundResolved")
      .withArgs(2, evidenceHash, ethers.parseEther("1"));
    expect(await vault.phase()).to.equal(4n);
  });

  it("allows a bad proposal to be retracted and replaced", async function () {
    const { vault, startsAt, challengeEndsAt } =
      await networkHelpers.loadFixture(deployVault);
    const wrong = ethers.keccak256(ethers.toUtf8Bytes("wrong"));
    const reason = ethers.keccak256(ethers.toUtf8Bytes("correction"));
    const correct = ethers.keccak256(ethers.toUtf8Bytes("correct"));

    await time.increaseTo(startsAt);
    await vault.placeBet(1, { value: ethers.parseEther("1") });
    await time.increaseTo(challengeEndsAt);

    await vault.proposeResult(0, wrong);
    await expect(vault.retractResult(reason))
      .to.emit(vault, "ResultRetracted")
      .withArgs(reason);
    expect(await vault.resultProposed()).to.equal(false);

    await vault.proposeResult(1, correct);
    await time.increaseTo(Number(await vault.resultFinalizesAt()));
    await vault.finalizeResult();
    expect(await vault.winningAgent()).to.equal(1n);
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
    await vault.proposeResult(3, evidenceHash);
    await time.increaseTo(Number(await vault.resultFinalizesAt()));
    await vault.finalizeResult();

    expect(await vault.payoutOf(alice.address)).to.equal(ethers.parseEther("2.5"));
    await expect(vault.connect(alice).claim())
      .to.emit(vault, "PayoutClaimed")
      .withArgs(alice.address, 3, ethers.parseEther("1"), ethers.parseEther("2.5"));

    expect(await vault.payoutOf(bob.address)).to.equal(ethers.parseEther("7.5"));
    await expect(vault.connect(bob).claim())
      .to.emit(vault, "PayoutClaimed")
      .withArgs(bob.address, 3, ethers.parseEther("3"), ethers.parseEther("7.5"));

    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0n);
  });

  it("cancels automatically and returns exact stakes when the winner has no backers", async function () {
    const { vault, alice, bob, startsAt, challengeEndsAt } =
      await networkHelpers.loadFixture(deployVault);
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("unbacked-winner"));

    await time.increaseTo(startsAt);
    await vault.connect(alice).placeBet(0, { value: ethers.parseEther("1.25") });
    await vault.connect(bob).placeBet(1, { value: ethers.parseEther("2.75") });

    await time.increaseTo(challengeEndsAt);
    await vault.proposeResult(4, evidenceHash);
    await time.increaseTo(Number(await vault.resultFinalizesAt()));
    await expect(vault.finalizeResult())
      .to.emit(vault, "RoundCancelled")
      .withArgs(evidenceHash, ethers.parseEther("4"));

    await expect(vault.connect(alice).claimRefund())
      .to.emit(vault, "RefundClaimed")
      .withArgs(alice.address, ethers.parseEther("1.25"));
    await expect(vault.connect(bob).claimRefund())
      .to.emit(vault, "RefundClaimed")
      .withArgs(bob.address, ethers.parseEther("2.75"));
  });

  it("rejects direct transfers, owner withdrawal paths, and ownership renunciation", async function () {
    const { vault, owner } = await networkHelpers.loadFixture(deployVault);

    await expect(
      owner.sendTransaction({ to: await vault.getAddress(), value: 1n }),
    ).to.be.revertedWithCustomError(vault, "DirectTransferDisabled");
    await expect(vault.renounceOwnership()).to.be.revertedWithCustomError(
      vault,
      "OwnershipRenunciationDisabled",
    );

    const operatorWithdrawal = vault.interface.fragments.find((fragment) => {
      if (fragment.type !== "function" || !("name" in fragment)) return false;
      const name = String(fragment.name);
      return (
        ["withdraw", "sweep", "drain"].some((word) =>
          name.toLowerCase().includes(word),
        ) && name !== "withdrawStake"
      );
    });
    expect(operatorWithdrawal).to.equal(undefined);
  });
});

describe("WalletEligibilityRegistry", function () {
  it("is owner-controlled, contains no identity data, and uses two-step ownership", async function () {
    const [owner, nextOwner, alice] = await ethers.getSigners();
    const registry = await ethers.deployContract("WalletEligibilityRegistry", [
      owner.address,
      [alice.address],
    ]);
    await registry.waitForDeployment();

    await expect(registry.connect(alice).setEligibility(alice.address, true))
      .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);
    expect(await registry.isEligible(alice.address)).to.equal(true);

    await registry.transferOwnership(nextOwner.address);
    await registry.connect(nextOwner).acceptOwnership();
    expect(await registry.owner()).to.equal(nextOwner.address);
    await expect(registry.connect(nextOwner).renounceOwnership()).to.be.revertedWithCustomError(
      registry,
      "OwnershipRenunciationDisabled",
    );
  });
});
