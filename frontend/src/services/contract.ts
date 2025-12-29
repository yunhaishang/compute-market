import { ethers } from 'ethers'
import type {
  ContractTask,
  ContractService,
  Service,
  TaskCreatedEvent,
  TaskCompletedEvent
} from '@/types'
import { CONTRACT_ADDRESS } from '@/config/env'
import { ElMessage } from 'element-plus'

// 导入合约 ABI（需要先运行 npm run sync:abi 同步）
let ComputeMarketABI: any
try {
  ComputeMarketABI = await import('@/abis/ComputeMarket.json')
} catch (error) {
  console.warn('未找到合约 ABI 文件，请先编译合约并运行 npm run sync:abi')
  ComputeMarketABI = { abi: [] }
}

/**
 * 智能合约交互服务类
 */
export class ContractService {
  private contract: ethers.Contract | null = null
  private provider: ethers.BrowserProvider | null = null
  private signer: ethers.Signer | null = null
  public isInitialized = false

  /**
   * 初始化合约实例
   */
  async init(provider: ethers.BrowserProvider) {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0xYOUR_CONTRACT_ADDRESS_HERE') {
      throw new Error('合约地址未配置，请在 .env 文件中设置 VITE_CONTRACT_ADDRESS')
    }

    this.provider = provider
    this.signer = await provider.getSigner()

