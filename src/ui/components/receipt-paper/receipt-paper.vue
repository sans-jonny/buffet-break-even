<template>
  <view class="receipt" @touchstart="saveGesture.start" @touchmove="saveGesture.move" @longpress.stop="saveGesture.longPress" @touchend="saveGesture.end" @touchcancel="saveGesture.cancel">
    <view v-if="detached" class="receipt-teeth receipt-teeth-top">
      <view v-for="tooth in 28" :key="tooth" class="receipt-tooth"/>
    </view>
    <text class="receipt-title">PAGER MESSAGE</text>
    <text v-if="restaurant" class="receipt-restaurant">{{ formatRestaurantTitle(restaurant, typeName) }}</text>
    <view class="receipt-dash"/>
    <view class="receipt-meta">
      <text>ID: {{ receiptId }}</text>
      <text>{{ dateTime }}</text>
    </view>
    <view class="receipt-dash"/>
    <text v-if="participants?.length" class="receipt-participants">用餐人：{{ participants.join('、') }}</text>
    <text class="verdict">{{ resultTitle }}</text>
    <text class="verdict-copy">{{ resultCopy }}</text>
    <view class="receipt-dash"/>
    <view class="receipt-summary">
      <view class="summary-item">
        <text>就餐价格</text>
        <text class="summary-value">¥{{ price }}</text>
      </view>
      <view class="summary-item summary-center">
        <text>已吃价值</text>
        <text class="summary-value">¥{{ formatPrice(value) }}</text>
      </view>
      <view class="summary-item summary-end">
        <text>差额</text>
        <text class="summary-value difference" :class="{ win: result.isBreakEven }">{{ differenceText }}</text>
      </view>
    </view>
    <view class="receipt-dash"/>
    <view v-for="line in lines" :key="line.name" class="receipt-line">
      <text>{{ line.name }}</text>
      <text class="receipt-line-number">×{{ line.count }}</text>
      <text class="receipt-line-number">¥{{ formatPrice(line.price * line.count) }}</text>
    </view>
    <view class="receipt-dash"/>
    <view class="receipt-bottom">
      <text>||||||||||||||||||||</text>
      <text>Finished dining</text>
    </view>
    <text class="save-hint">长按图片</text>
    <view class="receipt-teeth">
      <view v-for="tooth in 28" :key="tooth" class="receipt-tooth"/>
    </view>
  </view>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {useLongPressAction} from '@/ui/composables/useLongPressAction'
import {formatRestaurantTitle} from '@/ui/format/restaurantTitle'
import type {ReceiptLineView} from '@/presentation/receipt/ReceiptLineView'
import {formatPrice} from '@/utils/format'
import type {BreakEvenView} from '@/presentation/shared/BreakEvenView'

const props = defineProps<{
  restaurant?: string
  detached?: boolean
  typeName?: string
  participants?: readonly string[]
  receiptId: string
  dateTime: string
  price: number
  value: number
  lines: ReceiptLineView[]
  result: BreakEvenView
}>()
const emit = defineEmits<{(event: 'save-image'): void}>()
const saveGesture = useLongPressAction(() => emit('save-image'))

const result = computed(() => props.result)
const differenceText = computed(() => `${result.value.isBreakEven ? '+' : '−'}¥${Math.abs(result.value.difference).toFixed(0)}`)
const resultTitle = computed(() => ({
  'break-even': '成功回本',
  close: '就差一点',
  below: '大慈善家'
})[result.value.verdict])
const resultCopy = computed(() => result.value.isBreakEven
    ? `这顿吃回了 ${Math.round(result.value.difference)} 元，漂亮！`
    : `老板含泪赚了你 ${Math.round(-result.value.difference)} 元，下次多拿点贵的！`)
</script>

<style scoped>
.receipt-restaurant {display:block;text-align:center;font-size:25rpx;margin-top:18rpx;overflow-wrap:anywhere;color:#6c625a}
.receipt-participants {display:block;font-size:24rpx;line-height:1.8;margin-bottom:20rpx;overflow-wrap:anywhere;color:#6c625a}
.receipt {
  margin: 0 62rpx 30rpx;
  padding: 46rpx 32rpx 56rpx;
  background: repeating-linear-gradient(0deg, #fff 0, #fff 6rpx, #fbfaf7 7rpx, #fbfaf7 8rpx);
  box-shadow: 0 18rpx 28rpx rgba(94, 68, 39, .09);
  position: relative;
}

.receipt-title {
  display: block;
  text-align: center;
  font-size: 27rpx;
  font-weight: 900;
  letter-spacing: 7rpx;
}

.receipt-dash {
  border-top: 2rpx dashed #d9d9d9;
  margin: 26rpx 0;
}

.receipt-meta {
  display: flex;
  justify-content: space-between;
  font-size: 21rpx;
  font-weight: 900;
}

.verdict {
  display: block;
  text-align: center;
  color: #f04c0e;
  font-size: 45rpx;
  font-weight: 1000;
  margin: 18rpx 0;
}

.verdict-copy {
  display: block;
  text-align: center;
  color: #8a693e;
  font-size: 22rpx;
  font-weight: 800;
  line-height: 1.6;
}

.receipt-summary {
  display: flex;
  justify-content: space-between;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  font-size: 20rpx;
  font-weight: 800;
}

.summary-center {
  align-items: center;
}

.summary-end {
  align-items: flex-end;
}

.summary-value {
  font-size: 27rpx;
  font-weight: 800;
}

.difference {
  color: #a51f1f;
}

.difference.win {
  color: #0c8b62;
}

.receipt-line {
  height: 46rpx;
  display: grid;
  grid-template-columns: 1fr 70rpx 90rpx;
  align-items: center;
  font-size: 22rpx;
  font-weight: 800;
}

.receipt-line-number {
  text-align: right;
}

.receipt-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 18rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.save-hint {
  display: block;
  text-align: right;
  color: #8d8984;
  font-size: 17rpx;
  margin-top: 10rpx;
}

.receipt-teeth {
  height: 18rpx;
  position: absolute;
  left: 0;
  right: 0;
  /* Overlap by one CSS pixel to cover fractional rpx rounding at any pixel ratio. */
  bottom: calc(1px - 18rpx);
  display: flex;
  overflow: hidden;
}

.receipt-tooth {
  width: 0;
  height: 0;
  border-left: 12rpx solid transparent;
  border-right: 12rpx solid transparent;
  border-top: 18rpx solid #fbfaf7;
  flex: 1 0 24rpx;
}

.receipt-teeth-top {
  top: calc(1px - 18rpx);
  bottom: auto;
  transform: rotate(180deg);
}
</style>
