import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TaskEntity } from '@/types'
import { taskApi } from '@/services/api'
import { contractService } from '@/services/contract'
import { ethers } from 'ethers'

/**
 * 任务状态管理 Store
 * 负责任务数据缓存、轮询刷新等功能
 */
export const useTaskStore = defineStore('task', () => {
  // ==================== State ====================
  const tasks = ref<TaskEntity[]>([])
  const loading = ref<boolean>(false)
  const pollingTimer = ref<number | null>(null)
  const pollingInterval = ref<number>(30000) // 默认30秒轮询一次
  const useBlockchain = ref<boolean>(true) // 是否直接从区块链读取

  // ==================== Computed ====================
  const runningTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'Running')
  })

  const completedTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'Completed')
  })

  const failedTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'Failed')
  })

  const taskCount = computed(() => ({
    total: tasks.value.length,
    running: runningTasks.value.length,
    completed: completedTasks.value.length,
    failed: failedTasks.value.length
  }))

  // ==================== Actions ====================

  /**
   * 从区块链直接获取任务
   */
  async function fetchTasksFromBlockchain(userAddress?: string) {
    console.log('🔍 开始从区块链查询任务，用户地址:', userAddress)
    
    if (!contractService || !contractService.isInitialized) {
      console.warn('⚠️ 合约服务未初始化')
      return []
    }

    try {
      const taskCount = await contractService.getTaskCount()
      console.log('📊 链上总任务数:', taskCount)
      
      // 安全检查：如果任务数量异常大，限制查询范围
      const maxTasksToQuery = Math.min(taskCount, 100)
      if (taskCount > 100) {
        console.warn(`⚠️ 任务数量过多 (${taskCount})，将只查询最近的 100 个任务`)
      }
      
      const fetchedTasks: TaskEntity[] = []

      // 从最新的任务开始查询（倒序）
      for (let i = taskCount; i > Math.max(0, taskCount - maxTasksToQuery); i--) {
        try {
          console.log(`🔎 正在获取任务 ${i}/${taskCount}...`)
          const { task, resultHash } = await contractService.getTask(i)
          
          // 检查任务是否有效（taskId > 0）
          if (!task || !task.taskId || Number(task.taskId) === 0) {
            console.log(`⚠️ 任务 ${i} 不存在或无效，跳过`)
            continue
          }
          
          console.log(`✅ 任务 ${i} 数据:`, {
            taskId: task.taskId,
            buyer: task.buyer,
            status: task.status,
            serviceId: task.serviceId
          })
          
          // 如果指定了用户地址，只返回该用户的任务
          if (userAddress && task.buyer.toLowerCase() !== userAddress.toLowerCase()) {
            console.log(`⏭️ 任务 ${i} 不属于当前用户，跳过`)
            continue
          }

          // 转换状态 - 合约状态: 0=Created, 1=Running, 2=Completed, 3=Refunded
          const statusMap = ['Created', 'Running', 'Completed', 'Refunded']
          const status = statusMap[Number(task.status)] || 'Created'

          const taskEntity: TaskEntity = {
            id: Number(task.taskId),
            taskId: task.taskId.toString(),
            iexecTaskId: '',
            userAddress: task.buyer,
            serviceId: Number(task.serviceId),
            status: status as TaskStatus,
            amount: ethers.formatEther(task.amount),
            resultHash: resultHash || '',
            createdAt: new Date(Number(task.createdAt) * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: task.completedAt > 0 ? new Date(Number(task.completedAt) * 1000).toISOString() : '',
            errorMessage: ''
          }

          fetchedTasks.push(taskEntity)
          console.log(`✨ 任务 ${i} 添加到列表`)
        } catch (err) {
          console.error(`❌ 获取任务 ${i} 失败:`, err)
          // 继续查询下一个任务
        }
      }

      console.log(`🎉 从区块链获取到 ${fetchedTasks.length} 个任务`)
      return fetchedTasks
    } catch (error) {
      console.error('从区块链获取任务失败:', error)
      return []
    }
  }

  /**
   * 获取所有任务
   */
  async function fetchAllTasks(showLoading = true, userAddress?: string) {
    if (showLoading) loading.value = true

    try {
      let fetchedTasks: TaskEntity[] = []

      // 优先从区块链读取
      if (useBlockchain.value) {
        fetchedTasks = await fetchTasksFromBlockchain(userAddress)
      }

      // 如果区块链读取失败或为空，尝试从后端读取
      if (fetchedTasks.length === 0) {
        try {
          const response = await taskApi.getAllTasks()
          fetchedTasks = response.data
          
          // 如果指定了用户地址，进行过滤
          if (userAddress) {
            fetchedTasks = fetchedTasks.filter(
              task => task.userAddress.toLowerCase() === userAddress.toLowerCase()
            )
          }
          
          console.log('从后端API获取到', fetchedTasks.length, '个任务')
        } catch (apiError) {
          console.warn('后端API获取任务失败，使用空列表:', apiError)
        }
      }

      tasks.value = fetchedTasks
      return tasks.value
    } catch (error) {
      console.error('获取任务列表失败:', error)
      throw error
    } finally {
      if (showLoading) loading.value = false
    }
  }

  /**
   * 根据用户地址获取任务
   */
  function getTasksByAddress(userAddress: string): TaskEntity[] {
    return tasks.value.filter(
      task => task.userAddress.toLowerCase() === userAddress.toLowerCase()
    )
  }

  /**
   * 根据任务 ID 获取任务详情
   */
  async function fetchTaskById(id: number): Promise<TaskEntity | null> {
    try {
      // 优先从区块链读取
      if (useBlockchain.value && contractService.isInitialized) {
        console.log('🔍 从区块链获取任务详情，ID:', id)
        
        try {
          const { task, resultHash } = await contractService.getTask(id)
          
          // 检查任务是否有效
          if (!task || !task.taskId || Number(task.taskId) === 0) {
            console.log('⚠️ 任务不存在或无效')
            return null
          }
          
          // 转换状态
          const statusMap = ['Created', 'Running', 'Completed', 'Refunded']
          const status = statusMap[Number(task.status)] || 'Created'
          
          const taskEntity: TaskEntity = {
            id: Number(task.taskId),
            taskId: task.taskId.toString(),
            iexecTaskId: '',
            userAddress: task.buyer,
            serviceId: Number(task.serviceId),
            status: status as TaskStatus,
            amount: ethers.formatEther(task.amount),
            resultHash: resultHash || '',
            createdAt: new Date(Number(task.createdAt) * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: task.completedAt > 0 
              ? new Date(Number(task.completedAt) * 1000).toISOString() 
              : '',
            errorMessage: ''
          }
          
          console.log('✅ 从区块链获取任务成功:', taskEntity)
          return taskEntity
        } catch (blockchainError) {
          console.error('从区块链获取任务失败:', blockchainError)
        }
      }
      
      // 备选：从后端 API 读取
      console.log('尝试从后端 API 获取任务详情...')
      const response = await taskApi.getTaskById(id)
      return response.data
    } catch (error) {
      console.error('获取任务详情失败:', error)
      return null
    }
  }

  /**
   * 根据合约任务 ID 获取任务
   */
  async function fetchTaskByTaskId(taskId: string): Promise<TaskEntity | null> {
    try {
      const response = await taskApi.getTaskByTaskId(taskId)
      return response.data
    } catch (error) {
      console.error('获取任务失败:', error)
      return null
    }
  }

  /**
   * 更新任务状态
   */
  async function updateTaskStatus(id: number, status: string): Promise<boolean> {
    try {
      await taskApi.updateTaskStatus(id, status)
      
      // 更新本地缓存
      const index = tasks.value.findIndex(task => task.id === id)
      if (index !== -1) {
        tasks.value[index].status = status as any
      }

      return true
    } catch (error) {
      console.error('更新任务状态失败:', error)
      return false
    }
  }

  /**
   * 开始轮询
   */
  function startPolling(userAddress?: string) {
    // 如果已经在轮询，先停止
    if (pollingTimer.value) {
      stopPolling()
    }

    // 立即执行一次
    fetchAllTasks(false, userAddress)

    // 设置定时轮询
    pollingTimer.value = window.setInterval(() => {
      fetchAllTasks(false, userAddress)
    }, pollingInterval.value)

    console.log('任务轮询已启动，间隔:', pollingInterval.value, 'ms')
  }

  /**
   * 停止轮询
   */
  function stopPolling() {
    if (pollingTimer.value) {
      clearInterval(pollingTimer.value)
      pollingTimer.value = null
      console.log('任务轮询已停止')
    }
  }

  /**
   * 设置轮询间隔
   */
  function setPollingInterval(interval: number) {
    pollingInterval.value = interval
    
    // 如果正在轮询，重启以应用新间隔
    if (pollingTimer.value) {
      startPolling()
    }
  }

  /**
   * 清空任务列表
   */
  function clearTasks() {
    tasks.value = []
  }

  /**
   * 重置 Store
   */
  function reset() {
    stopPolling()
    clearTasks()
    loading.value = false
  }

  return {
    // State
    tasks,
    loading,
    pollingInterval,

    // Computed
    runningTasks,
    completedTasks,
    failedTasks,
    taskCount,

    // Actions
    fetchAllTasks,
    getTasksByAddress,
    fetchTaskById,
    fetchTaskByTaskId,
    updateTaskStatus,
    startPolling,
    stopPolling,
    setPollingInterval,
    clearTasks,
    reset
  }
})
