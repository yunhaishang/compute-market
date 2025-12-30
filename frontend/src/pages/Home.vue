<template>
  <div class="home-page">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="gradient-text">AI训练算力市场</span>
        </h1>
        <p class="hero-subtitle">
          基于 iExec 网络的分布式计算平台
        </p>
        <p class="hero-description">
          安全、透明、高效的算力交易与任务调度系统
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="goToMarket">
            <el-icon><ShoppingCart /></el-icon>
            开始购买算力
          </el-button>
          <el-button size="large" @click="goToTasks">
            <el-icon><List /></el-icon>
            查看我的任务
          </el-button>
        </div>
      </div>

      <div class="hero-image">
        <div class="floating-card">
          <el-icon class="card-icon"><Connection /></el-icon>
          <div class="card-content">
            <div class="card-title">分布式计算</div>
            <div class="card-value">全球节点</div>
          </div>
        </div>
        <div class="floating-card delay-1">
          <el-icon class="card-icon"><Lock /></el-icon>
          <div class="card-content">
            <div class="card-title">智能合约</div>
            <div class="card-value">安全托管</div>
          </div>
        </div>
        <div class="floating-card delay-2">
          <el-icon class="card-icon"><TrendCharts /></el-icon>
          <div class="card-content">
            <div class="card-title">实时监控</div>
            <div class="card-value">任务追踪</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="features-section">
      <h2 class="section-title">核心特性</h2>
      <div class="features-grid">
        <el-card class="feature-card" shadow="hover">
          <div class="feature-icon blockchain">
            <el-icon><Link /></el-icon>
          </div>
          <h3 class="feature-title">区块链保障</h3>
          <p class="feature-description">
            基于以太坊智能合约，资金托管安全可靠，交易记录完全透明可追溯
          </p>
        </el-card>

        <el-card class="feature-card" shadow="hover">
          <div class="feature-icon computing">
            <el-icon><Cpu /></el-icon>
          </div>
          <h3 class="feature-title">iExec 算力</h3>
          <p class="feature-description">
            接入 iExec 去中心化算力网络，享受全球分布式计算资源，高效完成任务
          </p>
        </el-card>

        <el-card class="feature-card" shadow="hover">
          <div class="feature-icon monitoring">
            <el-icon><Monitor /></el-icon>
          </div>
          <h3 class="feature-title">实时监控</h3>
          <p class="feature-description">
            任务状态实时同步，自动轮询更新，支持历史记录查询和结果下载
          </p>
        </el-card>

        <el-card class="feature-card" shadow="hover">
          <div class="feature-icon wallet">
            <el-icon><Wallet /></el-icon>
          </div>
          <h3 class="feature-title">MetaMask 集成</h3>
          <p class="feature-description">
            一键连接 MetaMask 钱包，支持多网络切换，安全便捷的 Web3 交互体验
          </p>
        </el-card>
      </div>
    </div>

    <!-- Workflow Section -->
    <div class="workflow-section">
      <h2 class="section-title">工作流程</h2>
      <el-steps :active="4" align-center class="workflow-steps">
        <el-step>
          <template #icon>
            <div class="step-icon"><el-icon><Wallet /></el-icon></div>
          </template>
          <template #title>
            <div class="step-title">连接钱包</div>
          </template>
          <template #description>
            <div class="step-desc">使用 MetaMask 连接</div>
          </template>
        </el-step>

        <el-step>
          <template #icon>
            <div class="step-icon"><el-icon><ShoppingCart /></el-icon></div>
          </template>
          <template #title>
            <div class="step-title">选择服务</div>
          </template>
          <template #description>
            <div class="step-desc">选择合适的算力服务</div>
          </template>
        </el-step>

        <el-step>
          <template #icon>
            <div class="step-icon"><el-icon><Coin /></el-icon></div>
          </template>
          <template #title>
            <div class="step-title">支付购买</div>
          </template>
          <template #description>
            <div class="step-desc">确认交易并支付 ETH</div>
          </template>
        </el-step>

        <el-step>
          <template #icon>
            <div class="step-icon"><el-icon><Loading /></el-icon></div>
          </template>
          <template #title>
            <div class="step-title">执行计算</div>
          </template>
          <template #description>
            <div class="step-desc">iExec 网络执行任务</div>
          </template>
        </el-step>

        <el-step>
          <template #icon>
            <div class="step-icon"><el-icon><CircleCheck /></el-icon></div>
          </template>
          <template #title>
            <div class="step-title">获取结果</div>
          </template>
          <template #description>
            <div class="step-desc">查看和下载 IPFS 结果</div>
          </template>
        </el-step>
      </el-steps>
    </div>

    <!-- Stats Section -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">3</div>
          <div class="stat-label">算力服务</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ taskStore.taskCount.total }}</div>
          <div class="stat-label">总任务数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ taskStore.taskCount.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">99.9%</div>
          <div class="stat-label">系统可用性</div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="cta-section">
      <el-card class="cta-card" shadow="never">
        <h2 class="cta-title">准备开始了吗？</h2>
        <p class="cta-description">
          立即连接钱包，体验去中心化算力交易的魅力
        </p>
        <div class="cta-actions">
          <el-button type="primary" size="large" @click="goToMarket">
            立即开始
            <el-icon class="ml-2"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/store/task'