    // 创建合约实例
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, ComputeMarketABI.abi, this.signer)
    this.isInitialized = true

    console.log('合约服务初始化成功，合约地址:', CONTRACT_ADDRESS)
  }

  /**
   * 确保合约已初始化
   */
  private ensureContract(): ethers.Contract {
    if (!this.contract) {
      throw new Error('合约未初始化，请先调用 init() 方法')
    }
    return this.contract
  }

  // ==================== 用户交互函数 ====================

  /**
   * 购买算力服务
   * @param serviceId 服务 ID
   * @param value 支付金额（ETH）
   * @returns 交易哈希
   */
  async buyCompute(serviceId: number, value: string): Promise<string> {
    const contract = this.ensureContract()

    try {
      const valueWei = ethers.parseEther(value)

      // 估算 Gas
      const gasEstimate = await contract.buyCompute.estimateGas(serviceId, {
        value: valueWei
      })

      // 发送交易（增加 20% Gas 余量）
      const tx = await contract.buyCompute(serviceId, {
        value: valueWei,
        gasLimit: (gasEstimate * 120n) / 100n
      })

      console.log('购买交易已发送:', tx.hash)
      return tx.hash
    } catch (error: any) {
      console.error('购买失败:', error)
      throw this.handleContractError(error)
    }
  }

  /**
   * 等待交易确认
   * @param txHash 交易哈希
   * @param confirmations 确认数（默认 1）
   */
  async waitForTransaction(txHash: string, confirmations = 1): Promise<ethers.TransactionReceipt> {
    if (!this.provider) {
      throw new Error('Provider 未初始化')
    }

    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations)
      if (!receipt) {
        throw new Error('交易收据为空')
      }

      if (receipt.status === 0) {
        throw new Error('交易执行失败')
      }

      return receipt
    } catch (error: any) {
      console.error('等待交易确认失败:', error)
      throw error
    }
  }

  // ==================== 查询函数 ====================

  /**
   * 获取任务信息
   * @param taskId 任务 ID
   * @returns 任务信息和结果哈希
   */
  async getTask(taskId: number): Promise<{ task: ContractTask; resultHash: string }> {
    const contract = this.ensureContract()

    try {
      console.log(`📞 调用合约 getTask(${taskId})...`)
      const [task, resultHash] = await contract.getTask(taskId)
      
      console.log(`✅ getTask(${taskId}) 返回:`, {
        taskId: task.taskId?.toString(),
        buyer: task.buyer,
        status: task.status,
        amount: task.amount?.toString()
      })

      return {
        task: {
          taskId: task.taskId,
          serviceId: task.serviceId,
          buyer: task.buyer,
          amount: task.amount,
          status: task.status,
          createdAt: Number(task.createdAt),
          completedAt: Number(task.completedAt)
        },
        resultHash
      }
    } catch (error: any) {
      console.error(`❌ getTask(${taskId}) 失败:`, error)
      throw this.handleContractError(error)
    }
  }

  /**
   * 获取任务结果哈希
   * @param taskId 任务 ID
   */
  async getTaskResultHash(taskId: number): Promise<string> {
    const contract = this.ensureContract()

    try {
      return await contract.getTaskResultHash(taskId)
    } catch (error: any) {
      console.error('获取任务结果失败:', error)
      throw this.handleContractError(error)
    }
  }

  /**
   * 获取服务信息
   * @param serviceId 服务 ID
   */
  async getService(serviceId: number): Promise<ContractService> {
    const contract = this.ensureContract()

    try {
      const service = await contract.getService(serviceId)

      return {
        serviceId: service.serviceId,
        price: service.price,
        active: service.active
      }
    } catch (error: any) {
      console.error('获取服务信息失败:', error)
      throw this.handleContractError(error)
    }
  }

  /**
   * 获取任务总数
   */
  async getTaskCount(): Promise<number> {
    const contract = this.ensureContract()

    try {
      console.log('📞 调用合约 getTaskCount()...')
      const count = await contract.getTaskCount()
      console.log('✅ getTaskCount() 返回:', count.toString())
      return Number(count)
    } catch (error: any) {
      console.error('❌ getTaskCount() 失败:', error)
      throw this.handleContractError(error)
    }
  }

  /**
   * 获取合约余额
   */
  async getBalance(): Promise<string> {
    const contract = this.ensureContract()

    try {
      const balance = await contract.getBalance()
      return ethers.formatEther(balance)
    } catch (error: any) {
      console.error('获取合约余额失败:', error)
      throw this.handleContractError(error)
    }
  }

  // ==================== 事件监听 ====================

  /**
   * 监听 TaskCreated 事件
   */
  onTaskCreated(callback: (event: TaskCreatedEvent) => void) {
    const contract = this.ensureContract()

    contract.on('TaskCreated', (taskId, serviceId, buyer, amount, timestamp, event) => {
      callback({
        taskId,
        serviceId,
        buyer,
        amount,
        timestamp
      })
    })
  }

  /**
   * 监听 TaskCompleted 事件
   */
  onTaskCompleted(callback: (event: TaskCompletedEvent) => void) {
    const contract = this.ensureContract()

    contract.on('TaskCompleted', (taskId, serviceId, buyer, resultHash, timestamp, event) => {
      callback({
        taskId,
        serviceId,
        buyer,
        resultHash,
        timestamp
      })
    })
  }

  /**
   * 移除所有事件监听
   */
  removeAllListeners() {
    const contract = this.ensureContract()
    contract.removeAllListeners()
  }

  // ==================== 工具方法 ====================

  /**
   * 处理合约错误
   */
  private handleContractError(error: any): Error {
    let message = '合约调用失败'

    if (error.code === 'ACTION_REJECTED') {
      message = '用户取消了交易'
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      message = '账户余额不足'
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      message = 'Gas 估算失败，交易可能会失败'
    } else if (error.data) {
      // 尝试解析合约自定义错误
      message = error.reason || error.message || message
    } else if (error.message) {
      message = error.message
    }

    return new Error(message)
  }
}

// 导出单例实例
export const contractService = new ContractService()

// ==================== 预设服务配置 ====================

/**
 * 预设的算力服务列表
 * 这些服务需要在合约部署时通过 registerService 注册
 */
export const PRESET_SERVICES: Service[] = [
  {
    serviceId: 1,
    name: '基础算力服务',
    description: 'Python 脚本执行 - 适用于简单的数据处理和计算任务',
    price: '0.1',
    priceWei: ethers.parseEther('0.1'),
    active: true,
    icon: '🔹'
  },
  {
    serviceId: 2,
    name: '高级算力服务',
    description: 'AI 模型推理 - 支持机器学习模型的推理和预测',
    price: '0.5',
    priceWei: ethers.parseEther('0.5'),
    active: true,
    icon: '🔸'
  },
  {
    serviceId: 3,
    name: '专业算力服务',
    description: '大规模数据分析 - 处理海量数据的分布式计算',
    price: '1.0',
    priceWei: ethers.parseEther('1.0'),
    active: true,
    icon: '💎'
  }
]
