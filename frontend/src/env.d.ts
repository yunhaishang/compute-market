/// <reference types="vite/client" />

// 环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_SEPOLIA_RPC_URL: string
  readonly VITE_SEPOLIA_CHAIN_ID: string
  readonly VITE_BELLECOUR_RPC_URL: string
  readonly VITE_BELLECOUR_CHAIN_ID: string
  readonly VITE_LOCAL_RPC_URL: string
  readonly VITE_LOCAL_CHAIN_ID: string
  readonly VITE_IPFS_GATEWAY: string
  readonly VITE_DEV_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// MetaMask / Ethereum Provider 类型声明
interface Window {
  ethereum?: {
    isMetaMask?: boolean
    request: (args: { method: string; params?: any[] }) => Promise<any>
    on: (event: string, callback: (...args: any[]) => void) => void
    removeListener: (event: string, callback: (...args: any[]) => void) => void
    removeAllListeners: (event: string) => void
  }
}
