<template>
  <view class="sub-page">
    <view v-if="receipts.length" class="receipt-grid">
      <view v-for="(item, index) in receipts" :key="item.id" class="receipt-thumb" @tap="openReceipt(item.id)">
        <view class="thumb-paper">
          <text class="paper-title">BUFFET-CALC</text>
          <text class="paper-price">¥{{ item.value }} / ¥{{ item.price }}</text>
          <view v-for="line in item.lines.slice(0, 5)" :key="line.name">
            <text>{{ line.name }}</text>
            <text>×{{ line.count }}</text>
          </view>
        </view>
        <view class="thumb-caption">
          <text>{{ index + 1 }}. {{ item.restaurant }}</text>
          <text>{{ item.date }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty-state flex-center">
      <text class="empty-icon">🧾</text>
      <text class="empty-title">小票夹还是空的</text>
      <text>完成一次用餐后，把战果收藏在这里吧</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {useRequired} from '@/composables/useRequired'
import {runAction} from '@/composables/runAction'
import {BuffetNavigation} from '@/navigation/BuffetNavigation'

const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
import {storeToRefs} from 'pinia'
import {useBuffetViewStore} from '@/stores/useBuffetViewStore'

const {view} = storeToRefs(useBuffetViewStore())
const receipts = computed(() => view.value.receipts)
const openReceipt = (id: string) => runAction(() => navigation.toResult(id))
</script>

<style scoped>
.sub-page {
  min-height: 100vh;
  background: #fff9f2;
}

.receipt-grid {
  padding: 20rpx 22rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.receipt-thumb {
  border-radius: 24rpx;
  overflow: hidden;
  background: white;
  color: #302d2a;
  box-shadow: 0 12rpx 28rpx rgba(107, 80, 52, .06);
}

.thumb-paper {
  height: 244rpx;
  padding: 20rpx;
  background: repeating-linear-gradient(0deg, #fff 0, #fff 6rpx, #faf9f5 7rpx, #faf9f5 8rpx);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  font-size: 18rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.paper-title {
  text-align: center;
  letter-spacing: 2rpx;
  font-size: 20rpx;
}

.paper-price {
  color: #ff6331;
  text-align: center;
  font-size: 24rpx;
}

.thumb-paper view {
  display: flex;
  justify-content: space-between;
}

.thumb-caption {
  height: 100rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  box-sizing: border-box;
}

.thumb-caption text:first-child {
  font-size: 28rpx;
  font-weight: 900;
}

.thumb-caption text:last-child {
  font-size: 22rpx;
  color: #999;
}

.empty-state {
  height: 600rpx;
  flex-direction: column;
  gap: 20rpx;
  color: #9f958b;
  font-size: 23rpx;
}

.empty-icon {
  font-size: 100rpx;
}

.empty-title {
  font-size: 30rpx;
  color: #403b36;
  font-weight: 800;
}
</style>
