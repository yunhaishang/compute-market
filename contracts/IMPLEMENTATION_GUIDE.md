# 📘 ComputeMarket 智能合约实现指南

## 🎯 项目概述

这是一个算力交易市场的智能合约系统，负责：
- 资金托管（ETH）
- 任务状态管理
- 事件触发（驱动链下计算流程）
- 资金结算

## 📁 文件结构说明

```
contracts/
├── contracts/
│   └── ComputeMarket.sol      # 核心智能合约
├── test/
│   └── ComputeMarket.ts       # 测试文件（TypeScript + Mocha）
├── scripts/
│   ├── deploy.ts              # 部署脚本
│   └── interact.ts            # 交互脚本示例
├── hardhat.config.ts          # Hardhat 配置
├── package.json               # 项目依赖和脚本
└── README.md                  # 项目说明
```

## 🚀 开始实现

### 第一步：安装依赖

```bash
cd contracts
npm install
```

### 第二步：编译合约

```bash
npm run compile
# 或
npx hardhat compile
```

### 第三步：运行测试

```bash
npm test
# 或
npx hardhat test
```

### 第四步：部署合约

#### 本地测试网络（Hardhat）

```bash
npm run deploy:local
# 或
npx hardhat run scripts/deploy.ts --network hardhatMainnet
```

#### Sepolia 测试网

1. 设置环境变量（在 `.env` 文件中）：
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
SEPOLIA_PRIVATE_KEY=your_private_key_here
```

2. 部署：
```bash
npm run deploy:sepolia
# 或
npx hardhat run scripts/deploy.ts --network sepolia
```

#### Optimism 测试网络

```bash
npm run deploy:op
# 或
npx hardhat run scripts/deploy.ts --network hardhatOp
```

## 📝 核心功能说明

### 1. ComputeMarket.sol - 核心合约

#### 主要功能模块：

**状态管理**
- `TaskStatus` 枚举：Created, Running, Completed, Refunded
- `Task` 结构体：存储任务信息
- `Service` 结构体：存储服务信息

**核心函数**
- `buyCompute(uint256 serviceId)` - 购买算力
- `startTask(uint256 taskId)` - 启动任务（管理员）
- `completeTask(uint256 taskId, string resultHash)` - 完成任务（管理员）
- `refundTask(uint256 taskId)` - 退款任务（管理员）

**管理员函数**
- `registerService(uint256 serviceId, uint256 price)` - 注册服务
- `updateServicePrice(uint256 serviceId, uint256 newPrice)` - 更新价格
- `deactivateService(uint256 serviceId)` - 停用服务
- `transferAdmin(address newAdmin)` - 转移管理员权限

**事件**
- `TaskCreated` - 任务创建
- `TaskCompleted` - 任务完成
- `TaskRefunded` - 任务退款
- `ServiceRegistered` - 服务注册

### 2. ComputeMarket.ts - 测试文件

包含完整的测试用例：
- ✅ 部署测试
- ✅ 服务管理测试
- ✅ 购买算力测试
- ✅ 任务状态管理测试
- ✅ 管理员功能测试
- ✅ 查询功能测试

### 3. deploy.ts - 部署脚本

自动部署合约并注册初始服务：
- 服务1：基础算力服务（0.1 ETH）
- 服务2：高级算力服务（0.5 ETH）
- 服务3：专业算力服务（1.0 ETH）

### 4. interact.ts - 交互脚本

演示如何使用合约：
- 查询服务信息
- 购买算力
- 管理员操作任务
- 查询合约状态

## 🔧 调试和运行

### 本地开发环境

1. **启动本地 Hardhat 节点**（可选）：
```bash
npx hardhat node
```

2. **在另一个终端运行测试**：
```bash
npm test
```

3. **运行特定测试文件**：
```bash
npx hardhat test test/ComputeMarket.ts
```

4. **运行带详细输出的测试**：
```bash
npx hardhat test --verbose
```

### 使用 Hardhat Console 交互

```bash
npx hardhat console --network hardhatMainnet
```

在 console 中：
```javascript
const { ethers } = await network.connect();
const [admin, buyer] = await ethers.getSigners();

