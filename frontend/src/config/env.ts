/**
 * 环境变量配置
 * 统一管理所有环境变量，提供类型安全的访问
 */

// 合约配置
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || ''
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID) || 31337

// 后端 API 配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

// 网络配置
export const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || ''
export const SEPOLIA_CHAIN_ID = Number(import.meta.env.VITE_SEPOLIA_CHAIN_ID) || 11155111

export const BELLECOUR_RPC_URL = import.meta.env.VITE_BELLECOUR_RPC_URL || 'https://bellecour.iex.ec'
export const BELLECOUR_CHAIN_ID = Number(import.meta.env.VITE_BELLECOUR_CHAIN_ID) || 134

export const LOCAL_RPC_URL = import.meta.env.VITE_LOCAL_RPC_URL || 'http://localhost:8545'
export const LOCAL_CHAIN_ID = Number(import.meta.env.VITE_LOCAL_CHAIN_ID) || 31337

// IPFS 配置
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/'

// 开发模式
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// 支持的网络配置
export const SUPPORTED_NETWORKS = {
  [LOCAL_CHAIN_ID]: {
    chainId: LOCAL_CHAIN_ID,
    chainName: 'Hardhat Local',
    rpcUrl: LOCAL_RPC_URL,
    blockExplorer: '',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  [SEPOLIA_CHAIN_ID]: {
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia Testnet',
    rpcUrl: SEPOLIA_RPC_URL,
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  [BELLECOUR_CHAIN_ID]: {
    chainId: BELLECOUR_CHAIN_ID,
    chainName: 'iExec Bellecour',
    rpcUrl: BELLECOUR_RPC_URL,
    blockExplorer: 'https://blockscout-bellecour.iex.ec',
    nativeCurrency: {
      name: 'xDAI',
      symbol: 'xDAI',
      decimals: 18
    }
  }
}

// 获取当前网络配置
export function getNetworkConfig(chainId: number) {
  return SUPPORTED_NETWORKS[chainId as keyof typeof SUPPORTED_NETWORKS] || null
}

// 检查是否为支持的网络
export function isSupportedNetwork(chainId: number): boolean {
  return chainId in SUPPORTED_NETWORKS
}
