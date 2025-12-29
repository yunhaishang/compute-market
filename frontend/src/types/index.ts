/**
 * TypeScript 类型定义
 */

// ==================== 后端 API 数据类型 ====================

/**
 * 任务实体（后端数据库模型）
 */
export interface TaskEntity {
  id: number
  taskId: string
  iexecTaskId: string
  userAddress: string
  serviceId?: number  // 服务ID（可选，从区块链查询时使用）
  amount?: string     // 支付金额（可选，从区块链查询时使用）
  status: TaskStatus
  resultHash: string
  createdAt: string
  updatedAt: string
  completedAt: string
  errorMessage: string
}

/**
 * 任务状态枚举
 */
export type TaskStatus = 'Created' | 'Running' | 'Completed' | 'Failed' | 'Refunded'

/**
 * 监控统计信息
 */
export interface MonitoringStats {
  totalTasks: number
  runningTasks: number
  completedTasks: number
  failedTasks: number
  averageCompletionTime: number
  lastUpdateTime: string
}

/**
 * 调度策略
 */
export interface SchedulingStrategy {
  strategyName: string
  estimatedTime: number
  confidence: number
  description: string
}

/**
 * 性能对比
 */
export interface PerformanceComparison {
  basicScheduling: number
  wmaScheduling: number
  reputationScheduling: number
  improvement: number
}

/**
 * 资源需求预测
 */
export interface ResourceRequirement {
  cpuCores: number
  memoryGB: number
  diskGB: number
  estimatedCost: number
}

// ==================== 智能合约数据类型 ====================

/**
 * 合约任务结构（链上数据）
 */
export interface ContractTask {
  taskId: bigint
  serviceId: bigint
  buyer: string
  amount: bigint
  status: ContractTaskStatus
  createdAt: number
  completedAt: number
}

/**
 * 合约任务状态枚举
 */
export enum ContractTaskStatus {
  Created = 0,
  Running = 1,
  Completed = 2,
  Refunded = 3
}

/**
 * 合约服务结构
 */
export interface ContractService {
  serviceId: bigint
  price: bigint
  active: boolean
}

/**
 * 服务信息（带扩展信息）
 */
export interface Service {
  serviceId: number
  price: string // ETH 格式，如 "0.1"
  priceWei: bigint
  active: boolean
  name: string
  description: string
  icon?: string
}

// ==================== 合约事件类型 ====================

/**
 * TaskCreated 事件
 */
export interface TaskCreatedEvent {
  taskId: bigint
  serviceId: bigint
  buyer: string
  amount: bigint
  timestamp: bigint
}

/**
 * TaskCompleted 事件
 */
export interface TaskCompletedEvent {
  taskId: bigint
  serviceId: bigint
  buyer: string
  resultHash: string
  timestamp: bigint
}

/**
 * TaskRefunded 事件
 */
export interface TaskRefundedEvent {
  taskId: bigint
  serviceId: bigint
  buyer: string
  amount: bigint
  timestamp: bigint
}

/**
 * ServiceRegistered 事件
 */
export interface ServiceRegisteredEvent {
  serviceId: bigint
  price: bigint
  registrant: string
}

// ==================== 钱包相关类型 ====================

/**
 * 钱包状态
 */
export interface WalletState {
  address: string | null
  balance: string
  chainId: number | null
  isConnected: boolean
  isCorrectNetwork: boolean
}

/**
 * 网络配置
 */
export interface NetworkConfig {
  chainId: number
  chainName: string
  rpcUrl: string
  blockExplorer?: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

// ==================== 交易相关类型 ====================

/**
 * 交易状态
 */
export type TransactionStatus = 'pending' | 'confirming' | 'success' | 'failed'

/**
 * 交易信息
 */
export interface TransactionInfo {
  hash: string
  status: TransactionStatus
  confirmations: number
  error?: string
}

// ==================== UI 组件类型 ====================

/**
 * 表格列配置
 */
export interface TableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  formatter?: (row: any, column: any, cellValue: any, index: number) => any
}

/**
 * 分页配置
 */
export interface Pagination {
  currentPage: number
  pageSize: number
  total: number
}

// ==================== 工具类型 ====================

/**
 * API 响应包装
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

/**
 * 错误信息
 */
export interface ErrorInfo {
  code: string
  message: string
  details?: any
}
