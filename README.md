# 项目概述
本项目基于 iExec 去中心化算力网络，设计并实现一个算力交易系统，

其中链上智能合约负责算力交易规则与资金托管，

链下后端负责触发和监控真实计算任务，

前端为用户提供钱包交互与任务可视化界面。

每个模块的职责如表所示：
| 模块   | 职责                        |
| ---- | ------------------------- |
| 智能合约 | 定义算力交易规则、托管资金、管理任务状态、触发事件 |
| 后端   | 监听链上事件、调度 iExec 计算、同步任务状态 |
| 前端   | 钱包连接、算力购买、任务进度与结果展示       |

模块交互流程如图所示：
```
用户 → 前端 → 智能合约 → 事件
                      ↓
                   后端监听
                      ↓
               iExec CLI / 网络
                      ↓
                计算完成（IPFS）
                      ↓
            后端更新状态 → 前端展示
```

# 仓库结构
```
iexec-compute-market/
├── README.md                 
│
├── contracts/                 # 智能合约模块
│   ├── README.md
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── contracts/
│   │   ├── ComputeMarket.sol  # 核心合约
│   │   └── MockToken.sol      # 可选：测试用代币
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── verify.ts
│   └── test/
│       └── ComputeMarket.test.ts
│
├── backend/                   # Spring Boot 后端
│   ├── README.md
│   ├── pom.xml
│   └── src/main/java/com/iexec/market/
│       ├── IexecMarketApplication.java
│       ├── config/
│       │   ├── Web3Config.java
│       │   └── SchedulerConfig.java
│       ├── contract/
│       │   └── ComputeMarketContract.java
│       ├── listener/
│       │   └── TaskCreatedListener.java
│       ├── service/
│       │   ├── IexecCliService.java
│       │   ├── TaskService.java
│       │   └── TaskMonitorService.java
│       ├── controller/
│       │   └── TaskController.java
│       ├── repository/
│       │   └── TaskRepository.java
│       └── model/
│           └── TaskEntity.java
│
├── frontend/                  # 前端 DApp
│   ├── README.md
│   ├── package.json
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── pages/
│       │   ├── Home.vue
│       │   ├── Market.vue
│       │   └── Tasks.vue
│       ├── components/
│       │   ├── WalletConnect.vue
│       │   ├── ComputeCard.vue
│       │   └── TaskStatus.vue
│       ├── services/
│       │   ├── contract.ts
│       │   └── api.ts
│       └── store/
│           └── wallet.ts
│
└── .gitignore
```

# 技术栈
- Solidity / Hardhat
- Spring Boot / Web3j
- Vue / Ethers.js
- iExec CLI


# 智能合约模块contracts
智能合约实现 定义算力交易规则 + 托管资金 + 触发链下计算流程。

## 职责1 算力交易与资金托管

用户通过合约购买某种算力服务

支付 ETH / RLC等代币

合约作为 Escrow（托管方）

比如：
```
buyCompute(serviceId) payable
```

## 职责2 任务登记

合约记录：任务 ID 发起用户 支付金额 当前状态

状态示例：
```
enum TaskStatus {
  Created,
  Running,
  Completed,
  Refunded
}
```

## 职责3 事件驱动
每个关键动作都发事件，让后端监听：
```
event TaskCreated(
  uint256 taskId,
  address user,
  uint256 serviceId,
  uint256 amount
);

event TaskCompleted(uint256 taskId, string resultHash);
event TaskRefunded(uint256 taskId);
```

## 职责4 结算与退款

后端在确认 iExec 任务完成后，调用合约更新状态，合约释放资金给算力提供方 / 平台



# 后端模块backend
后端是链下的“算力调度与状态同步服务”，不持有私钥、不代替用户签名、不控制资金。

## 职责1 监听智能合约事件

使用 Web3j / Ethers RPC 监听 TaskCreated 事件， 一旦发现新任务就启动 iExec 计算流程

## 职责2 调用 iExec CLI 触发计算（核心实现点）

