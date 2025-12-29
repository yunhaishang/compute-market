<template>
  <div class="tasks-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><List /></el-icon>
        我的任务
      </h1>
      <div class="header-actions">
        <el-button :icon="Refresh" @click="handleRefresh" :loading="taskStore.loading">
          刷新
        </el-button>
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          @change="handleAutoRefreshChange"
        />
      </div>
    </div>

    <!-- 钱包未连接提示 -->
    <el-alert
      v-if="!walletStore.isConnected"
      title="请先连接钱包"
      type="warning"
      description="查看任务列表需要连接您的 MetaMask 钱包"
      show-icon
      :closable="false"
      class="connect-alert"
    />

    <!-- 统计卡片 -->
    <div v-else class="stats-cards">
      <el-card shadow="hover">
        <div class="stat-item">
          <div class="stat-icon total"><el-icon><Tickets /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ taskStore.taskCount.total }}</div>
            <div class="stat-label">总任务数</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover">
        <div class="stat-item">
          <div class="stat-icon running"><el-icon><Loading /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ taskStore.taskCount.running }}</div>
            <div class="stat-label">运行中</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover">
        <div class="stat-item">
          <div class="stat-icon completed"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ taskStore.taskCount.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover">
        <div class="stat-item">
          <div class="stat-icon failed"><el-icon><CircleClose /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ taskStore.taskCount.failed }}</div>
            <div class="stat-label">失败</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 任务列表 -->
    <el-card v-if="walletStore.isConnected" class="table-card" shadow="never">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-select
          v-model="filterStatus"
          placeholder="按状态筛选"
          clearable
          style="width: 150px"
          @change="handleFilterChange"
        >
          <el-option label="全部" value="" />
          <el-option label="已创建" value="Created" />
          <el-option label="运行中" value="Running" />
          <el-option label="已完成" value="Completed" />
          <el-option label="失败" value="Failed" />
          <el-option label="已退款" value="Refunded" />
        </el-select>

        <el-input
          v-model="searchKeyword"
          placeholder="搜索任务 ID"
          clearable
          style="width: 300px"
          :prefix-icon="Search"
        />
      </div>

      <!-- 表格 -->
      <el-table
        :data="filteredTasks"
        v-loading="taskStore.loading"
        stripe
        style="width: 100%"
        @row-click="handleRowClick"
        class="tasks-table"
      >
        <el-table-column prop="id" label="序号" width="80" align="center" />
        
        <el-table-column prop="taskId" label="任务 ID" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.taskId }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="userAddress" label="购买地址" min-width="180">
          <template #default="{ row }">
            <span class="address-text">{{ formatAddress(row.userAddress) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="{ row }">
            <TaskStatus :status="row.status" size="small" />
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="completedAt" label="完成时间" width="180" align="center">
          <template #default="{ row }">
            {{ row.completedAt ? formatDate(row.completedAt) : '-' }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click.stop="viewDetail(row.id)">
              查看详情
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无任务数据">
            <el-button type="primary" @click="goToMarket">去购买算力</el-button>
          </el-empty>
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/store/wallet'
import { useTaskStore } from '@/store/task'
import { contractService } from '@/services/contract'
import TaskStatus from '@/components/TaskStatus.vue'
import { ElMessage } from 'element-plus'
import {
  List,
  Refresh,
  Search,
  Tickets,
  Loading,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { TaskEntity } from '@/types'

const router = useRouter()
const walletStore = useWalletStore()
const taskStore = useTaskStore()

const autoRefresh = ref(true)
const filterStatus = ref('')
const searchKeyword = ref('')

// 过滤后的任务列表
const filteredTasks = computed(() => {
  let tasks = taskStore.getTasksByAddress(walletStore.address || '')

  // 按状态筛选
  if (filterStatus.value) {
    tasks = tasks.filter(task => task.status === filterStatus.value)
  }

  // 按关键字搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    tasks = tasks.filter(task =>
      task.taskId.toLowerCase().includes(keyword) ||
      task.iexecTaskId?.toLowerCase().includes(keyword)
    )
  }

  // 按创建时间倒序排序
  return tasks.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

// 格式化地址
function formatAddress(address: string): string {
  if (!address) return '-'
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

// 格式化日期
function formatDate(dateString: string): string {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

// 刷新任务列表
async function handleRefresh() {
  try {
    await taskStore.fetchAllTasks(true, walletStore.address || undefined)
    ElMessage.success('刷新成功')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

// 自动刷新开关
function handleAutoRefreshChange(value: boolean) {
  if (value) {
    taskStore.startPolling(walletStore.address || undefined)
    ElMessage.success('已开启自动刷新')
  } else {
    taskStore.stopPolling()
    ElMessage.info('已关闭自动刷新')
  }
}

// 筛选状态变化
function handleFilterChange() {
  // 触发重新计算
}

// 行点击事件
function handleRowClick(row: TaskEntity) {
  viewDetail(row.id)
}

// 查看任务详情
function viewDetail(id: number) {
  router.push(`/tasks/${id}`)
}

// 跳转到市场页面
function goToMarket() {
  router.push('/market')
}

onMounted(async () => {
  // 先尝试恢复钱包连接（页面刷新后）
  if (!walletStore.isConnected) {
    await walletStore.initWallet()
  }

  // 如果钱包已连接，加载任务
  if (walletStore.isConnected) {
    // 确保合约服务已初始化
    if (!contractService.isInitialized && walletStore.provider) {
      try {
        await contractService.init(walletStore.provider)
        console.log('✅ Tasks页面：合约服务已初始化')
      } catch (error) {
        console.error('初始化合约服务失败:', error)
        ElMessage.error('初始化合约服务失败')
        return
      }
    }

    // 加载任务列表（只加载当前用户的任务）
    await taskStore.fetchAllTasks(true, walletStore.address || undefined)

    // 如果自动刷新开启，启动轮询
    if (autoRefresh.value) {
      taskStore.startPolling(walletStore.address || undefined)
    }
  }
})

onUnmounted(() => {
  // 页面卸载时停止轮询
  taskStore.stopPolling()
})
</script>

<style scoped lang="scss">
.tasks-page {
  max-width: 1400px;
  margin: 0 auto;

  .page-header {
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 12px;

      .el-icon {
        font-size: 32px;
        color: #409eff;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }

  .connect-alert {
    margin-bottom: 24px;
  }

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 24px;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;

        &.total {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }

        &.running {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: #fff;
        }

        &.completed {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: #fff;
        }

        &.failed {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          color: #fff;
        }
      }

      .stat-info {
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #303133;
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }

  .table-card {
    .filter-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .tasks-table {
      .address-text {
        font-family: monospace;
        font-size: 13px;
      }

      :deep(.el-table__row) {
        cursor: pointer;

        &:hover {
          background: #f5f7fa;
        }
      }
    }
  }
}
</style>
