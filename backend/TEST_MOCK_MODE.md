# 🎭 iExec 模拟模式使用指南

## 概述

模拟模式允许你在 **Arbitrum Sepolia 测试网**上开发和测试后端，无需真实的 iExec 算力。

### 模式对比

| 功能 | 模拟模式 (MOCK) | 真实模式 (REAL) |
|------|----------------|----------------|
| 需要 iExec RLC | ❌ 不需要 | ✅ 需要 |
| 需要 iExec CLI | ❌ 不需要 | ✅ 需要 |
| 任务执行 | 🎭 模拟（30-120秒） | ⚙️ 真实计算 |
| 结果数据 | 🔮 随机生成 | 📦 真实输出 |
| 适用场景 | 开发、测试、演示 | 生产环境 |
| 成本 | 💰 免费 | 💸 消耗 RLC |

---

## 快速开始

### 1️⃣ 启用模拟模式

在 `application.properties` 中已配置：

```properties
# 模拟模式（true=使用模拟任务，false=使用真实iExec）
iexec.mock.enabled=true
```

### 2️⃣ 启动后端

```powershell
cd D:\practiecCode\java\compute-market\compute-market\backend
mvn spring-boot:run
```

### 3️⃣ 验证模式

```powershell
# 检查模拟模式状态
curl http://localhost:8080/api/mock/status
```

**预期响应：**
```json
{
  "mockEnabled": true,
  "mode": "MOCK",
  "description": "Using simulated iExec tasks (no real computation)",
  "endpoints": {
    "createTask": "POST /api/mock/tasks/create?userAddress=0x...",
    "completeTask": "POST /api/mock/tasks/{taskId}/complete",
    "listTasks": "GET /api/mock/tasks",
    "checkStatus": "GET /api/tasks/task-id/{taskId}"
  }
}
```

---

## API 使用示例

### 📝 创建模拟任务

```powershell
# 创建单个任务
curl -X POST "http://localhost:8080/api/mock/tasks/create?userAddress=0x5f5b0900BF7D55fD4ADE4F419039054d7eE89e3F&params=echo 'Hello iExec'"
```

**响应示例：**
```json
{
  "success": true,
  "taskId": "task_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "iexecTaskId": "0x8f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e",
  "userAddress": "0x5f5b0900BF7D55fD4ADE4F419039054d7eE89e3F",
  "status": "Running",
  "message": "Mock task created. It will complete in 30-120 seconds.",
  "hint": "Check status at: GET /api/tasks/task-id/task_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 📊 查询任务状态

```powershell
# 方法1：通过任务 ID
curl http://localhost:8080/api/tasks/task-id/task_a1b2c3d4-e5f6-7890-abcd-ef1234567890

# 方法2：查看所有任务
curl http://localhost:8080/api/tasks
```

**任务生命周期：**
1. `Running` (0-10秒) → `ACTIVE`
2. `Running` (10秒-完成前10秒) → `RUNNING`
3. `Running` (完成前10秒) → `REVEALING`
4. `Completed` → 返回 IPFS 结果哈希

### ⚡ 手动完成任务（快速测试）

```powershell
# 强制任务成功完成
curl -X POST "http://localhost:8080/api/mock/tasks/task_a1b2c3d4-e5f6-7890-abcd-ef1234567890/complete?success=true"

# 强制任务失败
curl -X POST "http://localhost:8080/api/mock/tasks/task_a1b2c3d4-e5f6-7890-abcd-ef1234567890/complete?success=false"
```

### 📦 批量创建任务

```powershell
# 创建 10 个测试任务
curl -X POST "http://localhost:8080/api/mock/tasks/batch?userAddress=0x5f5b0900BF7D55fD4ADE4F419039054d7eE89e3F&count=10"
```

### 📈 查看监控统计

```powershell
curl http://localhost:8080/api/monitor/stats
```

**响应示例：**
```json
{
  "runningTasksCount": 5,
  "timeoutTasksCount": 0,
  "completedTasksCount": 12,
  "failedTasksCount": 1
}
```

---

## 完整测试流程

### 场景1：测试任务监控

```powershell
# 1. 创建任务
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/mock/tasks/create?userAddress=0x5f5b0900BF7D55fD4ADE4F419039054d7eE89e3F" -Method Post
$taskId = $response.taskId

Write-Host "✅ 任务已创建: $taskId"

# 2. 等待30秒（监控周期）
Write-Host "⏳ 等待监控服务检测..."
Start-Sleep -Seconds 35

# 3. 查询任务状态
$task = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks/task-id/$taskId"
Write-Host "📊 任务状态: $($task.status)"

# 4. 如果未完成，手动完成
if ($task.status -ne "Completed") {
    Invoke-RestMethod -Uri "http://localhost:8080/api/mock/tasks/$taskId/complete?success=true" -Method Post
    Write-Host "⚡ 手动触发完成"
    
    # 再等待一个监控周期
    Start-Sleep -Seconds 35
    
    $task = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks/task-id/$taskId"
    Write-Host "📊 最终状态: $($task.status)"
    Write-Host "📦 结果哈希: $($task.resultHash)"
}
```

### 场景2：压力测试

```powershell
# 创建 20 个任务
Invoke-RestMethod -Uri "http://localhost:8080/api/mock/tasks/batch?userAddress=0x5f5b0900BF7D55fD4ADE4F419039054d7eE89e3F&count=20" -Method Post