import {
  ShoppingCart,
  List,
  Connection,
  Lock,
  TrendCharts,
  Link,
  Cpu,
  Monitor,
  Wallet,
  Coin,
  Loading,
  CircleCheck,
  ArrowRight
} from '@element-plus/icons-vue'

const router = useRouter()
const taskStore = useTaskStore()

function goToMarket() {
  router.push('/market')
}

function goToTasks() {
  router.push('/tasks')
}

onMounted(() => {
  // 加载统计数据
  taskStore.fetchAllTasks(false).catch(() => {})
})
</script>

<style scoped lang="scss">
.home-page {
  max-width: 1400px;
  margin: 0 auto;

  .hero-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: center;
    padding: 60px 0;
    margin-bottom: 80px;

    .hero-content {
      .hero-title {
        margin: 0 0 16px;
        font-size: 48px;
        font-weight: 800;
        line-height: 1.2;

        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      }

      .hero-subtitle {
        margin: 0 0 12px;
        font-size: 24px;
        font-weight: 600;
        color: #606266;
      }

      .hero-description {
        margin: 0 0 32px;
        font-size: 16px;
        color: #909399;
        line-height: 1.6;
      }

      .hero-actions {
        display: flex;
        gap: 16px;
      }
    }

    .hero-image {
      position: relative;
      height: 400px;

      .floating-card {
        position: absolute;
        background: #fff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 16px;
        animation: float 3s ease-in-out infinite;

        &.delay-1 {
          animation-delay: 1s;
        }

        &.delay-2 {
          animation-delay: 2s;
        }

        &:nth-child(1) {
          top: 20%;
          left: 10%;
        }

        &:nth-child(2) {
          top: 50%;
          right: 10%;
        }

        &:nth-child(3) {
          bottom: 20%;
          left: 30%;
        }

        .card-icon {
          font-size: 32px;
          color: #409eff;
        }

        .card-content {
          .card-title {
            font-size: 12px;
            color: #909399;
            margin-bottom: 4px;
          }

          .card-value {
            font-size: 16px;
            font-weight: 600;
            color: #303133;
          }
        }
      }
    }
  }

  .section-title {
    text-align: center;
    font-size: 36px;
    font-weight: 700;
    color: #303133;
    margin: 0 0 48px;
  }

  .features-section {
    padding: 60px 0;
    background: #f5f7fa;
    margin: 0 -24px 80px;
    padding-left: 24px;
    padding-right: 24px;

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;

      .feature-card {
        text-align: center;
        padding: 24px;
        transition: transform 0.3s;

        &:hover {
          transform: translateY(-8px);
        }

        .feature-icon {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          color: #fff;
          margin: 0 auto 24px;

          &.blockchain {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          &.computing {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }

          &.monitoring {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }

          &.wallet {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
        }

        .feature-title {
          margin: 0 0 16px;
          font-size: 20px;
          font-weight: 600;
          color: #303133;
        }

        .feature-description {
          margin: 0;
          font-size: 14px;
          color: #606266;
          line-height: 1.6;
        }
      }
    }
  }

  .workflow-section {
    padding: 60px 0 80px;

    .workflow-steps {
      max-width: 1000px;
      margin: 0 auto;

      :deep(.el-step__icon) {
        border: none;
        background: transparent;
      }

      .step-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 28px;
      }

      .step-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin-top: 12px;
      }

      .step-desc {
        font-size: 14px;
        color: #909399;
        margin-top: 4px;
      }
    }
  }

  .stats-section {
    padding: 60px 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    margin: 0 -24px 80px;
    color: #fff;

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 48px;
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 24px;

      .stat-item {
        text-align: center;

        .stat-value {
          font-size: 48px;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 12px;
        }

        .stat-label {
          font-size: 16px;
          opacity: 0.9;
        }
      }
    }
  }

  .cta-section {
    padding: 0 0 60px;

    .cta-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border: none;
      text-align: center;
      padding: 48px;

      .cta-title {
        margin: 0 0 16px;
        font-size: 32px;
        font-weight: 700;
        color: #303133;
      }

      .cta-description {
        margin: 0 0 32px;
        font-size: 16px;
        color: #606266;
      }

      .cta-actions {
        display: flex;
        justify-content: center;

        .ml-2 {
          margin-left: 8px;
        }
      }
    }
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

@media (max-width: 768px) {
  .home-page {
    .hero-section {
      grid-template-columns: 1fr;

      .hero-image {
        display: none;
      }
    }
  }
}
</style>
