<template>
  <view v-if="error || loading" class="query-feedback" role="status">
    <text>{{ error ? '数据加载失败，请重试' : '正在加载…' }}</text>
    <button v-if="error" size="mini" @tap="$emit('refresh')">重试</button>
  </view>
</template>
<script setup lang="ts">
defineProps<{loading: boolean; error: unknown}>()
defineEmits<{refresh: []}>()
</script>
<style scoped>
.query-feedback { display: flex; align-items: center; justify-content: center; gap: 20rpx; padding: 16rpx; color: #946511; font-size: 24rpx; }
</style>
