import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  console.log("开始部署 ComputeMarket 合约...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // 部署合约
  const computeMarket = await ethers.deployContract("ComputeMarket");
  await computeMarket.waitForDeployment();
  
  const address = await computeMarket.getAddress();
  console.log("ComputeMarket 合约已部署到:", address);
  console.log("管理员地址:", await computeMarket.admin());
  
  // 可选：注册一些初始服务
  console.log("\n注册初始服务...");
  
  // 服务1: 基础算力服务 - 0.1 ETH
  const service1Id = 1n;
  const service1Price = ethers.parseEther("0.1");
  const tx1 = await computeMarket.registerService(service1Id, service1Price);
  await tx1.wait();
  console.log(`服务 ${service1Id} 已注册，价格: ${ethers.formatEther(service1Price)} ETH`);
  
  // 服务2: 高级算力服务 - 0.5 ETH
  const service2Id = 2n;
  const service2Price = ethers.parseEther("0.5");
  const tx2 = await computeMarket.registerService(service2Id, service2Price);
  await tx2.wait();
  console.log(`服务 ${service2Id} 已注册，价格: ${ethers.formatEther(service2Price)} ETH`);
  
  // 服务3: 专业算力服务 - 1.0 ETH
  const service3Id = 3n;
  const service3Price = ethers.parseEther("1.0");
  const tx3 = await computeMarket.registerService(service3Id, service3Price);
  await tx3.wait();
  console.log(`服务 ${service3Id} 已注册，价格: ${ethers.formatEther(service3Price)} ETH`);
  
  console.log("\n部署完成！");
  console.log("合约地址:", address);
  console.log("管理员地址:", await computeMarket.admin());
  console.log("已注册服务数量: 3");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

