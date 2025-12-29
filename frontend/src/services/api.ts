import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { API_BASE_URL } from '@/config/env'
import { ElMessage } from 'element-plus'
import type {
  TaskEntity,
  MonitoringStats,
  SchedulingStrategy,
  PerformanceComparison,
  ResourceRequirement
} from '@/types'

/**
 * Axios 实例配置
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * 请求拦截器
 */
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等认证信息
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // 统一错误处理
    let errorMessage = '请求失败'

    if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时，请检查网络连接'
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      errorMessage = '网络错误，请检查后端服务是否启动（http://localhost:8081）'
    } else if (error.response) {
      // 服务器返回错误状态码
      switch (error.response.status) {
        case 400:
          errorMessage = '请求参数错误'
          break
        case 401:
          errorMessage = '未授权，请重新登录'
          break
        case 403:
          errorMessage = '拒绝访问'
          break
        case 404:
          errorMessage = '请求的资源不存在'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        case 503:
          errorMessage = '服务不可用'
          break
        default:
          errorMessage = error.response.data?.message || '请求失败'
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      errorMessage = '网络错误，请检查网络连接'
    } else {
      // 其他错误
      errorMessage = error.message || '请求失败'
    }

    ElMessage.error(errorMessage)
    return Promise.reject(error)
  }
)

// ==================== 任务相关 API ====================

/**
 * 任务 API
 */
export const taskApi = {
  /**
   * 获取所有任务
   */
  getAllTasks(): Promise<AxiosResponse<TaskEntity[]>> {
    return apiClient.get('/tasks')
  },

  /**
   * 根据数据库 ID 获取任务
   */
  getTaskById(id: number): Promise<AxiosResponse<TaskEntity>> {
    return apiClient.get(`/tasks/${id}`)
  },

  /**
   * 根据合约任务 ID 获取任务
   */
  getTaskByTaskId(taskId: string): Promise<AxiosResponse<TaskEntity>> {
    return apiClient.get(`/tasks/task-id/${taskId}`)
  },

  /**
   * 根据 iExec 任务 ID 获取任务
   */
  getTaskByIexecTaskId(iexecTaskId: string): Promise<AxiosResponse<TaskEntity>> {
    return apiClient.get(`/tasks/iexec-task-id/${iexecTaskId}`)
  },

  /**
   * 创建任务
   */
  createTask(task: Partial<TaskEntity>): Promise<AxiosResponse<TaskEntity>> {
    return apiClient.post('/tasks', task)
  },

  /**
   * 更新任务
   */
  updateTask(id: number, task: Partial<TaskEntity>): Promise<AxiosResponse<TaskEntity>> {
    return apiClient.put(`/tasks/${id}`, task)
  },

  /**
   * 更新任务状态
   */
  updateTaskStatus(id: number, status: string): Promise<AxiosResponse<TaskEntity>> {
    return apiClient.put(`/tasks/${id}/status`, null, {
      params: { status }
    })
  },

  /**
   * 删除任务
   */
  deleteTask(id: number): Promise<AxiosResponse<void>> {
    return apiClient.delete(`/tasks/${id}`)
  }
}

// ==================== 监控相关 API ====================

/**
 * 监控 API
 */
export const monitorApi = {
  /**
   * 获取监控统计信息
   */
  getStats(): Promise<AxiosResponse<MonitoringStats>> {
    return apiClient.get('/monitor/stats')
  },

  /**
   * 手动触发任务监控
   */
  triggerMonitoring(): Promise<AxiosResponse<string>> {
    return apiClient.post('/monitor/trigger')
  },

  /**
   * 预测任务完成时间
   */
  predictCompletionTime(serviceId: number): Promise<AxiosResponse<number>> {
    return apiClient.get(`/monitor/predict/${serviceId}`)
  },

  /**
   * 获取调度策略
   */
  getSchedulingStrategy(serviceId: number): Promise<AxiosResponse<SchedulingStrategy>> {
    return apiClient.get(`/monitor/scheduling-strategy/${serviceId}`)
  },

  /**
   * 获取性能对比
   */
  getPerformanceComparison(serviceId: number): Promise<AxiosResponse<PerformanceComparison>> {
    return apiClient.get(`/monitor/performance-comparison/${serviceId}`)
  },

  /**
   * 预测资源需求
   */
  predictResourceRequirement(
    serviceId: number,
    taskCount: number
  ): Promise<AxiosResponse<ResourceRequirement>> {
    return apiClient.get(`/monitor/resource-requirement/${serviceId}/${taskCount}`)
  }
}

// ==================== 通用请求方法 ====================

/**
 * 通用 GET 请求
 */
export function get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return apiClient.get(url, config)
}

/**
 * 通用 POST 请求
 */
export function post<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return apiClient.post(url, data, config)
}

/**
 * 通用 PUT 请求
 */
export function put<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return apiClient.put(url, data, config)
}

/**
 * 通用 DELETE 请求
 */
export function del<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return apiClient.delete(url, config)
}

export default apiClient
