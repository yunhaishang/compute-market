import { expect } from "chai";
import { network } from "hardhat";
import { Contract, EventLog } from "ethers";

const { ethers } = await network.connect();

describe("ComputeMarket", function () {
  let computeMarket: Contract;
  let admin: any;
  let buyer: any;
  let other: any;
  const serviceId = 1n;
  const servicePrice = ethers.parseEther("0.1");

  beforeEach(async function () {
    [admin, buyer, other] = await ethers.getSigners();
    computeMarket = await ethers.deployContract("ComputeMarket");
    
    // 注册一个测试服务
    await computeMarket.connect(admin).registerService(serviceId, servicePrice);
  });

  describe("部署", function () {
    it("应该正确设置管理员", async function () {
      expect(await computeMarket.admin()).to.equal(admin.address);
    });

    it("初始任务计数应该为0", async function () {
      expect(await computeMarket.getTaskCount()).to.equal(0n);
    });
  });

  describe("服务管理", function () {
    it("管理员应该能够注册服务", async function () {
      const newServiceId = 2n;
      const newPrice = ethers.parseEther("0.2");
      
      await expect(computeMarket.connect(admin).registerService(newServiceId, newPrice))
        .to.emit(computeMarket, "ServiceRegistered")
        .withArgs(newServiceId, newPrice, admin.address);
      
      const service = await computeMarket.getService(newServiceId);
      expect(service.price).to.equal(newPrice);
      expect(service.active).to.be.true;
    });

    it("非管理员不能注册服务", async function () {
      await expect(
        computeMarket.connect(buyer).registerService(2n, servicePrice)
      ).to.be.revertedWith("ComputeMarket: caller is not admin");
    });

    it("应该能够更新服务价格", async function () {
      const newPrice = ethers.parseEther("0.2");
      await computeMarket.connect(admin).updateServicePrice(serviceId, newPrice);
      
      const service = await computeMarket.getService(serviceId);
      expect(service.price).to.equal(newPrice);
    });

    it("应该能够停用服务", async function () {
      await computeMarket.connect(admin).deactivateService(serviceId);
      
      const service = await computeMarket.getService(serviceId);
      expect(service.active).to.be.false;
    });
  });

  describe("购买算力", function () {
    it("应该能够购买算力并创建任务", async function () {
      await expect(
        computeMarket.connect(buyer).buyCompute(serviceId, { value: servicePrice })
      )
        .to.emit(computeMarket, "TaskCreated")
        .withArgs(1n, serviceId, buyer.address, servicePrice, (value: bigint) => value > 0n);
      
      const task = await computeMarket.getTask(1n);
      expect(task.taskId).to.equal(1n);
      expect(task.serviceId).to.equal(serviceId);
      expect(task.buyer).to.equal(buyer.address);
      expect(task.amount).to.equal(servicePrice);
      expect(task.status).to.equal(0n); // Created
    });

    it("支付金额不足应该失败", async function () {
      const insufficientAmount = ethers.parseEther("0.05");
      await expect(
        computeMarket.connect(buyer).buyCompute(serviceId, { value: insufficientAmount })
      ).to.be.revertedWith("ComputeMarket: insufficient payment");
    });

    it("购买不存在的服务应该失败", async function () {
      await expect(
        computeMarket.connect(buyer).buyCompute(999n, { value: servicePrice })
      ).to.be.revertedWith("ComputeMarket: service not active");
    });

    it("购买停用的服务应该失败", async function () {
      await computeMarket.connect(admin).deactivateService(serviceId);
      
      await expect(
        computeMarket.connect(buyer).buyCompute(serviceId, { value: servicePrice })
      ).to.be.revertedWith("ComputeMarket: service not active");
    });

    it("应该能够支付超过价格的金额", async function () {
      const overPayment = ethers.parseEther("0.15");
      await computeMarket.connect(buyer).buyCompute(serviceId, { value: overPayment });
      
      const task = await computeMarket.getTask(1n);
      expect(task.amount).to.equal(overPayment);
    });
  });

  describe("任务状态管理", function () {
    beforeEach(async function () {
      await computeMarket.connect(buyer).buyCompute(serviceId, { value: servicePrice });
    });

    it("管理员应该能够启动任务", async function () {
      await computeMarket.connect(admin).startTask(1n);
      
      const task = await computeMarket.getTask(1n);
      expect(task.status).to.equal(1n); // Running
    });

    it("非管理员不能启动任务", async function () {
      await expect(
        computeMarket.connect(buyer).startTask(1n)
      ).to.be.revertedWith("ComputeMarket: caller is not admin");
    });

    it("管理员应该能够完成任务", async function () {
      const resultHash = "0x1234567890abcdef";
      
      await expect(
        computeMarket.connect(admin).completeTask(1n, resultHash)
      )
        .to.emit(computeMarket, "TaskCompleted")
        .withArgs(1n, serviceId, buyer.address, resultHash, (value: bigint) => value > 0n);
      
      const task = await computeMarket.getTask(1n);
      expect(task.status).to.equal(2n); // Completed
      expect(task.resultHash).to.equal(resultHash);
      expect(task.completedAt).to.be.greaterThan(0n);
    });

    it("完成任务应该转移资金给管理员", async function () {
      const adminBalanceBefore = await ethers.provider.getBalance(admin.address);
      const resultHash = "0x1234567890abcdef";
      
      const tx = await computeMarket.connect(admin).completeTask(1n, resultHash);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const adminBalanceAfter = await ethers.provider.getBalance(admin.address);
      expect(adminBalanceAfter - adminBalanceBefore + gasUsed).to.equal(servicePrice);
    });

    it("管理员应该能够退款任务", async function () {
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      const resultHash = "0x1234567890abcdef";
      
      await expect(
        computeMarket.connect(admin).refundTask(1n)
      )
        .to.emit(computeMarket, "TaskRefunded")
        .withArgs(1n, serviceId, buyer.address, servicePrice, (value: bigint) => value > 0n);
      
      const task = await computeMarket.getTask(1n);
      expect(task.status).to.equal(3n); // Refunded
      
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      // 注意：由于gas费用，余额可能不完全相等，但应该接近
      expect(buyerBalanceAfter).to.be.greaterThan(buyerBalanceBefore);
    });

    it("已完成的任务不能再次完成", async function () {
      const resultHash = "0x1234567890abcdef";
      await computeMarket.connect(admin).completeTask(1n, resultHash);
      
      await expect(
        computeMarket.connect(admin).completeTask(1n, resultHash)
      ).to.be.revertedWith("ComputeMarket: task must be in Running or Created status");
    });

    it("已退款的任务不能再次退款", async function () {
      await computeMarket.connect(admin).refundTask(1n);
      
      await expect(
        computeMarket.connect(admin).refundTask(1n)
      ).to.be.revertedWith("ComputeMarket: task must be in Created or Running status");
    });
  });

  describe("管理员功能", function () {
    it("应该能够转移管理员权限", async function () {
      await computeMarket.connect(admin).transferAdmin(other.address);
      expect(await computeMarket.admin()).to.equal(other.address);
    });

    it("新管理员应该能够执行管理员操作", async function () {
      await computeMarket.connect(admin).transferAdmin(other.address);
      
      await expect(
        computeMarket.connect(other).registerService(2n, servicePrice)
      ).to.emit(computeMarket, "ServiceRegistered");
    });

    it("旧管理员不能再执行管理员操作", async function () {
      await computeMarket.connect(admin).transferAdmin(other.address);
      
      await expect(
        computeMarket.connect(admin).registerService(2n, servicePrice)
      ).to.be.revertedWith("ComputeMarket: caller is not admin");
    });
  });

  describe("查询功能", function () {
    beforeEach(async function () {
      await computeMarket.connect(buyer).buyCompute(serviceId, { value: servicePrice });
    });

    it("应该能够查询任务信息", async function () {
      const task = await computeMarket.getTask(1n);
      expect(task.taskId).to.equal(1n);
      expect(task.buyer).to.equal(buyer.address);
    });

    it("应该能够查询服务信息", async function () {
      const service = await computeMarket.getService(serviceId);
      expect(service.price).to.equal(servicePrice);
      expect(service.active).to.be.true;
    });

    it("应该能够查询任务总数", async function () {
      expect(await computeMarket.getTaskCount()).to.equal(1n);
      
      await computeMarket.connect(buyer).buyCompute(serviceId, { value: servicePrice });
      expect(await computeMarket.getTaskCount()).to.equal(2n);
    });

    it("应该能够查询合约余额", async function () {
      const balance = await computeMarket.getBalance();
      expect(balance).to.equal(servicePrice);
    });
  });
});

