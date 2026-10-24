<template>
  <view class="product-card">
    <view class="food-picture flex-center" :style="{ background: product.gradient }">
      <text class="food-emoji">{{ product.emoji }}</text>
    </view>
    <view class="food-info">
      <text class="food-name">{{ product.name }}</text>
      <view class="food-value">
        <text class="value-label">价值</text>
        <text class="food-price">¥{{ formatPrice(product.price) }}</text>
      </view>
    </view>
    <view v-if="!readonly" class="add-control">
      <view class="add-button flex-center" :class="'button-' + phase" :style="{'animation-duration': PRESS_ANIMATION_MS + 'ms'}" hover-class="none"
            @touchstart="press" @touchend="release" @touchcancel="release"
            @mousedown="press" @mouseup="release" @mouseleave="release"
            @animationend="animationEnd" @tap="$emit('add', product.id)">
        <text>+</text>
      </view>
      <view v-if="count" class="count-badge flex-center">{{ count }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type {ProductView} from '@/presentation/dining/ProductView'
import {formatPrice} from '@/utils/format'
import {PRESS_ANIMATION_MS, usePressFeedback} from '@/ui/composables/usePressFeedback'

const {phase, press, release, animationEnd} = usePressFeedback()

defineProps<{ product: ProductView; count?: number; readonly?: boolean }>()
defineEmits<{ (event: 'add', id: string): void }>()
</script>

<style scoped>
.product-card {
  height: 186rpx;
  border-radius: 30rpx;
  background: white;
  margin-bottom: 18rpx;
  padding: 22rpx;
  display: flex;
  align-items: center;
  position: relative;
  box-shadow: 0 14rpx 32rpx rgba(179, 112, 54, .07);
  box-sizing: border-box;
}

.food-picture {
  width: 142rpx;
  height: 142rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
  overflow: hidden;
}

.food-emoji {
  font-size: 76rpx;
}

.food-info {
  flex: 1;
  min-width: 0;
  padding-left: 24rpx;
  padding-right: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.food-name {
  font-size: 32rpx;
  font-weight: 900;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.value-label {
  color: #aaa6a2;
  font-size: 24rpx;
}

.food-value {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  white-space: nowrap;
}

.food-price {
  color: #ff6331;
  font-size: 36rpx;
  font-weight: 900;
}

.add-control {
  position: relative;
  width: 82rpx;
  height: 82rpx;
  flex-shrink: 0;
}

.add-button {
  width: 82rpx;
  height: 82rpx;
  border-radius: 50%;
  background: #ff6331;
  color: white;
  font-size: 52rpx;
  box-shadow: 0 12rpx 22rpx rgba(255, 98, 48, .23);
  line-height: 1;
}

.button-pressing {
  animation-name: press-in;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

.button-held {
  transform: scale(.94);
  opacity: .9;
}

.button-releasing {
  animation-name: press-out;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

@keyframes press-in {
  from {transform: scale(1);opacity: 1}
  to {transform: scale(.94);opacity: .9}
}

@keyframes press-out {
  from {transform: scale(.94);opacity: .9}
  to {transform: scale(1);opacity: 1}
}

.count-badge {
  position: absolute;
  right: -10rpx;
  top: -12rpx;
  z-index: 1;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background: #ff3d32;
  border: 2rpx solid white;
  color: white;
  font-size: 21rpx;
  font-weight: 900;
}
</style>
