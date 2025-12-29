<template>
  <div class="wallet-connect">
    <!-- 未连接状态 -->
    <el-button v-if="!walletStore.isConnected" type="primary" @click="handleConnect" :loading="connecting">
      <el-icon class="mr-2"><Wallet /></el-icon>
      连接钱包
    </el-button>

    <!-- 已连接状态 -->
    <el-dropdown v-else trigger="click" @command="handleCommand">
      <el-button type="success">
        <el-icon class="mr-2"><User /></el-icon>
        {{ walletStore.shortAddress }}
        <el-icon class="ml-2"><ArrowDown /></el-icon>
      </el-button>

      <template #dropdown>
        <el-dropdown-menu>
          <!-- 账户信息 -->
          <el-dropdown-item disabled>
            <div class="wallet-info">
              <div class="info-row">
                <span class="label">地址:</span>
                <span class="value">{{ walletStore.shortAddress }}</span>
              </div>
              <div class="info-row">
                <span class="label">余额:</span>
                <span class="value">{{ formatBalance }} ETH</span>
              </div>
              <div class="info-row">
                <span class="label">网络:</span>
                <el-tag :type="walletStore.isCorrectNetwork ? 'success' : 'warning'" size="small">
                  {{ networkName }}
                </el-tag>
              </div>
            </div>
          </el-dropdown-item>

          <el-dropdown-item divided command="copy">
            <el-icon><CopyDocument /></el-icon>
            复制地址
          </el-dropdown-item>

          <el-dropdown-item command="refresh">
            <el-icon><Refresh /></el-icon>
            刷新余额
          </el-dropdown-item>

          <el-dropdown-item v-if="!walletStore.isCorrectNetwork" command="switch">
            <el-icon><Connection /></el-icon>
            切换网络
          </el-dropdown-item>

          <el-dropdown-item divided command="changeAccount">
            <el-icon><Wallet /></el-icon>
            切换账户
          </el-dropdown-item>

          <el-dropdown-item command="disconnect">
            <el-icon><SwitchButton /></el-icon>
            断开连接
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 网络警告 -->
    <el-tooltip
      v-if="walletStore.isConnected && !walletStore.isCorrectNetwork"
      content="当前网络不匹配，请切换网络"
      placement="bottom"
    >
      <el-icon class="network-warning" color="#f56c6c"><Warning /></el-icon>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWalletStore } from '@/store/wallet'
import { getNetworkConfig, CHAIN_ID } from '@/config/env'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Wallet,
  User,
  ArrowDown,
  CopyDocument,
  Refresh,
  Connection,
  SwitchButton,
  Warning
} from '@element-plus/icons-vue'

const walletStore = useWalletStore()
const connecting = ref(false)

// 格式化余额（保留 4 位小数）
const formatBalance = computed(() => {
  const balance = parseFloat(walletStore.balance)
  return balance.toFixed(4)
})

// 获取当前网络名称
const networkName = computed(() => {
  if (!walletStore.chainId) return '未知'
  const config = getNetworkConfig(walletStore.chainId)
  return config ? config.chainName : `Chain ${walletStore.chainId}`
})

// 连接钱包
async function handleConnect() {
  connecting.value = true
  try {
    await walletStore.connectWallet()
  } finally {
    connecting.value = false
  }
}

// 处理下拉菜单命令
async function handleCommand(command: string) {
  switch (command) {
    case 'copy':
      await copyAddress()
      break
    case 'refresh':
      await walletStore.updateBalance()
      ElMessage.success('余额已刷新')
      break
    case 'switch':
      await walletStore.switchNetwork(CHAIN_ID)
      break
    case 'changeAccount':
      await handleChangeAccount()
      break
    case 'disconnect':
      handleDisconnect()
      break
  }
}

// 切换账户
async function handleChangeAccount() {
  try {
    connecting.value = true
    const success = await walletStore.reconnectWallet()
    if (success) {
      ElMessage.success('账户切换成功')
    }
  } catch (error: any) {
    console.error('切换账户失败:', error)
    ElMessage.error(error.message || '切换账户失败')
  } finally {
    connecting.value = false
  }
}

// 断开连接
function handleDisconnect() {
  ElMessageBox.confirm(
    '断开后，下次连接时可以重新选择账户。',
    '确认断开连接？',
    {
      confirmButtonText: '断开',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    walletStore.disconnectWallet()
  }).catch(() => {
    // 用户取消
  })
}

// 复制地址到剪贴板
async function copyAddress() {
  if (!walletStore.address) return

  try {
    await navigator.clipboard.writeText(walletStore.address)
    ElMessage.success('地址已复制到剪贴板')
  } catch (error) {
    // 兼容不支持 clipboard API 的浏览器
    const textarea = document.createElement('textarea')
    textarea.value = walletStore.address
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('地址已复制')
  }
}

// 初始化
onMounted(() => {
  walletStore.initWallet()
})
</script>

<style scoped lang="scss">
.wallet-connect {
  display: flex;
  align-items: center;
  gap: 8px;

  .mr-2 {
    margin-right: 8px;
  }

  .ml-2 {
    margin-left: 8px;
  }

  .network-warning {
    font-size: 20px;
    animation: blink 1s infinite;
  }
}

.wallet-info {
  padding: 8px 0;
  min-width: 240px;

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    font-size: 14px;

    .label {
      color: #909399;
      margin-right: 12px;
    }

    .value {
      font-weight: 500;
      color: #303133;
    }
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