// 部署合约
const ComputeMarket = await ethers.getContractFactory("ComputeMarket");
const market = await ComputeMarket.deploy();
await market.waitForDeployment();

// 注册服务
await market.registerService(1n, ethers.parseEther("0.1"));

// 购买算力
await market.connect(buyer).buyCompute(1n, { value: ethers.parseEther("0.1") });

// 查询任务
const task = await market.getTask(1n);
console.log(task);
```

### 查看事件日志

在测试或脚本中：
```typescript
const tx = await computeMarket.buyCompute(serviceId, { value: price });
const receipt = await tx.wait();

// 解析事件
const event = receipt.logs.find(log => {
  try {
    return computeMarket.interface.parseLog(log)?.name === "TaskCreated";
  } catch {
    return false;
  }
});

if (event) {
  const parsed = computeMarket.interface.parseLog(event);
  console.log("任务ID:", parsed.args.taskId);
  console.log("购买者:", parsed.args.buyer);
}
```

## 🐛 常见问题排查

### 1. 编译错误

**问题**：`Error: Cannot find module '@nomicfoundation/hardhat-ethers'`

**解决**：
```bash
npm install
```

### 2. 测试失败

**问题**：测试断言失败

**解决**：
- 检查测试网络配置
- 确保账户有足够的余额
- 查看详细的错误信息：`npm test -- --verbose`

### 3. 部署失败

**问题**：`insufficient funds` 或 `nonce too high`

**解决**：
- 确保账户有足够的 ETH
- 检查网络连接
- 重置 nonce（如果使用测试网）

### 4. 事件监听问题

**问题**：无法捕获事件

**解决**：
- 确保使用正确的合约实例
- 检查事件名称拼写
- 使用 `queryFilter` 查询历史事件

## 📊 工作流程示例

### 完整交易流程

1. **管理员注册服务**
```typescript
await computeMarket.registerService(1n, ethers.parseEther("0.1"));
```

2. **用户购买算力**
```typescript
await computeMarket.connect(buyer).buyCompute(1n, {
  value: ethers.parseEther("0.1")
});
// 触发 TaskCreated 事件
```

3. **管理员启动任务**
```typescript
await computeMarket.connect(admin).startTask(taskId);
// 状态变为 Running
```

4. **链下执行计算**（在链下系统完成）

5. **管理员完成任务**
```typescript
await computeMarket.connect(admin).completeTask(taskId, resultHash);
// 触发 TaskCompleted 事件
// 资金转给服务提供者
```

### 退款流程

如果计算失败或超时：
```typescript
await computeMarket.connect(admin).refundTask(taskId);
// 触发 TaskRefunded 事件
// 资金退回给购买者
```

## 🔐 安全注意事项

1. **管理员权限**：确保管理员私钥安全
2. **重入攻击**：使用 `call` 而非 `transfer`（Solidity 0.8+）
3. **整数溢出**：Solidity 0.8+ 自动检查
4. **访问控制**：所有管理员函数都有 `onlyAdmin` 修饰符

## 📚 下一步

1. ✅ 实现核心合约功能
2. ✅ 编写测试用例
3. ✅ 创建部署脚本
4. 🔄 集成到前端应用
5. 🔄 添加更多服务类型
6. 🔄 实现服务提供者地址映射
7. 🔄 添加任务超时机制

## 🛠️ 可用命令总结

```bash
# 编译
npm run compile

# 测试
npm test

# 部署到本地
npm run deploy:local

# 部署到 Sepolia
npm run deploy:sepolia

# 清理编译文件
npm run clean

# 交互脚本
npm run interact
```

## 📖 参考资源

- [Hardhat 文档](https://hardhat.org/docs)
- [Solidity 文档](https://docs.soliditylang.org/)
- [Ethers.js 文档](https://docs.ethers.org/)
- [OpenZeppelin 合约库](https://docs.openzeppelin.com/contracts/)