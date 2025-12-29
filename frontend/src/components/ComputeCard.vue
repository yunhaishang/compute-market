<template>
  <div class="compute-card">
    <el-card class="service-card" shadow="hover" :body-style="{ padding: '24px' }">
      <!-- 服务图标 -->
      <div class="service-icon">
        {{ service.icon }}
      </div>

      <!-- 服务信息 -->
      <div class="service-info">
        <h3 class="service-name">{{ service.name }}</h3>
        <p class="service-description">{{ service.description }}</p>
      </div>

      <!-- 价格信息 -->
      <div class="price-section">
        <div class="price">
          <span class="price-value">{{ service.price }}</span>
          <span class="price-unit">ETH</span>
        </div>
        <div class="price-usd">≈ ${{ estimatedUSD }}</div>
      </div>

      <!-- 服务状态 -->
      <div class="service-status">
        <el-tag :type="service.active ? 'success' : 'info'" size="small">
          {{ service.active ? '可用' : '不可用' }}
        </el-tag>
      </div>

      <!-- 购买按钮 -->
      <el-button
        type="primary"
        size="large"
        :disabled="!service.active || purchasing"
        :loading="purchasing"
        @click="handleBuy"
        class="buy-button"
      >
        <el-icon v-if="!purchasing"><ShoppingCart /></el-icon>
        {{ purchasing ? '处理中...' : '立即购买' }}
      </el-button>

      <!-- 服务详情（可展开） -->
      <el-collapse v-model="activeNames" class="service-details">
        <el-collapse-item title="服务详情" name="1">
          <div class="detail-item">
            <span class="label">服务 ID:</span>
            <span class="value">{{ service.serviceId }}</span>
          </div>
          <div class="detail-item">
            <span class="label">计算类型:</span>
            <span class="value">分布式计算</span>
          </div>
          <div class="detail-item">
            <span class="label">平均完成时间:</span>
            <span class="value">5-15 分钟</span>
          </div>
          <div class="detail-item">
            <span class="label">可靠性:</span>
            <el-rate v-model="reliability" disabled show-score text-color="#ff9900" />
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ShoppingCart } from '@element-plus/icons-vue'
import type { Service } from '@/types'

interface Props {
  service: Service
  purchasing?: boolean
}

interface Emits {
  (e: 'buy', serviceId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeNames = ref<string[]>([])
const reliability = ref(4.5)

// 预估 USD 价格（假设 ETH = $3000）
const estimatedUSD = computed(() => {
  const ethPrice = 3000
  const usd = parseFloat(props.service.price) * ethPrice
  return usd.toFixed(2)
})

// 处理购买
function handleBuy() {
  emit('buy', props.service.serviceId)
}
</script>

<style scoped lang="scss">
.compute-card {
  .service-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: transform 0.3s;

    &:hover {
      transform: translateY(-4px);
    }

    :deep(.el-card__body) {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  }

  .service-icon {
    font-size: 48px;
    text-align: center;
    margin-bottom: 16px;
  }

  .service-info {
    flex: 1;
    margin-bottom: 16px;

    .service-name {
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      text-align: center;
    }

    .service-description {
      margin: 0;
      font-size: 14px;
      color: #606266;
      line-height: 1.6;
      text-align: center;
      min-height: 48px;
    }
  }

  .price-section {
    text-align: center;
    margin-bottom: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    color: #fff;

    .price {
      .price-value {
        font-size: 32px;
        font-weight: 700;
      }

      .price-unit {
        font-size: 18px;
        margin-left: 8px;
        opacity: 0.9;
      }
    }

    .price-usd {
      margin-top: 4px;
      font-size: 14px;
      opacity: 0.8;
    }
  }

  .service-status {
    text-align: center;
    margin-bottom: 16px;
  }

  .buy-button {
    width: 100%;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .service-details {
    border: none;

    :deep(.el-collapse-item__header) {
      background: transparent;
      border: none;
      color: #409eff;
      font-size: 14px;
    }

    :deep(.el-collapse-item__wrap) {
      border: none;
      background: transparent;
    }

    :deep(.el-collapse-item__content) {
      padding: 12px 0;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 14px;

      .label {
        color: #909399;
      }

      .value {
        color: #303133;
        font-weight: 500;
      }
    }
  }
}
</style>
