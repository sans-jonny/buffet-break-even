<template>
  <view class="progress-panel">
    <view class="progress-row">
      <view>
        <text class="current-money">¥{{ formattedValue }}</text>
        <text :class="{editable: editable}" class="target-money" @tap="editable && $emit('edit-price')"> / ¥{{
            Math.round(target)
          }}{{ editable ? ' ✎' : '' }}
        </text>
      </view>
      <text class="percent">{{ Math.round(percent) }}%</text>
    </view>
    <view class="progress-track">
      <view :style="{ width: `${fillPercent}%` }" class="progress-fill"/>
      <view class="break-even-marker"/>
    </view>
    <slot name="before-tip"/>
    <text v-if="activeTip" :style="{ color: activeTip.color }" class="progress-tip">{{ activeTip.text }}</text>
  </view>
</template>

<script lang="ts" setup>
import {computed} from 'vue'

interface ProgressTip {
  progress: number
  text: string
  color: string
}

const props = withDefaults(defineProps<{
  value: number
  target: number
  percent: number
  tips?: ProgressTip[]
  editable?: boolean
}>(), {
  tips: () => []
})
defineEmits<{ (event: 'edit-price'): void }>()

const formattedValue = computed(() => Math.round(props.value))
const fillPercent = computed(() => Math.min(Math.max(props.percent, 0) * 0.7, 100))
const activeTip = computed(() => {
  let matchedTip: ProgressTip | undefined
  for (const tip of props.tips) {
    if (tip.progress <= props.percent && (!matchedTip || tip.progress >= matchedTip.progress)) matchedTip = tip
  }
  return matchedTip
})
</script>

<style scoped>
.target-money.editable {
  color: #a47857;
  cursor: pointer
}

.progress-panel {
  display: flex;
  flex-direction: column;
  gap: var(--menu-section-gap, 24rpx);
  padding: var(--menu-section-gap, 24rpx) var(--menu-gutter, 24rpx) 0;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.current-money {
  font-size: 80rpx;
  line-height: 1.15;
  color: #ff6432;
  font-weight: 900;
}

.target-money {
  font-size: 36rpx;
  color: #aaa;
  font-weight: 700;
}

.percent {
  font-size: 36rpx;
  font-weight: 900;
}

.progress-track {
  height: 22rpx;
  border-radius: 20rpx;
  background: #ffe1b6;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 20rpx;
  min-width: 18rpx;
  background: #ff6331;
  transition: width .3s ease;
}

.break-even-marker {
  position: absolute;
  top: 50%;
  left: 70%;
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  border: 5rpx solid #fff;
  background: #ff6331;
  box-shadow: 0 0 0 5rpx #ffddcf;
  transform: translate(-50%, -50%);
}

.progress-tip {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
}
</style>
