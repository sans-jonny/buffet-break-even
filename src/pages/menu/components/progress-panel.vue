<template>
  <view class="progress-panel">
    <view class="progress-row">
      <view><text class="current-money">¥{{ formattedValue }}</text><text class="target-money"> / ¥{{ target }}</text></view>
      <text class="percent">{{ percent }}%</text>
    </view>
    <view class="progress-track">
      <view class="progress-fill" :style="{ width: `${fillPercent}%` }" />
      <view class="break-even-marker" />
    </view>
    <text v-if="activeTip" class="progress-tip" :style="{ color: activeTip.color }">{{ activeTip.text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatPrice } from '@/utils/format'

interface ProgressTip {
  progress: number
  text: string
  color: string
}

const props = withDefaults(defineProps<{
  value: number
  target: number
  tips?: ProgressTip[]
}>(), {
  tips: () => []
})

const formattedValue = computed(() => formatPrice(props.value))
const percent = computed(() => props.target ? Math.round((props.value / props.target) * 100) : 0)
const fillPercent = computed(() => Math.min(Math.max(percent.value, 0) * 0.7, 100))
const activeTip = computed(() => {
  const sortedTips = [...props.tips].sort((a, b) => a.progress - b.progress)
  let matchedTip: ProgressTip | undefined
  for (const tip of sortedTips) {
    if (percent.value < tip.progress) break
    matchedTip = tip
  }
  return matchedTip
})
</script>

<style scoped>
.progress-panel { padding: 18rpx 24rpx 26rpx; }
.progress-row { display: flex; justify-content: space-between; align-items: flex-end; }
.current-money { font-size: 58rpx; color: #ff6432; font-weight: 900; }
.target-money { font-size: 32rpx; color: #aaa; font-weight: 700; }
.percent { font-size: 36rpx; font-weight: 900; }
.progress-track { margin-top: 24rpx; height: 22rpx; border-radius: 20rpx; background: #ffe1b6; position: relative; }
.progress-fill { height: 100%; border-radius: 20rpx; min-width: 18rpx; background: #ff6331; transition: width .3s ease; }
.break-even-marker { position: absolute; top: 50%; left: 70%; width: 30rpx; height: 30rpx; border-radius: 50%; border: 5rpx solid #fff; background: #ff6331; box-shadow: 0 0 0 5rpx #ffddcf; transform: translate(-50%,-50%); }
.progress-tip { display: block; margin: 24rpx 22rpx 0; font-size: 26rpx; font-weight: 800; }
</style>
