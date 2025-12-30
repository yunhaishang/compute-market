<template>
  <div class="task-detail-page">
    <!-- 返回按钮 -->
    <el-page-header @back="goBack" class="page-header">
      <template #content>
        <span class="page-title">任务详情</span>
      </template>
    </el-page-header>

    <!-- 加载状态 -->
    <el-skeleton v-if="loading" :rows="8" animated />

    <!-- 任务详情 -->
    <div v-else-if="task" class="detail-content">
      <!-- 状态卡片 -->
      <el-card class="status-card" shadow="never">
        <div class="status-header">
          <TaskStatus :status="task.status" size="large" effect="dark" />
          <el-button
            v-if="task.status === 'Running'"
            :icon="Refresh"
            circle
            @click="refreshTask"
            :loading="refreshing"
          />
        </div>

        <div v-if="task.status === 'Running'" class="progress-section">
          <el-progress
            :percentage="progressPercentage"
            :status="progressStatus"
            :stroke-width="12"
          />
          <p class="progress-text">{{ progressText }}</p>
        </div>

        <div v-if="task.status === 'Failed' && task.errorMessage" class="error-section">
          <el-alert :title="task.errorMessage" type="error" :closable="false" show-icon />
        </div>
      </el-card>

      <!-- 任务信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><InfoFilled /></el-icon>
            <span>基本信息</span>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务 ID">
            <el-tag>{{ task.taskId }}</el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="状态">
            <TaskStatus :status="task.status" />
          </el-descriptions-item>

          <el-descriptions-item label="购买地址" :span="2">
            <div class="address-content">
              <span class="address-text">{{ task.userAddress }}</span>
              <el-button
                :icon="CopyDocument"
                size="small"
                text
                @click="copyText(task.userAddress)"
              />
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="iExec 任务 ID" :span="2">
            <span v-if="task.iexecTaskId" class="monospace">{{ task.iexecTaskId }}</span>
            <span v-else class="placeholder">-</span>
          </el-descriptions-item>

          <el-descriptions-item label="Arbitrum 交易哈希" :span="2">
            <div v-if="task.arbitrumTaskId" class="hash-content">
              <span class="hash-text monospace">{{ task.arbitrumTaskId }}</span>
              <el-button
                :icon="CopyDocument"
                size="small"
                text
                @click="copyText(task.arbitrumTaskId)"
              />
              <el-button
                :icon="Link"
                size="small"
                text
                type="primary"
                @click="viewOnArbiscan(task.arbitrumTaskId)"
              >
                在 Arbiscan 查看
              </el-button>
            </div>
            <span v-else class="placeholder">未提交到 Arbitrum</span>
          </el-descriptions-item>

          <el-descriptions-item label="创建时间">
            {{ formatDateTime(task.createdAt) }}
          </el-descriptions-item>

          <el-descriptions-item label="更新时间">
            {{ formatDateTime(task.updatedAt) }}
          </el-descriptions-item>

          <el-descriptions-item label="完成时间" :span="2">
            <span v-if="task.completedAt">{{ formatDateTime(task.completedAt) }}</span>
            <span v-else class="placeholder">未完成</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 计算结果 -->
      <el-card
        v-if="task.status === 'Completed' && task.resultHash"
        class="result-card"
        shadow="never"
      >
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>计算结果</span>
          </div>
        </template>

        <div class="result-content">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="结果哈希">
              <div class="hash-content">
                <span class="hash-text">{{ task.resultHash }}</span>
                <el-button
                  :icon="CopyDocument"
                  size="small"
                  text
                  @click="copyText(task.resultHash)"
                />
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>

      <!-- 时间线 -->
      <el-card class="timeline-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Clock /></el-icon>
            <span>任务时间线</span>
          </div>
        </template>

        <el-timeline>
          <el-timeline-item
            :timestamp="formatDateTime(task.createdAt)"
            type="primary"
            :icon="CirclePlus"
          >
            任务创建
          </el-timeline-item>

          <el-timeline-item
            v-if="task.status !== 'Created'"
            :timestamp="formatDateTime(task.updatedAt)"
            type="warning"
            :icon="Loading"
          >
            任务开始执行
          </el-timeline-item>

          <el-timeline-item
            v-if="task.status === 'Completed'"
            :timestamp="formatDateTime(task.completedAt)"
            type="success"
            :icon="CircleCheck"
          >
            任务完成
          </el-timeline-item>

          <el-timeline-item
            v-if="task.status === 'Failed'"
            :timestamp="formatDateTime(task.updatedAt)"
            type="danger"
            :icon="CircleClose"
          >
            任务失败
          </el-timeline-item>

          <el-timeline-item
            v-if="task.status === 'Refunded'"
            :timestamp="formatDateTime(task.updatedAt)"
            type="info"
            :icon="RefreshLeft"
          >
            任务已退款
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>

    <!-- 未找到任务 -->
    <el-empty v-else description="未找到该任务" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/store/task'
