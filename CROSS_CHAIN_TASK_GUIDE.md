# 跨链任务处理指南

## 📋 架构说明

本项目实现了**跨链任务处理**机制：

```
用户 → 本地链(Hardhat) → 后端监听器 → Arbitrum Sepolia → 计算完成 → 更新本地链
```

### 工作流程

1. **用户提交任务**：用户通过前端连接 MetaMask，在本地链（Hardhat）上购买服务并创建任务
2. **事件监听**：后端监听本地链的 `TaskCreated` 事件
3. **任务提交**：检测到新任务后，自动提交到 Arbitrum Sepolia 进行计算
4. **状态更新**：计算完成后，将结果返回并更新本地链上的任务状态
5. **用户查看**：用户可在前端查看任务的实时状态和结果

---

## 🔧 配置说明

### 1. 本地链配置（必需）

```properties
# 本地 Hardhat 节点
web3j.client-address=http://localhost:8545
contract.address=0x5FbDB2315678afecb367f032d93F642f64180aa3

# 管理员私钥（用于更新链上状态）
contract.admin.privatekey=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 2. Arbitrum Sepolia 配置

#### 模式 A：模拟模式（默认，用于测试）

```properties
# 关闭 Arbitrum 集成，使用模拟计算
arbitrum.sepolia.enabled=false
```

**特点**：
- ✅ 无需真实测试网 ETH
- ✅ 快速响应（5-10秒）
- ✅ 适合开发和测试
- ⚠️ 结果为模拟数据

#### 模式 B：真实模式（连接测试网）

```properties
# 启用 Arbitrum Sepolia 集成
arbitrum.sepolia.enabled=true

# Arbitrum Sepolia RPC
arbitrum.sepolia.rpc-url=https://arbitrum-sepolia.infura.io/v3/YOUR_INFURA_KEY

# Arbitrum 私钥（需要有测试网 ETH）
arbitrum.sepolia.privatekey=YOUR_PRIVATE_KEY_WITH_TEST_ETH
```

**特点**：
- ✅ 真实链上计算
- ✅ 可验证的计算结果
- ⚠️ 需要测试网 ETH
- ⚠️ 响应较慢（30秒-数分钟）

---

## 🚀 启动步骤

### 前置条件

1. ✅ Hardhat 节点运行中（`http://localhost:8545`）
2. ✅ 合约已部署（地址：`0x5FbDB2315678afecb367f032d93F642f64180aa3`）
3. ✅ 配置文件已更新

### 启动后端

```bash
cd backend
mvn spring-boot:run
```

**预期日志**：

```
Starting TaskCreatedListener for contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Arbitrum integration disabled. Using mock mode.
Tomcat started on port(s): 8080 (http)
```

### 启动前端

```bash
cd frontend
npm run dev
```

访问：`http://localhost:5173`

---

## 📊 任务状态流转

| 状态 | 说明 | 持续时间 |
|------|------|---------|
| **Created** | 任务已在本地链创建，等待处理 | < 10 秒 |
| **Processing** | 任务已提交到 Arbitrum，正在计算 | 模拟：5-10秒<br>真实：30秒-数分钟 |
| **Completed** | 计算完成，结果已回写到本地链 | - |
| **Failed** | 任务执行失败 | - |

---

## 🔍 监控与调试

### 1. 查看后端日志

```bash
# 监听器日志
Checking blocks 100 to 120 for TaskCreated events
Found 1 TaskCreated events
New TaskCreated event: taskId=1, user=0xf39Fd..., serviceId=1, amount=100000000000000000

# 任务提交日志
Submitting task 1 to Arbitrum Sepolia...
Mock computing task: 1
Task 1 saved to database

# 完成日志
Mock task completed: 1
Local chain transaction completed: 0x123abc...
```

### 2. 检查数据库

访问 H2 控制台：`http://localhost:8080/api/h2-console`

```sql
-- 查看所有任务
SELECT * FROM TASK_ENTITY;

-- 查看特定任务
SELECT task_id, status, arbitrum_task_id, result_hash, created_at
FROM TASK_ENTITY
WHERE task_id = '1';
```

### 3. 检查链上状态

```bash
# 连接到 Hardhat 控制台
npx hardhat console --network localhost

# 查询任务状态
const contract = await ethers.getContractAt("ComputeMarket", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
const task = await contract.tasks(1);
console.log(task);
```

---

## ⚙️ 核心组件说明

### 1. Web3Config.java

**职责**：配置双链 Web3j 实例

```java
@Bean(name = "localWeb3j")    // 本地链（Hardhat）
@Bean(name = "arbitrumWeb3j") // Arbitrum Sepolia
```

### 2. TaskCreatedListener.java

**职责**：监听本地链的 TaskCreated 事件

- 每 10 秒扫描新块
- 解析事件参数（taskId, user, serviceId, amount）
- 保存任务到数据库
- 触发 Arbitrum 任务提交

### 3. ArbitrumTaskService.java

**职责**：处理 Arbitrum 任务提交和监控

