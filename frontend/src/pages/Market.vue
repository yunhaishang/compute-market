<template>
  <div class="market-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><ShoppingCart /></el-icon>
        算力市场
      </h1>
      <p class="page-description">选择合适的算力服务，一键部署您的计算任务到 iExec 网络</p>
    </div>

    <!-- 钱包连接提示 -->
    <el-alert
      v-if="!walletStore.isConnected"
      title="请先连接钱包"
      type="warning"
      description="购买算力服务需要连接您的 MetaMask 钱包"
      show-icon
      :closable="false"
      class="connect-alert"
    />

    <!-- 网络不匹配提示 -->
    <el-alert
      v-else-if="!walletStore.isCorrectNetwork"
      title="网络不匹配"
      type="error"
      :description="`请切换到正确的网络: ${targetNetworkName}`"
      show-icon
      :closable="false"
      class="connect-alert"
    >
      <template #default>
        <el-button type="primary" size="small" @click="handleSwitchNetwork">
          切换网络
        </el-button>
      </template>
    </el-alert>

    <!-- 服务列表 -->
    <div class="services-grid">
      <ComputeCard
        v-for="service in services"
        :key="service.serviceId"
        :service="service"
        :purchasing="purchasingServiceId === service.serviceId"
        @buy="handleBuyService"
      />
    </div>

    <!-- 购买对话框 -->
    <el-dialog v-model="dialogVisible" title="购买算力服务" width="500px" :close-on-click-modal="false">
      <div v-if="selectedService" class="dialog-content">
        <!-- 服务信息 -->
        <div class="service-summary">
          <div class="summary-item">
            <span class="label">服务名称:</span>
            <span class="value">{{ selectedService.name }}</span>
          </div>
          <div class="summary-item">
            <span class="label">服务价格:</span>
            <span class="value highlight">{{ selectedService.price }} ETH</span>
          </div>
          <div class="summary-item">
            <span class="label">当前余额:</span>
            <span class="value">{{ walletStore.balance.slice(0, 8) }} ETH</span>
          </div>
        </div>

        <!-- 文件上传 -->
        <div class="file-upload-section">
          <el-divider content-position="left">数据上传</el-divider>
          <el-upload
            ref="dataUploadRef"
            :auto-upload="false"
            :on-change="handleDataFileChange"
            :on-remove="handleDataFileRemove"
            :file-list="dataFileList"
            drag
            multiple
            :limit="5"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽数据文件到此处或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持上传训练数据文件，最多5个文件
              </div>
            </template>
          </el-upload>
        </div>

        <!-- 模型上传 -->
        <div class="file-upload-section">
          <el-divider content-position="left">模型上传</el-divider>
          <el-upload
            ref="modelUploadRef"
            :auto-upload="false"
            :on-change="handleModelFileChange"
            :on-remove="handleModelFileRemove"
            :file-list="modelFileList"
            drag
            multiple
            :limit="3"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽模型文件到此处或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持上传模型文件，最多3个文件
              </div>
            </template>
          </el-upload>
        </div>

        <!-- 交易状态 -->
        <div v-if="txStatus" class="tx-status">
          <el-steps :active="txStep" finish-status="success" align-center>
            <el-step title="发起交易" />
            <el-step title="确认中" />
            <el-step title="完成" />
          </el-steps>

          <div class="tx-info">
            <el-icon v-if="txStep < 2" class="loading-icon"><Loading /></el-icon>
            <el-icon v-else class="success-icon"><CircleCheck /></el-icon>
            <p class="tx-message">{{ txMessage }}</p>
            <p v-if="txHash" class="tx-hash">
              交易哈希: <a :href="getExplorerUrl(txHash)" target="_blank">{{ shortTxHash }}</a>
            </p>
          </div>
        </div>

        <!-- 错误信息 -->
        <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false" :disabled="txStep > 0 && txStep < 2">
            {{ txStep === 2 ? '关闭' : '取消' }}
          </el-button>
          <el-button
            v-if="txStep === 0"
            type="primary"
            @click="confirmPurchase"
            :loading="purchasing"
            :disabled="!canPurchase"
          >
            确认购买
          </el-button>
          <el-button v-if="txStep === 2" type="success" @click="goToTasks">
            查看任务
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/store/wallet'
import { contractService, PRESET_SERVICES } from '@/services/contract'
import { getNetworkConfig, CHAIN_ID } from '@/config/env'
import { ElMessage, ElNotification } from 'element-plus'
import { ShoppingCart, Loading, CircleCheck, UploadFilled } from '@element-plus/icons-vue'
import ComputeCard from '@/components/ComputeCard.vue'
import type { Service } from '@/types'
import type { UploadUserFile, UploadFile } from 'element-plus'

const router = useRouter()
const walletStore = useWalletStore()

const services = ref<Service[]>(PRESET_SERVICES)
const purchasingServiceId = ref<number | null>(null)
const selectedService = ref<Service | null>(null)
const dialogVisible = ref(false)
const purchasing = ref(false)

// 文件上传
const dataUploadRef = ref()
const dataFileList = ref<UploadUserFile[]>([])
const modelUploadRef = ref()
const modelFileList = ref<UploadUserFile[]>([])

// 交易状态
const txStatus = ref(false)
const txStep = ref(0) // 0: 初始, 1: 确认中, 2: 完成
const txHash = ref<string>('')
const txMessage = ref('')
const errorMessage = ref('')

// 目标网络名称
const targetNetworkName = computed(() => {
  const config = getNetworkConfig(CHAIN_ID)
  return config ? config.chainName : `Chain ${CHAIN_ID}`
})

