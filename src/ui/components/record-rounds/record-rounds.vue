<template>
  <view class="record-consumption">
    <view v-if="showDetail" class="record-total" @tap="emit('detail')">
      <text>查看详情 / 删除 ›</text>
    </view>
    <view class="record-total">
      <text>就餐价格 ¥{{ receipt.price }}</text>
      <text>已吃价值 ¥{{ receipt.value }}</text>
    </view>
    <view v-if="receipt.participants.length" class="record-total record-participants">
      <text>用餐人：{{ receipt.participants.join('、') }}</text>
    </view>
    <view v-for="(round, roundIndex) in receipt.rounds" :key="roundIndex" class="round-box">
      <view class="round-head">
        <text>第 {{ roundIndex + 1 }} 轮</text>
        <text>{{ time.formatRoundTime(round.time) }}</text>
        <text>¥{{ round.value.toFixed(2) }}</text>
      </view>
      <view v-for="line in round.lines" :key="line.name" class="detail-line">
        <text>{{ line.name }}</text>
        <text>×{{ line.count }}</text>
        <text>¥{{ (line.price * line.count).toFixed(2) }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import {time} from '@/ui/format/time'
import type {ReceiptView} from '@/ui/presentation/ReceiptView'

defineProps<{receipt: ReturnType<typeof ReceiptView.fromResult>; showDetail?: boolean}>()
const emit = defineEmits<{(event: 'detail'): void}>()
</script>

<style scoped>
.record-total {
  padding-top: 24rpx;
  display: flex;
  justify-content: space-between;
  color: #ff7439;
  font-size: 23rpx;
  font-weight: 800;
}

.round-box {
  margin-top: 24rpx;
  padding: 20rpx;
  border: 2rpx solid #ffe1cd;
  border-radius: 18rpx;
}

.record-participants {
  color: #9c8d80;
  font-weight: 400;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.round-head {
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eee;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  color: #8f8074;
  font-size: 22rpx;
  font-weight: 800;
}

.round-head text:last-child {
  color: #ff7439;
  text-align: right;
}

.detail-line {
  min-height: 54rpx;
  display: grid;
  grid-template-columns: 1fr 60rpx 100rpx;
  align-items: center;
  font-size: 23rpx;
  font-weight: 700;
}

.detail-line text:nth-child(2), .detail-line text:nth-child(3) {
  text-align: right;
}

.detail-line text:nth-child(2) {
  color: #998b80;
}

.detail-line text:nth-child(3) {
  color: #ff7439;
  font-weight: 800;
}
</style>
