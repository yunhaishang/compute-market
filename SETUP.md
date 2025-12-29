# 项目启动与配置指南

## 🚀 快速启动

### 1. 启动 Hardhat 本地节点

```bash
cd contracts
npx hardhat node
```

保持此终端运行，本地区块链节点将在 `http://localhost:8545` 上运行。

在contracts/hardhat.config.ts中添加：
```
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
```

### 2. 部署智能合约

**新开一个终端：**

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
```

**记录输出的合约地址**，例如：`0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

### 3. 更新配置文件

#### 前端配置 (`frontend/.env`)

```env
VITE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_CHAIN_ID=31337
VITE_API_BASE_URL=http://localhost:8081/api
```

#### 后端配置 (`backend/src/main/resources/application.properties`)

```properties
web3j.client-address=http://localhost:8545
contract.address=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### 4. 启动后端服务

```bash
cd backend
mvn spring-boot:run
```

后端将在 `http://localhost:8081` 运行。

### 5. 启动前端服务

```bash
cd frontend
npm install  # 首次运行需要安装依赖
npm run dev
```

前端将在 `http://localhost:5173` 运行。

---

## 🔧 MetaMask 配置

### 添加本地网络

1. 打开 MetaMask
2. 点击网络下拉菜单 → "添加网络" → "手动添加网络"
3. 填写以下信息：
   - **网络名称**: Hardhat Local
   - **RPC URL**: http://localhost:8545
   - **链 ID**: 31337
   - **货币符号**: ETH

### 导入测试账户

Hardhat 提供 20 个预置测试账户，每个账户有 10,000 ETH：

**账户 #0（管理员）:**
- 地址: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- 私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

**账户 #1:**
- 地址: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- 私钥: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

在 MetaMask 中：
1. 点击账户图标 → "导入账户"
2. 粘贴私钥
3. 确认导入

---

## 📦 已注册的服务

合约部署时自动注册了 3 个算力服务：

| 服务 ID | 价格 | 说明 |
|---------|------|------|
| 1 | 0.1 ETH | 基础服务 |
| 2 | 0.5 ETH | 标准服务 |
| 3 | 1.0 ETH | 高级服务 |

---

## ⚠️ 常见问题

### 问题 1: 页面刷新后任务列表为空

**原因**: 钱包连接状态未恢复或合约服务未初始化。

**解决**: 
- 页面会自动尝试恢复钱包连接
- 如果仍然为空，手动点击"连接钱包"按钮
- 查看浏览器控制台确认是否有错误日志

### 问题 2: 合约调用失败 "could not decode result data"

**原因**: Hardhat 节点重启后合约地址变化。

**解决**:
1. 重新部署合约：`npx hardhat run scripts/deploy.ts --network localhost`
2. 更新 `frontend/.env` 和 `backend/application.properties` 中的合约地址
3. 重启前端和后端服务

### 问题 3: 交易成功但任务不显示

**原因**: 前端查询过早或合约地址配置错误。

**解决**:
1. 确认 `.env` 中的合约地址与部署输出的地址一致
2. 刷新浏览器页面
3. 点击"刷新"按钮手动更新任务列表
4. 查看控制台日志确认是否从区块链正确获取数据

### 问题 4: MetaMask 显示错误的余额

**原因**: MetaMask 缓存了旧的网络数据。

**解决**:
1. MetaMask 设置 → 高级 → "重置账户"
2. 确认操作
3. 刷新页面重新连接

---

## 🔄 重启完整流程

如果需要重新开始（清空所有数据）：

1. **停止所有服务**（Ctrl+C）
   - Hardhat 节点
   - 后端服务
   - 前端服务

2. **重新启动 Hardhat 节点**
   ```bash
   cd contracts
   npx hardhat node
   ```

3. **重新部署合约**（新终端）
   ```bash
   npx hardhat run scripts/deploy.ts --network localhost
   ```

4. **更新配置文件**
   - 将新的合约地址更新到 `frontend/.env` 和 `backend/application.properties`

5. **重启后端和前端**
   ```bash
   # 后端
   cd backend
   mvn spring-boot:run
   
   # 前端（新终端）
   cd frontend
   npm run dev
   ```

6. **重置 MetaMask**
   - 设置 → 高级 → 重置账户

---

## 📊 数据源说明

当前配置下，前端**直接从区块链读取任务数据**，不依赖后端数据库：

- ✅ 优点：数据实时、准确，不需要事件监听器
- ⚠️ 注意：如果链上任务数量过多（>100），只会查询最近 100 个任务

后端 API 作为备选方案，当区块链查询失败时会自动切换。

---

## 🛠️ 技术栈

- **智能合约**: Solidity 0.8.28 + Hardhat
- **后端**: Spring Boot 3.5.9 + Web3j
- **前端**: Vue 3.5.25 + TypeScript + Vite + Element Plus
- **区块链交互**: Ethers.js 6.16.0

---

## 📝 开发建议

1. **保持 Hardhat 节点持续运行**，避免频繁重启导致数据丢失
2. **使用不同的测试账户**进行交易测试，便于区分任务所有者
3. **开启浏览器控制台**，实时查看详细的日志输出
4. **定期清理测试数据**，重启 Hardhat 节点即可清空所有链上数据

---

## 🎯 下一步

完成基础配置后，你可以：

1. 访问前端界面 `http://localhost:5173`
2. 连接 MetaMask 钱包
3. 在"算力市场"页面购买服务
4. 在"我的任务"页面查看任务状态
5. 点击任务查看详细信息

项目已配置为开发模式，所有修改会自动热重载。祝开发愉快！🚀
