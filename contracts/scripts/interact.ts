import { network } from "hardhat";

/**
 * 交互脚本示例 - 演示如何使用 ComputeMarket 合约
 * 使用方法: npx hardhat run scripts/interact.ts --network <network>
 */
async function main() {
  const { ethers } = await network.connect();
  
  // 从环境变量或配置中获取合约地址
  // 实际使用时，应该从部署脚本的输出或配置文件中读取
  const contractAddress = process.env.COMPUTE_MARKET_ADDRESS;
  
  if (!contractAddress) {
    console.error("请设置 COMPUTE_MARKET_ADDRESS 环境变量");
    console.log("示例: COMPUTE_MARKET_ADDRESS=0x... npx hardhat run scripts/interact.ts --network <network>");
    process.exit(1);
  }
  
  const computeMarket = await ethers.getContractAt("ComputeMarket", contractAddress);
  const [admin, buyer] = await ethers.getSigners();
  
  console.log("连接到合约:", contractAddress);
  console.log("管理员地址:", admin.address);
  console.log("购买者地址:", buyer.address);
  
  // 示例1: 查询服务信息
  console.log("\n=== 查询服务信息 ===");
  const serviceId = 1n;
  const service = await computeMarket.getService(serviceId);
  console.log(`服务 ${serviceId}:`);
  console.log("  价格:", ethers.formatEther(service.price), "ETH");
  console.log("  状态:", service.active ? "激活" : "停用");
  
  // 示例2: 购买算力
  console.log("\n=== 购买算力 ===");
  const servicePrice = service.price;
  console.log(`购买服务 ${serviceId}，支付 ${ethers.formatEther(servicePrice)} ETH...`);
  
  const buyTx = await computeMarket.connect(buyer).buyCompute(serviceId, {
    value: servicePrice
  });
  const buyReceipt = await buyTx.wait();
  
  // 从事件中获取任务ID
  const taskCreatedEvent = buyReceipt!.logs.find(
    (log: any) => log.fragment && log.fragment.name === "TaskCreated"
  );
  
  if (taskCreatedEvent) {
    const taskId = taskCreatedEvent.args[0];
    console.log(`任务已创建，任务ID: ${taskId}`);
    
    // 查询任务信息
    const task = await computeMarket.getTask(taskId);
    console.log("任务信息:");
    console.log("  任务ID:", task.taskId.toString());
    console.log("  服务ID:", task.serviceId.toString());
    console.log("  购买者:", task.buyer);
    console.log("  金额:", ethers.formatEther(task.amount), "ETH");
    console.log("  状态:", ["Created", "Running", "Completed", "Refunded"][Number(task.status)]);
    
    // 示例3: 管理员启动任务
    console.log("\n=== 管理员启动任务 ===");
    const startTx = await computeMarket.connect(admin).startTask(taskId);
    await startTx.wait();
    console.log("任务已启动");
    
    // 示例4: 管理员完成任务
    console.log("\n=== 管理员完成任务 ===");
    const resultHash = "0x" + Buffer.from("计算结果哈希").toString("hex");
    const completeTx = await computeMarket.connect(admin).completeTask(taskId, resultHash);
    await completeTx.wait();
    console.log("任务已完成，结果哈希:", resultHash);
    
    // 查询最终任务状态
    const finalTask = await computeMarket.getTask(taskId);
    console.log("最终状态:", ["Created", "Running", "Completed", "Refunded"][Number(finalTask.status)]);
  }
  
  // 查询合约统计
  console.log("\n=== 合约统计 ===");
  const taskCount = await computeMarket.getTaskCount();
  const balance = await computeMarket.getBalance();
  console.log("总任务数:", taskCount.toString());
  console.log("合约余额:", ethers.formatEther(balance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

