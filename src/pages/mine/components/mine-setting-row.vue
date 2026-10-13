<template>
  <view class="setting-row" :class="rowClasses" @tap="$emit('click')">
    <view class="setting-icon" :class="`setting-icon--${iconTheme}`">{{ icon }}</view>
    <text class="setting-label">{{ label }}</text>
    <text v-if="badge !== undefined" class="setting-badge">{{ badge }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  icon: string
  label: string
  iconTheme?: 'orange' | 'green' | 'white' | 'peach' | 'yellow' | 'teal'
  badge?: number | string
  compact?: boolean
  divider?: boolean
}>(), {
  iconTheme: 'white',
  compact: false,
  divider: true
})

defineEmits<{ (event: 'click'): void }>()

const rowClasses = computed(() => ({
  'setting-row--compact': props.compact,
  'setting-row--no-divider': !props.divider
}))
</script>

<style scoped>
.setting-row { width: 100%; height: 126rpx; padding: 0 32rpx; border-bottom: 1rpx solid #eee; color: #302d2a; display: flex; align-items: center; gap: 22rpx; font-size: 31rpx; font-weight: 800; text-decoration: none; box-sizing: border-box; }
.setting-row--compact { height: 116rpx; }
.setting-row--no-divider { border-bottom: 0; }
.setting-icon { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; flex: 0 0 72rpx; align-items: center; justify-content: center; font-size: 39rpx; box-shadow: 0 10rpx 22rpx rgba(56,43,28,.08); }
.setting-icon--orange { background: #ff6331; }
.setting-icon--green { background: #6ecbb0; }
.setting-icon--white { background: #fff; }
.setting-icon--peach { background: #ffd3a1; }
.setting-icon--yellow { background: #ffd78f; }
.setting-icon--teal { background: #00ae78; }
.setting-label { display: block; flex: 1 1 auto; min-width: 0; }
.setting-badge { min-width: 56rpx; margin-left: auto; padding: 8rpx 18rpx; border-radius: 24rpx; color: white; background: #ff6331; flex: 0 0 auto; text-align: center; font-size: 22rpx; box-sizing: border-box; }
</style>