import TaskStatus from '@/components/TaskStatus.vue'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  InfoFilled,
  CopyDocument,
  Document,
  View,
  Download,
  Clock,
  CirclePlus,
  Loading,
  CircleCheck,
  CircleClose,
  RefreshLeft,
  Link
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { TaskEntity } from '@/types'
import { IPFS_GATEWAY } from '@/config/env'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()

const task = ref<TaskEntity | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const refreshTimer = ref<number | null>(null)

// 任务进度百分比（模拟）
const progressPercentage = computed(() => {
  if (!task.value) return 0
  
  const now = new Date().getTime()
  const start = new Date(task.value.createdAt).getTime()
  const elapsed = now - start
  
  // 假设平均完成时间为 10 分钟
  const estimatedDuration = 10 * 60 * 1000
  const progress = Math.min((elapsed / estimatedDuration) * 100, 99)
  
  return Math.floor(progress)
})

// 进度状态
const progressStatus = computed(() => {
  if (progressPercentage.value < 30) return undefined
  if (progressPercentage.value < 70) return 'warning'
  return 'success'
})

// 进度文本
const progressText = computed(() => {
  const elapsed = dayjs().diff(dayjs(task.value?.createdAt), 'minute')
  return `已运行 ${elapsed} 分钟`
})

// 格式化日期时间
function formatDateTime(dateString: string): string {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

// 复制文本
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 在 IPFS 上查看
function viewOnIPFS(hash: string) {
  const url = `${IPFS_GATEWAY}${hash}`
  window.open(url, '_blank')
}

// 在 Arbiscan 上查看交易
function viewOnArbiscan(txHash: string) {
  const url = `https://sepolia.arbiscan.io/tx/${txHash}`
  window.open(url, '_blank')
}

// 下载结果
async function downloadResult(hash: string) {
  try {
    const url = `${IPFS_GATEWAY}${hash}`
    window.open(url, '_blank')
    ElMessage.success('正在下载...')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

// 刷新任务
async function refreshTask() {
  if (!task.value) return

  refreshing.value = true
  try {
    const updated = await taskStore.fetchTaskById(task.value.id)
    if (updated) {
      task.value = updated
      ElMessage.success('刷新成功')
    }
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 返回
function goBack() {
  router.push('/tasks')
}

// 加载任务详情
async function loadTask() {
  const taskId = Number(route.params.id)
  if (isNaN(taskId)) {
    ElMessage.error('无效的任务 ID')
    goBack()
    return
  }

  loading.value = true
  try {
    const taskData = await taskStore.fetchTaskById(taskId)
    if (taskData) {
      task.value = taskData
    } else {
      ElMessage.error('未找到该任务')
      goBack()
    }
  } catch (error) {
    ElMessage.error('加载任务失败')
    goBack()
  } finally {
    loading.value = false
  }
}

// 自动刷新（Running 状态下）
function setupAutoRefresh() {
  if (task.value?.status === 'Running') {
    refreshTimer.value = window.setInterval(() => {
      refreshTask()
    }, 30000) // 30秒刷新一次
  }
}

onMounted(async () => {
  await loadTask()
  setupAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
})
</script>

<style scoped lang="scss">
.task-detail-page {
  max-width: 1000px;
  margin: 0 auto;

  .page-header {
    margin-bottom: 24px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
    }
  }

  .detail-content {
    display: flex;
    flex-direction: column;
    gap: 24px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #303133;

      .el-icon {
        font-size: 18px;
        color: #409eff;
      }
    }

    .status-card {
      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .progress-section {
        .progress-text {
          margin-top: 8px;
          text-align: center;
          color: #909399;
          font-size: 14px;
        }
      }

      .error-section {
        margin-top: 16px;
      }
    }

    .info-card {
      .address-content,
      .hash-content {
        display: flex;
        align-items: center;
        gap: 8px;

        .address-text,
        .hash-text {
          font-family: monospace;
          font-size: 14px;
          word-break: break-all;
        }
      }

      .monospace {
        font-family: monospace;
        font-size: 14px;
      }

      .placeholder {
        color: #909399;
      }
    }

    .result-card {
      .result-content {
        .hash-content {
          display: flex;
          align-items: center;
          gap: 8px;

          .hash-text {
            font-family: monospace;
            font-size: 13px;
            word-break: break-all;
          }
        }

        .result-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          justify-content: center;
        }
      }
    }

    .timeline-card {
      :deep(.el-timeline) {
        padding-left: 12px;
      }
    }
  }
}
</style>
