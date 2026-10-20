<template>
  <view class="setup-page">
    <view class="hero-copy">
      <text class="hero-title">自助餐回本神器</text>
      <text class="hero-subtitle">准备吃垮老板！</text>
      <view class="dots flex-center">
        <view v-for="(mode, i) in modes" :key="mode.name" class="dot" :class="{ active: i === current }" @tap="current = i"/>
      </view>
    </view>

    <view class="mode-stage" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <view
          v-for="(mode, i) in modes"
          :key="mode.name"
          class="mode-card flex-center"
          :style="cardStyle(i)"
      >
        <text class="mode-emoji">{{ mode.emoji }}</text>
        <text class="mode-name">{{ mode.name }}</text>
        <text class="mode-note">{{ mode.note }}</text>
      </view>
    </view>

    <view class="setup-panel">
      <view class="price-label">
        <text>💰</text>
        <text>门票价格</text>
      </view>
      <view class="price-input-wrap">
        <text class="currency">¥</text>
        <input v-model="ticketInput" type="digit" placeholder="输入总价" placeholder-class="price-placeholder"/>
      </view>
      <view class="mode-actions">
        <view class="mode-button deep flex-center" @tap="start('单人')">🚀 单人模式</view>
        <view class="mode-button flex-center" @tap="start('多人')">👥 多人模式</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {BeginSessionInput} from '@/contexts/independent/dining/public'
import {useRequired} from '@/composables/useRequired'
import {runAction} from '@/composables/runAction'
import {BuffetNavigation} from '@/navigation/BuffetNavigation'

const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
import {storeToRefs} from 'pinia'
import {useDiningStore} from '@/stores/useDiningStore'

const {view: diningView} = storeToRefs(useDiningStore())
const begin = useRequired<BeginSessionInput>(BeginSessionInput.Token)
const ticketInput = ref('200')
const starting = ref(false)

const modes = [
  {name: '烤肉自助', emoji: '🥩', note: '肉食动物的狂欢', gradient: 'linear-gradient(145deg,#ff9c71,#d94c44)'},
  {name: '寿喜烧', emoji: '🍲', note: '肉肉星人的快乐老家', gradient: 'linear-gradient(145deg,#a9e9d5,#6fc5ad)'},
  {name: '寿司', emoji: '🍣', note: '海鲜控的天堂', gradient: 'linear-gradient(145deg,#b8e9e5,#f2996c)'}
]
const current = ref(0)

const CENTER_SCALE = 1.06
const SIDE_SCALE = 0.86
const SIDE_OFFSET = 180

function cardState(i: number): number {
  return (i - current.value + modes.length) % modes.length
}

function cardStyle(i: number) {
  const background = modes[i].gradient
  if (cardState(i) === 0) {
    return {background, transform: `translate(-50%, -50%) scale(${CENTER_SCALE})`, zIndex: 3, opacity: 1}
  }
  const dir = cardState(i) === 1 ? 1 : -1
  return {
    background,
    transform: `translate(calc(-50% + ${dir * SIDE_OFFSET}rpx), -50%) scale(${SIDE_SCALE})`,
    zIndex: 2,
    opacity: 0.9
  }
}

let touchStartX = 0
function onTouchStart(event: any) {
  touchStartX = event.touches[0].clientX
}

function onTouchEnd(event: any) {
  const dx = event.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) < 40) return
  current.value = dx < 0
      ? (current.value + 1) % modes.length
      : (current.value - 1 + modes.length) % modes.length
}

function start(mode: string) {
  if (starting.value) return
  const submit = (replaceActive = false) => runAction(async () => {
    starting.value = true
    try {
      begin.execute({ticketPrice: Number(ticketInput.value), diningMode: mode, replaceActive})
      await navigation.open('menu')
    } finally {
      starting.value = false
    }
  })
  if (diningView.value.session.active) {
    uni.showModal({
      title: '已有进行中的用餐', content: '重新开始会清空当前待选和轮次。取消可继续当前用餐。',
      confirmText: '重新开始', cancelText: '继续用餐',
      success: result => {
        if (result.confirm) void submit(true); else if (result.cancel) void runAction(() => navigation.open('menu'))
      }
    })
  } else void submit()
}
</script>

<style scoped>
.setup-page {
  height: 100vh;
  height: 100svh;
  overflow: hidden;
  background: linear-gradient(180deg, #ffe4b8 0 76%, #ffdcb2 100%);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.hero-copy {
  flex: 0 0 auto;
  text-align: center;
  padding-top: 24rpx;
  position: relative;
  z-index: 2;
}

.hero-title {
  display: block;
  font-size: 58rpx;
  line-height: 1.2;
  font-weight: 1000;
  color: #ff4f16;
  text-shadow: 4rpx 5rpx 0 #fff, 8rpx 10rpx 0 rgba(108, 63, 21, .2);
}

.hero-subtitle {
  display: block;
  margin-top: 24rpx;
  color: #fff;
  font-size: 34rpx;
  font-weight: 900;
  text-shadow: 3rpx 3rpx 0 #ff9a00;
}

.dots {
  gap: 18rpx;
  margin-top: 28rpx;
}

.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 20rpx;
  background: rgba(161, 113, 54, .25);
}

.dot.active {
  width: 68rpx;
  background: linear-gradient(90deg, #ff9300, #ff501a);
}

.mode-stage {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 46rpx;
  position: relative;
  overflow: hidden;
}

.mode-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 500rpx;
  height: calc(100% - 30rpx);
  max-height: 650rpx;
  min-height: 420rpx;
  border-radius: 100rpx;
  border: 8rpx solid rgba(255, 255, 255, .25);
  box-shadow: 0 38rpx 38rpx rgba(133, 93, 54, .18);
  flex-direction: column;
  color: white;
  box-sizing: border-box;
  transition: transform .35s ease, opacity .35s ease;
  will-change: transform;
}

.mode-emoji {
  font-size: 104rpx;
}

.mode-name {
  font-size: 52rpx;
  font-weight: 900;
  margin-top: 36rpx;
}

.mode-note {
  font-size: 24rpx;
  opacity: .9;
  margin-top: 16rpx;
}

.setup-panel {
  flex: 0 0 auto;
  margin-top: 40rpx;
  padding: 54rpx 48rpx 70rpx;
  border-radius: 64rpx 64rpx 0 0;
  background: #fffefa;
}

.price-label {
  display: flex;
  gap: 16rpx;
  align-items: center;
  font-size: 34rpx;
  font-weight: 800;
}

.price-input-wrap {
  margin-top: 36rpx;
  height: 116rpx;
  border: 6rpx solid #eadabd;
  border-radius: 34rpx;
  background: #fffaf0;
  display: flex;
  align-items: center;
  padding: 0 34rpx;
  box-sizing: border-box;
}

.price-input-wrap input {
  flex: 1;
  height: 100%;
  font-size: 42rpx;
  font-weight: 700;
  color: #3a342f;
}

.currency {
  font-size: 50rpx;
  color: #8d6500;
  font-weight: 800;
  margin-right: 28rpx;
}

.price-placeholder {
  color: #8f8d8a;
}

.mode-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.mode-button {
  flex: 1;
  height: 104rpx;
  border-radius: 44rpx;
  color: white;
  background: linear-gradient(145deg, #ff8b00, #ff5c16);
  box-shadow: 0 14rpx 0 #a53700, 0 26rpx 32rpx rgba(158, 64, 8, .2);
  font-size: 32rpx;
  font-weight: 900;
  text-decoration: none;
}

.mode-button.deep {
  background: linear-gradient(145deg, #ff5b1c, #ff3a10);
}
</style>
