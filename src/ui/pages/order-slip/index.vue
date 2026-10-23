<template>
  <view class="order-page">
    <initialization-gate>
    <view class="notebook">
      <view class="rings">
        <view v-for="number in 9" :key="number" class="ring"/>
      </view>
      <view class="notebook-head">
        <text>Order Time（下单时间）</text>
        <text>≡🖊️</text>
      </view>
      <text class="order-time">{{ date }} {{ time }}</text>
      <view class="paper-rule"/>
      <view v-for="line in diningStore.view.selectedLines" :key="line.product.id" class="order-line">
        <text class="order-qty">{{ line.count }}x</text>
        <text>{{ line.product.name }}</text>
        <text class="order-check">✓</text>
      </view>
      <view class="paper-rule"/>
      <text class="order-note">辛苦了！希望菜品能尽快上齐，感激不尽！ 🌟</text>
      <view class="order-done flex-center" @tap="completeRound">点单完毕！</view>
    </view>
  </initialization-gate>
  </view>
</template>

<script setup lang="ts">
import InitializationGate from '@/ui/components/initialization-gate/initialization-gate.vue'
import {ref, watch} from 'vue'
import {useApplicationStore} from '@/ui/stores/useApplicationStore'
import {onLoad} from '@dcloudio/uni-app'
import {CommitRoundInput} from '@/contexts/dining/public'
import {currentDate, currentTime} from '@/utils/format'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'

const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const applicationStore = useApplicationStore()
import {useDiningStore} from '@/ui/stores/useDiningStore'

const diningStore = useDiningStore()
const commit = useRequired<CommitRoundInput>(CommitRoundInput.Token)
const date = ref(currentDate())
const time = ref(currentTime())
const submitting = ref(false)
function checkSelection() {
  if (applicationStore.ready && !diningStore.view.selectedLines.length) return runAction(() => navigation.open('menu', 'replace'))
}
onLoad(() => { void checkSelection() })
watch(() => applicationStore.ready, initialized => { if (initialized) void checkSelection() })

function completeRound() {
  if (submitting.value) return
  void runAction(async () => {
    submitting.value = true
    try {
      const response = commit.execute({})
      if (response.committed) uni.showToast({title: '第 ' + response.roundCount + ' 轮已记录', icon: 'none'})
      await navigation.back('menu')
    } finally {
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  padding-bottom: 34rpx;
  background: #e9eee8;
  box-sizing: border-box;
}

.notebook {
  min-height: calc(100vh - 116rpx);
  margin: 10rpx 30rpx;
  background: #fffcf3;
  padding: 84rpx 50rpx;
  position: relative;
  box-shadow: 0 16rpx 38rpx rgba(78, 86, 73, .12);
  box-sizing: border-box;
}

.rings {
  position: absolute;
  left: 62rpx;
  right: 62rpx;
  top: -28rpx;
  display: flex;
  justify-content: space-between;
}

.ring {
  width: 16rpx;
  height: 64rpx;
  border-radius: 10rpx;
  background: linear-gradient(90deg, #c4c4c4, #fff, #bbb);
  box-shadow: 0 5rpx 0 #555;
}

.notebook-head {
  display: flex;
  justify-content: space-between;
  font-size: 38rpx;
  font-weight: 900;
}

.order-time {
  display: block;
  color: #ff6331;
  font-size: 54rpx;
  font-weight: 900;
  margin: 26rpx 0 8rpx;
}

.paper-rule {
  height: 1rpx;
  background: #e9e1d2;
  margin: 18rpx 0;
}

.order-line {
  min-height: 104rpx;
  border-bottom: 1rpx solid #f0eadf;
  display: grid;
  grid-template-columns: 90rpx 1fr 50rpx;
  align-items: center;
  font-size: 32rpx;
  font-weight: 800;
}

.order-qty {
  color: #191715;
  font-size: 36rpx;
}

.order-check {
  color: #ed7b43;
  font-size: 45rpx;
  text-align: right;
}

.order-note {
  display: block;
  text-align: center;
  color: #77716a;
  font-size: 26rpx;
  font-style: italic;
  padding: 10rpx 0 36rpx;
}

.order-done {
  width: 100%;
  height: 104rpx;
  border-radius: 44rpx;
  background: #ff6331;
  color: white;
  font-size: 32rpx;
  font-weight: 900;
}
</style>
