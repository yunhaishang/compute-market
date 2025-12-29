<template>
  <el-tag :type="tagType" :effect="effect" :size="size">
    <el-icon class="status-icon">
      <component :is="iconComponent" />
    </el-icon>
    {{ statusText }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import {
  Clock,
  Loading,
  CircleCheck,
  CircleClose,
  RefreshLeft
} from '@element-plus/icons-vue'
import type { TaskStatus } from '@/types'

interface Props {
  status: TaskStatus
  size?: 'large' | 'default' | 'small'
  effect?: 'dark' | 'light' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  effect: 'light'
})

// 状态对应的标签类型
const tagType = computed(() => {
  const typeMap: Record<TaskStatus, any> = {
    Created: 'info',
    Running: 'warning',
    Completed: 'success',
    Failed: 'danger',
    Refunded: ''
  }
  return typeMap[props.status]
})

// 状态对应的图标
const iconComponent = computed<Component>(() => {
  const iconMap: Record<TaskStatus, Component> = {
    Created: Clock,
    Running: Loading,
    Completed: CircleCheck,
    Failed: CircleClose,
    Refunded: RefreshLeft
  }
  return iconMap[props.status]
})

// 状态对应的文本
const statusText = computed(() => {
  const textMap: Record<TaskStatus, string> = {
    Created: '已创建',
    Running: '运行中',
    Completed: '已完成',
    Failed: '失败',
    Refunded: '已退款'
  }
  return textMap[props.status]
})
</script>

<style scoped lang="scss">
.status-icon {
  margin-right: 4px;
}

:deep(.el-tag) {
  .el-icon.is-loading {
    animation: rotating 2s linear infinite;
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