// 简短的交易哈希
const shortTxHash = computed(() => {
  if (!txHash.value) return ''
  return `${txHash.value.slice(0, 10)}...${txHash.value.slice(-8)}`
})

// 是否可以购买
const canPurchase = computed(() => {
  if (!selectedService.value) return false
  const balance = parseFloat(walletStore.balance)
  const price = parseFloat(selectedService.value.price)
  return balance >= price
})

// 文件上传处理
function handleDataFileChange(file: UploadFile) {
  console.log('数据文件已选择:', file.name)
  // 暂存文件但不实际使用
}

function handleDataFileRemove(file: UploadFile) {
  console.log('数据文件已移除:', file.name)
}

function handleModelFileChange(file: UploadFile) {
  console.log('模型文件已选择:', file.name)
  // 暂存文件但不实际使用
}

function handleModelFileRemove(file: UploadFile) {
  console.log('模型文件已移除:', file.name)
}

// 获取区块链浏览器 URL
function getExplorerUrl(hash: string): string {
  const config = getNetworkConfig(walletStore.chainId || CHAIN_ID)
  if (config && config.blockExplorer) {
    return `${config.blockExplorer}/tx/${hash}`
  }
  return '#'
}

// 切换网络
async function handleSwitchNetwork() {
  await walletStore.switchNetwork(CHAIN_ID)
}

// 处理购买服务
async function handleBuyService(serviceId: number) {
  if (!walletStore.isConnected) {
    ElMessage.warning('请先连接钱包')
    return
  }

  if (!walletStore.isCorrectNetwork) {
    ElMessage.warning('请先切换到正确的网络')
    return
  }

  // 查找服务
  const service = services.value.find(s => s.serviceId === serviceId)
  if (!service) return

  // 打开确认对话框
  selectedService.value = service
  dialogVisible.value = true
  resetTxStatus()
}

// 确认购买
async function confirmPurchase() {
  if (!selectedService.value || !walletStore.provider) return

  purchasing.value = true
  txStatus.value = true
  txStep.value = 0
  txMessage.value = '等待用户确认交易...'
  errorMessage.value = ''

  try {
    // 初始化合约服务（如果还未初始化）
    if (!contractService.isInitialized) {
      await contractService.init(walletStore.provider)
    }

    // 发起购买交易
    txStep.value = 0
    txMessage.value = '正在发送交易...'

    const hash = await contractService.buyCompute(
      selectedService.value.serviceId,
      selectedService.value.price
    )

    txHash.value = hash
    txStep.value = 1
    txMessage.value = '交易已提交，等待确认...'

    ElNotification({
      title: '交易已提交',
      message: '请等待区块链确认',
      type: 'info',
      duration: 3000
    })

    // 等待交易确认
    const receipt = await contractService.waitForTransaction(hash)

    txStep.value = 2
    txMessage.value = '交易确认成功！'

    ElNotification({
      title: '购买成功',
      message: `已成功购买 ${selectedService.value.name}`,
      type: 'success',
      duration: 5000
    })

    // 更新余额
    await walletStore.updateBalance()

    // 3秒后自动关闭对话框
    setTimeout(() => {
      dialogVisible.value = false
      goToTasks()
    }, 3000)
  } catch (error: any) {
    console.error('购买失败:', error)
    errorMessage.value = error.message || '购买失败'
    txStep.value = 0
    txStatus.value = false

    ElNotification({
      title: '购买失败',
      message: error.message || '交易被拒绝或执行失败',
      type: 'error',
      duration: 5000
    })
  } finally {
    purchasing.value = false
  }
}

// 重置交易状态
function resetTxStatus() {
  txStatus.value = false
  txStep.value = 0
  txHash.value = ''
  txMessage.value = ''
  errorMessage.value = ''
  dataFileList.value = []  // 清空数据文件列表
  modelFileList.value = []  // 清空模型文件列表
}

// 跳转到任务列表
function goToTasks() {
  router.push('/tasks')
}

onMounted(() => {
  // 页面加载时可以从合约读取实际的服务信息
  // 暂时使用预设服务
})
</script>

<style scoped lang="scss">
.market-page {
  max-width: 1400px;
  margin: 0 auto;

  .page-header {
    margin-bottom: 32px;
    text-align: center;

    .page-title {
      margin: 0 0 12px;
      font-size: 32px;
      font-weight: 700;
      color: #303133;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;

      .el-icon {
        font-size: 36px;
        color: #409eff;
      }
    }

    .page-description {
      margin: 0;
      font-size: 16px;
      color: #606266;
    }
  }

  .connect-alert {
    margin-bottom: 24px;
  }

  .services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
    margin-bottom: 48px;
  }

  .dialog-content {
    .service-summary {
      background: #f5f7fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;

      .summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        font-size: 15px;

        &:not(:last-child) {
          border-bottom: 1px dashed #dcdfe6;
        }

        .label {
          color: #606266;
        }

        .value {
          font-weight: 600;
          color: #303133;

          &.highlight {
            color: #409eff;
            font-size: 18px;
          }
        }
      }
    }

    .tx-status {
      margin-bottom: 24px;

      .tx-info {
        margin-top: 24px;
        text-align: center;

        .loading-icon {
          font-size: 48px;
          color: #409eff;
          animation: rotate 1.5s linear infinite;
        }

        .success-icon {
          font-size: 48px;
          color: #67c23a;
        }

        .tx-message {
          margin: 16px 0 8px;
          font-size: 16px;
          color: #303133;
        }

        .tx-hash {
          margin: 8px 0;
          font-size: 14px;
          color: #909399;
          word-break: break-all;

          a {
            color: #409eff;
            text-decoration: none;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
