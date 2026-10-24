<template>
  <view class="modal-mask" @tap="$emit('close')">
    <view class="cart-sheet" @tap.stop>
      <view class="sheet-head">
        <text>本轮待选</text>
        <view class="sheet-close flex-center" @tap="$emit('close')">×</view>
      </view>
      <scroll-view :scroll-y="true" class="cart-lines">
        <view v-for="line in lines" :key="line.product.id" class="cart-line">
          <view class="cart-copy">
            <text class="cart-name">{{ line.product.name }}</text>
            <text class="cart-price">¥{{ formatPrice(line.product.price * line.count) }}</text>
          </view>
          <view class="stepper">
            <view class="step-button flex-center" @tap="$emit('remove', line.product.id)">−</view>
            <text class="step-count">{{ line.count }}</text>
            <view class="step-button plus flex-center" @tap="$emit('add', line.product.id)">+</view>
          </view>
        </view>
      </scroll-view>
      <view class="sheet-footer">
        <view class="sheet-total">
          <text>本轮合计</text>
          <text class="sheet-total-value">¥{{ formatPrice(total) }}</text>
        </view>
        <view v-if="canConfirm && lines.length" class="waiter-button flex-center" @tap="$emit('confirm')">给 Waiter 看菜单</view>
        <text v-else class="cart-hint">{{ !lines.length ? '本轮还没有选择菜品' : '等待房主给 Waiter 看菜单并提交本轮' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type {ProductLineView} from '@/presentation/dining/ProductLineView'
import {formatPrice} from '@/utils/format'

withDefaults(defineProps<{ lines: ProductLineView[]; total: number; canConfirm?: boolean }>(), {canConfirm: true})
defineEmits<{
  (event: 'close'): void
  (event: 'add', id: string): void
  (event: 'remove', id: string): void
  (event: 'confirm'): void
}>()
</script>

<style scoped>
.cart-hint {color:#9a7d65;font-size:25rpx;text-align:center;padding:24rpx 0}
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(39, 34, 29, .4);
  display: flex;
  align-items: flex-end;
}

.cart-sheet {
  width: 100%;
  min-height: 70vh;
  max-height: 86vh;
  background: white;
  border-radius: 42rpx 42rpx 0 0;
  padding: 26rpx 32rpx calc(34rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 34rpx;
  font-weight: 900;
  margin-bottom: 22rpx;
}

.sheet-close {
  width: 64rpx;
  height: 64rpx;
  background: #f5f3f1;
  border-radius: 50%;
  color: #735f45;
  font-size: 42rpx;
}

.cart-lines {
  max-height: 62vh;
}

.cart-line {
  min-height: 116rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx dashed #eee9e3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.cart-copy {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.cart-name {
  font-size: 29rpx;
  font-weight: 800;
}

.cart-price {
  font-size: 26rpx;
  color: #ff6331;
  font-weight: 800;
}

.stepper {
  height: 64rpx;
  border-radius: 34rpx;
  background: #fafafa;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.step-button {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: white;
  color: #999;
  font-size: 36rpx;
  box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, .06);
}

.step-button.plus {
  background: #ff6331;
  color: white;
}

.step-count {
  font-size: 29rpx;
  font-weight: 800;
}

.sheet-footer {
  margin-top: auto;
  border-top: 1rpx solid #eee;
  padding-top: 24rpx;
}

.sheet-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 27rpx;
  color: #777;
  margin-bottom: 22rpx;
}

.sheet-total-value {
  color: #ff6331;
  font-size: 43rpx;
  font-weight: 900;
}

.waiter-button {
  width: 100%;
  height: 104rpx;
  border-radius: 44rpx;
  background: #ff5b24;
  color: white;
  font-size: 32rpx;
  font-weight: 900;
}
</style>
