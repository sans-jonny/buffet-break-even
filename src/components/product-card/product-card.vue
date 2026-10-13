<template>
  <view class="product-card">
    <view class="food-picture flex-center" :style="{ background: product.gradient }"><text>{{ product.emoji }}</text></view>
    <view class="food-info">
      <text class="food-name">{{ product.name }}</text>
      <view><text class="value-label">价值 </text><text class="food-price">¥{{ formatPrice(product.price) }}</text></view>
    </view>
    <view class="add-control">
      <view class="add-button flex-center" hover-class="button-pressed" @tap="$emit('add', product.id)"><text class="iconfont icon-tianjia" /></view>
      <view v-if="count" class="count-badge flex-center">{{ count }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Product } from '@/types/buffet'
import { formatPrice } from '@/utils/format'

defineProps<{ product: Product; count?: number }>()
defineEmits<{ (event: 'add', id: string): void }>()
</script>

<style scoped>
.product-card { height: 186rpx; border-radius: 26rpx; background: white; margin-bottom: 18rpx; padding: 22rpx; display: flex; align-items: center; position: relative; box-shadow: 0 14rpx 32rpx rgba(179,112,54,.07); box-sizing: border-box; }
.food-picture { width: 142rpx; height: 142rpx; border-radius: 18rpx; flex-shrink: 0; overflow: hidden; }
.food-picture text { font-size: 76rpx; }
.food-info { flex: 1; min-width: 0; padding-left: 22rpx; display: flex; flex-direction: column; gap: 24rpx; }
.food-name { font-size: 29rpx; font-weight: 900; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.value-label { color: #aaa6a2; font-size: 24rpx; }
.food-price { color: #ff6331; font-size: 31rpx; font-weight: 900; }
.add-control { position: relative; width: 82rpx; height: 82rpx; flex-shrink: 0; }
.add-button { width: 82rpx; height: 82rpx; border-radius: 50%; background: #ff6331; color: white; font-size: 52rpx; box-shadow: 0 12rpx 22rpx rgba(255,98,48,.23); }
.button-pressed { transform: scale(.94); opacity: .9; }
.count-badge { position: absolute; right: -10rpx; top: -12rpx; z-index: 1; width: 1.2rem; height: 1.2rem; border-radius: 50%; background: #ff3d32; border: 2rpx solid white; color: white; font-size: 21rpx; font-weight: 900; }
</style>
