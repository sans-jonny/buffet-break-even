<template>
  <view class="sub-page">
    <app-navbar fallback centered title="小票夹" @back="goBack" @fallback="goBack"/>
    <initialization-gate>
    <view v-if="collectionStore.view.receipts.length" class="receipt-grid">
      <view v-for="(item, index) in collectionStore.view.receipts" :key="item.id" class="receipt-thumb" @tap="openReceipt(item.id)">
        <view class="thumb-paper">
          <text class="paper-title">BUFFET-CALC</text>
          <text class="paper-price">¥{{ item.value }} / ¥{{ item.price }}</text>
          <view v-for="line in item.lines.slice(0, 5)" :key="line.name">
            <text>{{ line.name }}</text>
            <text>×{{ line.count }}</text>
          </view>
        </view>
        <view class="thumb-caption">
          <text>{{ index + 1 }}. {{ formatRestaurantTitle(item.restaurant, item.typeName) }}</text>
          <text>{{ formatDateTime(item.date) }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty-state flex-center">
      <text class="empty-icon">🧾</text>
      <text class="empty-title">小票夹还是空的</text>
      <text>完成一次用餐后，把战果收藏在这里吧</text>
    </view>
  </initialization-gate>
  </view>
</template>

<script setup lang="ts">
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import InitializationGate from '@/ui/components/initialization-gate/initialization-gate.vue'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {formatDateTime} from '@/ui/format/time'
import {formatRestaurantTitle} from '@/ui/format/restaurantTitle'

const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const goBack = () => runAction(() => navigation.back('mine'))
import {useCollectionStore} from '@/ui/stores/useCollectionStore'

const collectionStore = useCollectionStore()
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.receipt-thumb {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-radius: 24rpx;
  overflow: hidden;
  background: white;
  color: #302d2a;
  box-shadow: 0 12rpx 28rpx rgba(107, 80, 52, .06);
}

.thumb-paper {
  height: 300rpx;
  flex-shrink: 0;
  overflow: hidden;
  padding: 20rpx;
  background: repeating-linear-gradient(0deg, #fff 0, #fff 6rpx, #faf9f5 7rpx, #faf9f5 8rpx);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  font-size: 18rpx;
  line-height: 24rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.paper-title {
  flex-shrink: 0;
  text-align: center;
  letter-spacing: 2rpx;
  font-size: 20rpx;
  line-height: 26rpx;
}

.paper-price {
  flex-shrink: 0;
  color: #ff6331;
  text-align: center;
  font-size: 24rpx;
  line-height: 30rpx;
}

.thumb-paper view {
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
  min-width: 0;
  gap: 12rpx;
}

.thumb-paper view text:first-child {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.thumb-paper view text:last-child {
  flex-shrink: 0;
  white-space: nowrap;
}

.thumb-caption {
  height: 112rpx;
  flex-shrink: 0;
  overflow: hidden;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  box-sizing: border-box;
  font-size: 22rpx;
  line-height: 26rpx;
  color: #999;
}

.thumb-caption text {
  display: block;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.thumb-caption text:first-child {
  font-size: 28rpx;
  line-height: 34rpx;
  font-weight: 900;
  color: #302d2a;
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
