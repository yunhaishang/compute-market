<template>
  <div id="app">
    <!-- 顶部导航栏 -->
    <el-header class="app-header">
      <div class="header-content">
        <!-- Logo 和标题 -->
        <div class="logo-section">
          <div class="logo">🔷</div>
          <h1 class="title">AI训练算力市场</h1>
        </div>

        <!-- 导航菜单 -->
        <el-menu
          :default-active="activeMenu"
          class="header-menu"
          mode="horizontal"
          :ellipsis="false"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            首页
          </el-menu-item>
          <el-menu-item index="/market">
            <el-icon><ShoppingCart /></el-icon>
            算力市场
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><List /></el-icon>
            我的任务
          </el-menu-item>
        </el-menu>

        <!-- 钱包连接按钮 -->
        <div class="header-actions">
          <WalletConnect />
        </div>
      </div>
    </el-header>

    <!-- 主内容区 -->
    <el-main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>

    <!-- 页脚 -->
    <el-footer class="app-footer">
      <p>© 2025 AI训练算力市场 - 区块链导论课程项目</p>
      <p class="footer-links">
        <a href="https://github.com" target="_blank">GitHub</a>
        <span class="divider">|</span>
        <a href="https://iex.ec" target="_blank">iExec</a>
        <span class="divider">|</span>
        <a href="https://docs.iex.ec" target="_blank">文档</a>
      </p>
    </el-footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { HomeFilled, ShoppingCart, List } from '@element-plus/icons-vue'
import WalletConnect from '@/components/WalletConnect.vue'

const router = useRouter()
const route = useRoute()

// 当前激活的菜单项
const activeMenu = computed(() => route.path)

// 处理菜单选择
function handleMenuSelect(index: string) {
  router.push(index)
}
</script>

<style scoped lang="scss">
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .header-content {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1400px;
    margin: 0 auto;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;

    .logo {
      font-size: 36px;
      line-height: 1;
    }

    .title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      white-space: nowrap;
    }
  }

  .header-menu {
    flex: 1;
    margin: 0 40px;
    border-bottom: none;
  }

  .header-actions {
    display: flex;
    align-items: center;
  }
}

.app-main {
  flex: 1;
  background: #f5f7fa;
  padding: 24px;

  :deep(.el-main) {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }
}

.app-footer {
  height: 80px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  p {
    margin: 0;
    color: #909399;
    font-size: 14px;
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 4px;

    a {
      color: #409eff;
      text-decoration: none;
      transition: color 0.3s;

      &:hover {
        color: #66b1ff;
      }
    }

    .divider {
      color: #dcdfe6;
      margin: 0 8px;
    }
  }
}

// 路由切换动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

