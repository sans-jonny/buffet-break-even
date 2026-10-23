<template>
  <slot v-if="applicationStore.view.status === 'ready'"/>
  <view v-else class="initialization-state">
    <text>{{ applicationStore.view.status === 'error' ? applicationStore.view.message : '正在读取用餐数据…' }}</text>
    <button v-if="applicationStore.view.status === 'error'" size="mini" @tap="retry">重新读取</button>
  </view>
</template>

<script setup lang="ts">
import {ApplicationBootstrap} from '@/ui/composition/ApplicationBootstrap'
import {useRequired} from '@/ui/composables/useRequired'
import {useApplicationStore} from '@/ui/stores/useApplicationStore'

const applicationStore = useApplicationStore()
const bootstrap = useRequired<ApplicationBootstrap>(ApplicationBootstrap.Token)
const retry = () => bootstrap.initialize()
</script>

<style scoped>
.initialization-state {
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28rpx;
  text-align: center;
  color: #6c6159;
}
</style>