# 监控统计
for ($i = 0; $i -lt 10; $i++) {
    $stats = Invoke-RestMethod -Uri "http://localhost:8080/api/monitor/stats"
    Write-Host "[$i] Running: $($stats.runningTasksCount) | Completed: $($stats.completedTasksCount) | Failed: $($stats.failedTasksCount)"
    Start-Sleep -Seconds 10
}
```

---

## 模拟任务特性

### ✅ 自动完成
- 任务会在 **30-120秒** 后自动完成
- **90% 成功率**，10% 失败率（更真实的模拟）
- 自动生成 IPFS 结果哈希

### 🎭 状态转换
```
ACTIVE (0-10s) 
  ↓
RUNNING (大部分时间)
  ↓
REVEALING (完成前10s)
  ↓
COMPLETED / FAILED
```

### 📦 结果格式
```json
{
  "taskId": "task_xxx",
  "iexecTaskId": "0x8f9e8d...",
  "status": "Completed",
  "resultHash": "QmXyZ...abc123",
  "createdAt": "2025-12-29T10:30:00",
  "completedAt": "2025-12-29T10:31:45"
}
```

---

## 与智能合约集成

模拟模式仍然支持智能合约集成：

1. **智能合约** → 在 Arbitrum Sepolia 上部署 ✅
2. **事件监听** → `TaskCreated` 事件触发后端 ✅
3. **任务执行** → 使用模拟服务（不需要真实 iExec）✅
4. **状态回写** → 调用合约的 `completeTask()` ✅

### 完整流程

```
1. 用户调用合约 createTask()
     ↓
2. 合约触发 TaskCreated 事件
     ↓
3. 后端监听到事件
     ↓
4. 创建模拟任务（MockIexecService）
     ↓
5. 监控服务轮询状态（30秒/次）
     ↓
6. 任务完成后更新数据库
     ↓
7. 回写合约状态（completeTask）
```

---

## 切换到真实模式

当准备使用真实 iExec 时：

### 1. 修改配置

```properties
# application.properties
iexec.mock.enabled=false
```

### 2. 确保环境就绪

- ✅ iExec CLI 已安装
- ✅ iExec 工作目录已初始化
- ✅ 钱包有足够的 RLC
- ✅ 在 iExec Bellecour 链上有余额

### 3. 重启应用

```powershell
mvn spring-boot:run
```

---

## 日志说明

### 模拟模式日志标识

```
✅ [MOCK] Created mock iExec task: 0x8f9e8d7c...
🔄 [MOCK] Task 0x8f9e8d7c... status: RUNNING (elapsed: 45s / expected: 90s)
✅ [MOCK] Task 0x8f9e8d7c... COMPLETED
📦 [MOCK] Result: ipfs://QmXyZ...abc123
```

### 真实模式日志标识

```
⚙️ [REAL] Executing iExec CLI command...
⚙️ [REAL] Task status query completed
```

---

## FAQ

### Q: 模拟任务会产生真实的计算结果吗？
**A:** 不会，结果哈希是随机生成的 UUID，但格式符合 IPFS 标准。

### Q: 模拟模式下智能合约能正常工作吗？
**A:** 能！智能合约仍然在 Arbitrum Sepolia 上真实部署和运行，只是任务执行部分被模拟。

### Q: 可以同时使用模拟和真实模式吗？
**A:** 不可以，只能选择一种模式。建议开发阶段用模拟，生产环境用真实。

### Q: 模拟任务会消耗 RLC 吗？
**A:** 完全不会，模拟任务不涉及任何区块链交易（除了智能合约交互）。

### Q: 如何测试任务失败场景？
**A:** 方法1：等待自动失败（10%概率）；方法2：手动设置 `success=false`

---

## 最佳实践

1. **开发阶段**：使用模拟模式，快速迭代
2. **集成测试**：使用批量创建功能测试监控系统
3. **演示展示**：使用手动完成功能控制演示节奏
4. **生产部署**：切换到真实模式，确保 RLC 余额充足

---

## 故障排查

### 问题1：模拟模式无法启用

**检查：**
```powershell
curl http://localhost:8080/api/mock/status
```

**解决：**
- 确认 `application.properties` 中 `iexec.mock.enabled=true`
- 重启应用

### 问题2：任务一直不完成

**检查：**
```powershell
# 查看监控服务是否运行
curl http://localhost:8080/api/monitor/stats
```

**解决：**
- 等待至少 30 秒（监控间隔）
- 或使用手动完成接口

### 问题3：找不到 MockTaskController

**解决：**
- 确认文件已创建在正确位置
- 重新编译：`mvn clean compile`

---

## 总结

✅ **模拟模式已配置完成**

你现在可以：
- 🚀 启动后端应用（无需 iExec CLI 或 RLC）
- 🎭 创建模拟任务测试监控系统
- 📊 查看任务状态和监控统计
- 🔄 与 Arbitrum Sepolia 智能合约集成
- 💡 快速原型开发和演示

准备好后，运行：
```powershell
mvn spring-boot:run
```

然后开始测试！🎉
