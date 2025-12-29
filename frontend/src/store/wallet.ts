import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ethers } from 'ethers'
import type { WalletState } from '@/types'
import { CHAIN_ID, getNetworkConfig, isSupportedNetwork } from '@/config/env'
import { ElMessage, ElNotification } from 'element-plus'
import { contractService } from '@/services/contract'

/**
 * 钱包状态管理 Store
 * 负责 MetaMask 连接、账户管理、网络切换等功能
 */
export const useWalletStore = defineStore('wallet', () => {
  // ==================== State ====================
  const address = ref<string | null>(null)
  const balance = ref<string>('0')
  const chainId = ref<number | null>(null)
  const isConnected = ref<boolean>(false)
  const wasDisconnected = ref<boolean>(false) // 追踪是否主动断开过连接

  // ==================== Computed ====================
  const isCorrectNetwork = computed(() => {
    return chainId.value === CHAIN_ID
  })

  const shortAddress = computed(() => {
    if (!address.value) return ''
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
  })

  const walletState = computed<WalletState>(() => ({
    address: address.value,
    balance: balance.value,
    chainId: chainId.value,
    isConnected: isConnected.value,
    isCorrectNetwork: isCorrectNetwork.value
  }))

  // ==================== Provider ====================
  const provider = computed(() => {
    if (!window.ethereum) return null
    return new ethers.BrowserProvider(window.ethereum)
  })

  // ==================== Actions ====================

  /**
   * 检查并恢复钱包连接（页面刷新后自动调用）
   */
  async function checkConnection(): Promise<boolean> {
    if (!checkMetaMaskInstalled()) return false

    try {
      // 尝试获取已连接的账户
      const accounts = await window.ethereum!.request({
        method: 'eth_accounts'
      }) as string[]

      if (accounts.length > 0) {
        address.value = accounts[0]
        isConnected.value = true
        
        await updateChainId()
        await updateBalance()
        setupEventListeners()
        
        console.log('✅ 钱包连接已恢复:', address.value)
        return true
      }
      
      return false
    } catch (error) {
      console.error('检查连接失败:', error)
      return false
    }
  }

  /**
   * 检查 MetaMask 是否已安装
   */
  function checkMetaMaskInstalled(): boolean {
    // 检查 window.ethereum 是否存在
    if (typeof window.ethereum === 'undefined') {
      ElNotification({
        title: '未检测到 MetaMask',
        message: '请安装 MetaMask 钱包扩展程序。访问 https://metamask.io 下载安装',
        type: 'warning',
        duration: 8000
      })
      
      // 在控制台输出详细信息
      console.warn('MetaMask not detected. Please install MetaMask extension.')
      console.warn('Visit: https://metamask.io/download/')
      
      return false
    }
    
    // 验证是否是 MetaMask
    if (!window.ethereum.isMetaMask) {
      console.warn('Detected wallet provider is not MetaMask')
    }
    
    return true
  }

  /**
   * 连接钱包
   */
  async function connectWallet(): Promise<boolean> {
    if (!checkMetaMaskInstalled()) return false

    try {
      // 如果已经连接，先断开
      if (isConnected.value) {
        console.log('Wallet already connected, disconnecting first...')
        disconnectWallet()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      let accounts: string[]

      // 如果之前主动断开过，强制重新请求权限（会弹出账户选择）
      if (wasDisconnected.value) {
        console.log('Requesting permissions after disconnect...')
        try {
          // 请求权限会弹出 MetaMask 账户选择窗口
          await window.ethereum!.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          })
        } catch (permError: any) {
          // 用户拒绝了权限请求
          if (permError.code === 4001) {
            ElMessage.warning('用户取消了连接请求')
            return false
          }
          console.warn('Permission request failed, falling back to eth_requestAccounts:', permError)
        }
        
        // 重置标志
        wasDisconnected.value = false
      }

      // 获取账户（如果上面请求了权限，这里会返回用户选择的账户）
      accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts'
      }) as string[]

      if (accounts.length === 0) {
        throw new Error('未找到账户')
      }

      address.value = accounts[0]
      isConnected.value = true

      // 获取链 ID
      await updateChainId()

      // 获取余额
      await updateBalance()

      // 设置事件监听
      setupEventListeners()
      
      // 初始化合约服务
      try {
        const providerInstance = new ethers.BrowserProvider(window.ethereum!)
        await contractService.init(providerInstance)
        console.log('✅ 合约服务已初始化')
      } catch (error) {
        console.error('初始化合约服务失败:', error)
      }

      ElMessage.success('钱包连接成功')

      return true
    } catch (error: any) {
      console.error('连接钱包失败:', error)
      
      // 用户拒绝连接
      if (error.code === 4001) {
        ElMessage.warning('用户取消了连接请求')
      } else {
        ElMessage.error(error.message || '连接钱包失败')
      }
      
      return false
    }
  }

  /**
   * 断开连接
   */
  function disconnectWallet() {
    address.value = null
    balance.value = '0'
    chainId.value = null
    isConnected.value = false
    wasDisconnected.value = true // 标记为主动断开

    // 移除事件监听
    removeEventListeners()

    ElNotification({
      title: '钱包已断开',
      message: '下次连接时可以重新选择账户',
      type: 'info',
      duration: 3000
    })
  }

  /**
   * 重新连接（强制请求授权）
   */
  async function reconnectWallet(): Promise<boolean> {
    if (!checkMetaMaskInstalled()) return false

    try {
      // 先断开现有连接
      if (isConnected.value) {
        // 直接清除状态，不设置 wasDisconnected（因为这是切换账户，不是断开）
        address.value = null
        balance.value = '0'
        chainId.value = null
        isConnected.value = false
        removeEventListeners()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // 强制请求权限（会打开 MetaMask 弹窗让用户重新选择账户）
      try {
        await window.ethereum!.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        })
      } catch (permError: any) {
        if (permError.code === 4001) {
          ElMessage.warning('用户取消了切换账户')
          return false
        }
        throw permError
      }

      // 获取用户选择的账户
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts'
      }) as string[]

      if (accounts.length === 0) {
        throw new Error('未找到账户')
      }

      address.value = accounts[0]
      isConnected.value = true

      // 获取链 ID
      await updateChainId()

      // 获取余额
      await updateBalance()

      // 设置事件监听
      setupEventListeners()

      ElMessage.success('钱包重新连接成功')

      return true
    } catch (error: any) {
      console.error('重新连接钱包失败:', error)
      
      if (error.code === 4001) {
        ElMessage.warning('用户取消了连接请求')
      } else {
        ElMessage.error(error.message || '重新连接钱包失败')
      }
      
      return false
    }
  }

  /**
   * 更新链 ID
   */
  async function updateChainId() {
    try {
      const chainIdHex = await window.ethereum.request({
        method: 'eth_chainId'
      }) as string
      chainId.value = parseInt(chainIdHex, 16)
    } catch (error) {
      console.error('获取链 ID 失败:', error)
    }
  }

  /**
   * 更新余额
   */
  async function updateBalance() {
    if (!address.value || !provider.value) return

    try {
      const balanceWei = await provider.value.getBalance(address.value)
      balance.value = ethers.formatEther(balanceWei)
    } catch (error) {
      console.error('获取余额失败:', error)
    }
  }

  /**
   * 切换网络
   */
  async function switchNetwork(targetChainId: number): Promise<boolean> {
    if (!checkMetaMaskInstalled()) return false

    const networkConfig = getNetworkConfig(targetChainId)
    if (!networkConfig) {
      ElMessage.error('不支持的网络')
      return false
    }

    try {
      // 尝试切换网络
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      })

      ElMessage.success(`已切换到 ${networkConfig.chainName}`)
      return true
    } catch (error: any) {
      // 如果网络不存在，尝试添加
      if (error.code === 4902) {
        return await addNetwork(targetChainId)
      }

      console.error('切换网络失败:', error)
      ElMessage.error(error.message || '切换网络失败')
      return false
    }
  }

  /**
   * 添加网络
   */
  async function addNetwork(targetChainId: number): Promise<boolean> {
    const networkConfig = getNetworkConfig(targetChainId)
    if (!networkConfig) return false

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: networkConfig.chainName,
            nativeCurrency: networkConfig.nativeCurrency,
            rpcUrls: [networkConfig.rpcUrl],
            blockExplorerUrls: networkConfig.blockExplorer
              ? [networkConfig.blockExplorer]
              : []
          }
        ]
      })

      ElMessage.success(`已添加 ${networkConfig.chainName}`)
      return true
    } catch (error: any) {
      console.error('添加网络失败:', error)
      ElMessage.error(error.message || '添加网络失败')
      return false
    }
  }

  /**
   * 设置事件监听
   */
  function setupEventListeners() {
    if (!window.ethereum) return

    // 监听账户变化
    window.ethereum.on('accountsChanged', handleAccountsChanged)

    // 监听链变化
    window.ethereum.on('chainChanged', handleChainChanged)

    // 监听断开连接
    window.ethereum.on('disconnect', handleDisconnect)
  }

  /**
   * 移除事件监听
   */
  function removeEventListeners() {
    if (!window.ethereum) return

    window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
    window.ethereum.removeListener('chainChanged', handleChainChanged)
    window.ethereum.removeListener('disconnect', handleDisconnect)
  }

  /**
   * 处理账户变化
   */
  function handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      // 用户断开了所有账户
      disconnectWallet()
    } else if (accounts[0] !== address.value) {
      // 用户切换了账户
      address.value = accounts[0]
      updateBalance()
      ElMessage.info('账户已切换')
    }
  }

  /**
   * 处理链变化
   */
  function handleChainChanged(chainIdHex: string) {
    chainId.value = parseInt(chainIdHex, 16)
    updateBalance()

    const networkConfig = getNetworkConfig(chainId.value)
    if (networkConfig) {
      ElMessage.info(`已切换到 ${networkConfig.chainName}`)
    } else {
      ElMessage.warning('当前网络不受支持')
    }
  }

  /**
   * 处理断开连接
   */
  function handleDisconnect() {
    disconnectWallet()
  }

  /**
   * 初始化 - 检查是否已连接
   */
  async function initWallet() {
    if (!window.ethereum) return

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      }) as string[]

      if (accounts.length > 0) {
        address.value = accounts[0]
        isConnected.value = true
        await updateChainId()
        await updateBalance()
        setupEventListeners()
        
        // 初始化合约服务
        const providerInstance = new ethers.BrowserProvider(window.ethereum)
        await contractService.init(providerInstance)
        console.log('✅ 合约服务已初始化')
      }
    } catch (error) {
      console.error('初始化钱包失败:', error)
    }
  }

  return {
    // State
    address,
    balance,
    chainId,
    isConnected,

    // Computed
    isCorrectNetwork,
    shortAddress,
    walletState,
    provider,

    // Actions
    connectWallet,
    reconnectWallet,
    disconnectWallet,
    switchNetwork,
    updateBalance,
    initWallet
  }
})
