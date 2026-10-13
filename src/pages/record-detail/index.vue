<template>
  <view class="sub-page">
    <view v-if="receipt" class="detail-body">
      <records-overview :meals="records.length" :rounds="receipt.rounds.length" :dishes="dishCount" />
      <view class="detail-card">
        <view class="detail-head"><view><text class="label-chip">本餐</text><text class="restaurant">{{ receipt.restaurant }}</text></view><text class="record-date">{{ receipt.date }}</text></view>
        <view v-for="(round, roundIndex) in receipt.rounds" :key="roundIndex" class="round-box">
          <view class="round-head"><text class="round-chip">第 {{ roundIndex + 1 }} 轮</text><text class="round-time">{{ round.time }}</text><text class="round-value">¥{{ round.value.toFixed(2) }}</text></view>
          <view v-for="line in round.lines" :key="line.name" class="detail-line"><text>{{ line.name }}</text><text>x{{ line.count }}</text><text>¥{{ (line.price * line.count).toFixed(2) }}</text></view>
        </view>
        <view class="delete-record" @tap="confirmDelete">删除此餐记录</view>
      </view>
    </view>
    <view v-else class="empty-state"><text class="empty-icon">📋</text><text>记录不存在</text></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useBuffetStore } from '@/store/buffet'

const receiptIndex = ref(-1)
const { records, deleteRecord } = useBuffetStore()
const receipt = computed(() => records.value[receiptIndex.value])
const dishCount = computed(() => receipt.value?.lines.reduce((sum, line) => sum + line.count, 0) || 0)

onLoad((query) => {
  receiptIndex.value = Number(query?.index ?? -1)
})

function confirmDelete() {
  uni.showModal({
    title: '删除记录',
    content: '确定删除这次用餐记录吗？',
    confirmColor: '#ff4a45',
    success(result) {
      if (!result.confirm) return
      deleteRecord(receiptIndex.value)
      uni.showToast({ title: '记录已删除', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 350)
    }
  })
}
</script>

<style scoped>
.sub-page { min-height: 100vh; background: #fff9f2; }
.detail-body { padding: 20rpx 30rpx 50rpx; }
.detail-card { background: white; border-radius: 26rpx; padding: 30rpx; }
.detail-head { display: flex; flex-direction: column; gap: 20rpx; padding-bottom: 28rpx; border-bottom: 1rpx solid #eee; }
.detail-head > view { display: flex; align-items: center; gap: 20rpx; }
.label-chip { padding: 9rpx 15rpx; border-radius: 12rpx; background: #fff0e5; color: #ff7439; font-size: 24rpx; font-weight: 900; }
.restaurant { font-size: 31rpx; font-weight: 800; }
.record-date { color: #9b8c7f; font-size: 23rpx; }
.round-box { margin-top: 26rpx; padding: 22rpx; border: 2rpx solid #ffe1cd; border-radius: 20rpx; }
.round-head { display: flex; align-items: center; gap: 16rpx; padding-bottom: 18rpx; border-bottom: 1rpx solid #eee; }
.round-chip { padding: 8rpx 12rpx; border-radius: 10rpx; background: #ffe9db; color: #ff7439; font-size: 22rpx; font-weight: 900; }
.round-time { color: #8f8074; font-size: 22rpx; flex: 1; }
.round-value { color: #ff7439; font-size: 25rpx; font-weight: 800; }
.detail-line { min-height: 58rpx; display: grid; grid-template-columns: 1fr 60rpx 100rpx; align-items: center; font-size: 24rpx; font-weight: 700; }
.detail-line text:nth-child(2), .detail-line text:nth-child(3) { text-align: right; }.detail-line text:nth-child(2) { color: #998b80; }.detail-line text:nth-child(3) { color: #ff7439; font-weight: 800; }
.delete-record { width: 100%; height: 72rpx; margin-top: 28rpx; border: 2rpx solid #ff4a45; border-radius: 18rpx; background: white; color: #ff4a45; display: flex; align-items: center; justify-content: center; font-size: 25rpx; font-weight: 800; box-sizing: border-box; }
.empty-state { height: 500rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18rpx; color: #999; }.empty-icon { font-size: 90rpx; }
</style>