后端通过 ProcessBuilder 或 Shell 执行：
```
iexec app deploy
iexec app order create
iexec dataset order create
iexec workerpool order create
iexec deal
```

## 职责3 任务状态监控

定时轮询 iExec 网络，查询 task 状态，获取计算结果（IPFS Hash）

## 职责4 回写链上状态

调用合约函数（管理员身份）：
```
completeTask(taskId, resultHash)
```

合约负责最终状态和资金结算，
后端只是“提交证明”。

## 职责5 数据库管理（链下业务）

| 字段            | 说明       |
| ------------- | -------- |
| task_id       | 合约任务 ID  |
| user_address  | 用户地址     |
| iexec_task_id | iExec 任务 |
| status        | 业务状态     |
| result_hash   | IPFS     |



# 前端模块frontend
前端是用户唯一的操作入口，所有涉及资产的操作都由用户钱包完成签名。
## 职责1 钱包连接

使用 MetaMask Ethers.js

显示地址 / 余额 / 网络

## 职责2 算力商品展示（模拟市场）
| 服务      | 描述           | 价格       |
| ------- | ------------ | -------- |
| AI 推理算力 | iExec Worker | 0.01 ETH |
| 视频转码    | FFmpeg       | 0.02 ETH |

## 职责3 发起算力购买（核心）
```
点击购买
→ 调用合约 buyCompute()
→ MetaMask 签名
→ 等待区块确认
→ 前端提示“任务已创建”
```

## 职责4 任务状态展示

调用后端接口查询任务状态并展示


## 职责5 结果展示

计算完成后，展示 IPFS Hash，提供下载 / 查看链接

# 最终效果
打开前端页面

老师看到的是一个完整的 DApp 页面，而不是零散接口。

页面上至少有：

顶部：

“Connect Wallet” 按钮

当前钱包地址（0x1234…）

主区域：

算力服务列表（卡片式）

AI 推理算力

视频转码算力

数据处理算力

每个服务都有：

简要说明

价格（如 0.01 ETH）

【购买算力】按钮

👉 这一刻老师的心理评价：

“这是一个正常的区块链应用，不是 PPT 项目。”

🔐 2️⃣ 连接钱包 & 发起购买

你点击：

【购买算力】

立刻发生的事情：

MetaMask 弹窗出现

显示：

调用的合约地址

支付金额

你点击【确认】

链上发生的事（你可以讲给老师听）：

调用 buyCompute()

ETH 被锁进智能合约

合约发出 TaskCreated 事件

👉 视觉效果：

前端显示：

“交易已发送，等待区块确认…”

⛓️ 3️⃣ 链上任务创建成功

区块确认后：

前端显示：

任务已创建
任务ID：#3
状态：已创建（等待计算）


后台此时正在发生（你不用展示，但可以解释）：

后端监听到了 TaskCreated 事件

在日志里看到：

New TaskCreated: taskId=3


👉 老师此时意识到：

“他们不是前端假数据，是真监听链上事件。”

⚙️ 4️⃣ iExec 计算开始（最加分的一步）

过几秒钟，前端状态更新为：

任务状态：计算中（iExec Worker 执行）


你此时可以（可选）：

切到后端控制台

给老师看一眼日志：

iExec task started
taskId: 0xabc123...
status: RUNNING


👉 这一步非常重要，因为：

老师能确认：
✔️ 用到了 iExec
✔️ 是真实的分布式计算
✔️ 不是“模拟算力”

📦 5️⃣ 计算完成 & 结果返回

几分钟或几十秒后：

前端状态变成：

任务状态：已完成 ✅
计算结果：
IPFS Hash: QmXxx...
[查看结果]


点击查看：

打开 IPFS 网关

显示计算输出（如文本 / 图片 / 日志）

链上同时发生：

后端调用 completeTask

合约状态更新

托管资金释放

👉 老师此时的评价通常是：

“嗯，这已经是一个完整闭环了。”