- `submitTaskToArbitrum()`: 提交任务到 Arbitrum
- `monitorArbitrumTask()`: 监听计算完成
- `updateLocalChainTaskStatus()`: 将结果回写本地链
- `mockComputeTask()`: 模拟计算（用于测试）

### 4. TaskEntity.java

**字段说明**：

```java
taskId          // 本地链任务 ID
arbitrumTaskId  // Arbitrum 任务 ID
serviceId       // 服务 ID (1, 2, 3)
userAddress     // 用户钱包地址
status          // Created → Processing → Completed/Failed
resultHash      // 计算结果哈希（IPFS/链上存储）
```

---

## 🧪 测试场景

### 场景 1：模拟模式测试

1. 确保 `arbitrum.sepolia.enabled=false`
2. 前端购买服务 1（0.1 ETH）
3. 观察后端日志：
   - 检测到 TaskCreated 事件
   - 使用模拟计算
   - 5-10 秒后任务完成
4. 前端刷新，查看任务状态变为 "Completed"

### 场景 2：真实模式测试

1. 获取 Arbitrum Sepolia 测试网 ETH：
   - 访问：https://faucet.triangleplatform.com/arbitrum/sepolia
   - 或：https://faucet.quicknode.com/arbitrum/sepolia

2. 更新配置：
   ```properties
   arbitrum.sepolia.enabled=true
   arbitrum.sepolia.privatekey=YOUR_KEY_WITH_TEST_ETH
   ```

3. 重启后端，购买服务
4. 等待 30 秒 - 数分钟（取决于网络）
5. 查看任务完成

---

## ⚠️ 常见问题

### Q1: 任务一直停留在 "Created" 状态

**原因**：后端监听器未启动或合约地址配置错误

**解决**：
1. 检查后端日志是否有 "Starting TaskCreatedListener"
2. 确认 `contract.address` 与部署的合约地址一致
3. 检查 Hardhat 节点是否运行

### Q2: "Arbitrum submission failed"

**原因**：
- Arbitrum RPC 连接失败
- 私钥账户没有测试网 ETH
- 网络超时

**解决**：
1. 切换到模拟模式：`arbitrum.sepolia.enabled=false`
2. 检查 RPC URL 是否正确
3. 确认账户余额：访问 Arbiscan Sepolia

### Q3: 任务完成但链上状态未更新

**原因**：管理员私钥未配置或 Gas 不足

**解决**：
1. 检查 `contract.admin.privatekey` 是否配置
2. 确认私钥对应的账户有足够 ETH（本地链有 10000 ETH）
3. 查看日志中的交易哈希

### Q4: "could not decode result data"

**原因**：合约 ABI 不匹配

**解决**：
1. 重新编译合约：`npx hardhat compile`
2. 重新部署合约：`npx hardhat run scripts/deploy.ts --network localhost`
3. 更新 `contract.address`

---

## 🔐 安全建议

1. **私钥管理**：
   - ❌ 不要在生产环境的配置文件中明文存储私钥
   - ✅ 使用环境变量：`${ADMIN_PRIVATE_KEY}`
   - ✅ 使用 Vault 或 Key Management Service

2. **RPC 安全**：
   - ✅ 使用自己的 Infura/Alchemy API Key
   - ⚠️ 不要在公共仓库中提交 API Key
   - ✅ 限制 API Key 的访问速率

3. **权限控制**：
   - 只有管理员账户可以调用 `completeTask`
   - 在合约中添加 `onlyOwner` 修饰符

---

## 📈 性能优化

### 当前配置

- 事件扫描间隔：10 秒
- 块查询范围：最近 100 个块
- 任务超时：1 小时

### 优化建议

1. **减少扫描延迟**：
   ```java
   executorService.scheduleAtFixedRate(this::checkNewEvents, 5, 5, TimeUnit.SECONDS);
   ```

2. **使用 WebSocket 订阅**：
   ```java
   subscription = localWeb3j.ethLogFlowable(ethFilter).subscribe(log -> {
       processTaskCreatedEvent(log);
   });
   ```

3. **批量处理**：
   - 一次性处理多个任务
   - 使用线程池并发提交

---

## 📝 下一步扩展

1. **集成真实 iExec**：
   - 使用 iExec SDK 替代模拟计算
   - 支持 SGX 可信执行环境

2. **多链支持**：
   - 支持多个计算网络（Polygon, Optimism）
   - 用户选择计算网络

3. **结果验证**：
   - 链上验证计算结果
   - ZK Proof 验证

4. **激励机制**：
   - 计算节点质押
   - 奖励诚实计算者

---

## 🎯 总结

✅ **已实现功能**：
- 双链 Web3j 配置
- 自动事件监听
- 跨链任务提交
- 状态自动回写
- 模拟与真实模式切换

✅ **开发体验**：
- 模拟模式快速测试
- 详细日志输出
- H2 数据库可视化

✅ **生产就绪**：
- 错误处理和回退机制
- 可配置的计算网络
- 安全的私钥管理方案

---

**祝开发愉快！** 🚀

如有问题，请查看：
- 后端日志：`backend/logs/application.log`
- H2 控制台：`http://localhost:8080/api/h2-console`
- Hardhat 日志：运行 `npx hardhat node` 的终端输出
