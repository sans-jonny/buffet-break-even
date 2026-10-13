<template>
  <view class="order-page">
    <view class="notebook">
      <view class="rings"><view v-for="number in 9" :key="number" class="ring" /></view>
      <view class="notebook-head"><text>Order Time（下单时间）</text><text>≡🖊️</text></view>
      <text class="order-time">{{ date }} {{ time }}</text>
      <view class="paper-rule" />
      <view v-for="line in selectedLines" :key="line.product.id" class="order-line">
        <text class="order-qty">{{ line.count }}x</text><text>{{ line.product.name }}</text><text class="order-check">✓</text>
      </view>
      <view class="paper-rule" />
      <text class="order-note">辛苦了！希望菜品能尽快上齐，感激不尽！ 🌟</text>
      <view class="order-done flex-center" @tap="completeRound">点单完毕！</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useBuffetStore } from '@/store/buffet'
import { currentDate, currentTime } from '@/utils/format'

const date = ref(currentDate())
const time = ref(currentTime())
const { selectedLines, commitRound } = useBuffetStore()

onLoad(() => {
  if (!selectedLines.value.length) uni.redirectTo({ url: '/pages/menu/index' })
})

function completeRound() {
  const count = commitRound()
  uni.showToast({ title: `第 ${count} 轮已记录`, icon: 'none' })
  setTimeout(() => uni.navigateBack(), 450)
}
</script>

<style scoped>
.order-page { min-height: 100vh; padding-bottom: 34rpx; background: #e9eee8; box-sizing: border-box; }
.notebook { min-height: calc(100vh - 116rpx); margin: 10rpx 30rpx; background: #fffcf3; padding: 84rpx 50rpx; position: relative; box-shadow: 0 16rpx 38rpx rgba(78,86,73,.12); box-sizing: border-box; }
.rings { position: absolute; left: 62rpx; right: 62rpx; top: -28rpx; display: flex; justify-content: space-between; }
.ring { width: 16rpx; height: 64rpx; border-radius: 10rpx; background: linear-gradient(90deg,#c4c4c4,#fff,#bbb); box-shadow: 0 5rpx 0 #555; }
.notebook-head { display: flex; justify-content: space-between; font-size: 38rpx; font-weight: 900; }
.order-time { display: block; color: #ff6331; font-size: 54rpx; font-weight: 900; margin: 26rpx 0 8rpx; }
.paper-rule { height: 1rpx; background: #e9e1d2; margin: 18rpx 0; }
.order-line { min-height: 104rpx; border-bottom: 1rpx solid #f0eadf; display: grid; grid-template-columns: 90rpx 1fr 50rpx; align-items: center; font-size: 32rpx; font-weight: 800; }
.order-qty { color: #191715; font-size: 36rpx; }
.order-check { color: #ed7b43; font-size: 45rpx; text-align: right; }
.order-note { display: block; text-align: center; color: #77716a; font-size: 26rpx; font-style: italic; padding: 10rpx 0 36rpx; }
.order-done { width: 100%; height: 104rpx; border-radius: 44rpx; background: #ff6331; color: white; font-size: 32rpx; font-weight: 900; }
</style>
