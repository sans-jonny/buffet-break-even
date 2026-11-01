<template>
  <slot v-if="status === 'ready'"/>
  <view v-else class="initialization-state">
    <text>{{ status === 'error' ? message : '正在读取用餐数据…' }}</text>
    <button v-if="status === 'error'" :hover-stay-time="0" size="mini" @tap="$emit('retry')">重新读取</button>
  </view>
</template>
<script lang="ts">
export default {options: {virtualHost: true}}
</script>
<script lang="ts" setup>
withDefaults(defineProps<{ status?: 'ready' | 'loading' | 'error'; message?: string }>(), {
  status: 'ready',
  message: ''
})
defineEmits<{ (event: 'retry'): void }>()
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
