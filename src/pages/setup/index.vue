<template>
  <view class="setup-page">
    <view class="hero-copy">
      <text class="hero-title">自助餐回本神器</text>
      <text class="hero-subtitle">准备吃垮老板！</text>
      <view class="dots"><view class="dot active" /><view class="dot" /><view class="dot" /><view class="dot" /></view>
    </view>

    <view class="mode-stage">
      <view class="side-mode left-card"><text>✏️</text><text>自定义</text></view>
      <view class="mode-card">
        <text class="mode-emoji">🍣</text>
        <text class="mode-name">寿喜烧</text>
        <text class="mode-note">肉肉星人的快乐老家</text>
      </view>
      <view class="side-mode right-card"><text>🥩</text><text>烤肉</text></view>
    </view>

    <view class="setup-panel">
      <view class="price-label"><text>💰</text><text>门票价格</text></view>
      <view class="price-input-wrap">
        <text class="currency">¥</text>
        <input v-model="ticketInput" type="digit" placeholder="输入总价" placeholder-class="price-placeholder" />
      </view>
      <view class="mode-actions">
        <navigator class="mode-button deep" :url="menuUrl('单人')" open-type="navigate">🚀 单人模式</navigator>
        <navigator class="mode-button" :url="menuUrl('多人')" open-type="navigate">👥 多人模式</navigator>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const ticketInput = ref('200')

function menuUrl(mode: string) {
  const price = Number(ticketInput.value)
  if (!price || price <= 0) {
    return '/pages/setup/index'
  }
  return `/pages/menu/index?price=${price}&mode=${encodeURIComponent(mode)}`
}
</script>

<style scoped>
.setup-page { height: 100vh; height: 100svh; overflow: hidden; background: linear-gradient(180deg,#ffe4b8 0 76%,#ffdcb2 100%); display: flex; flex-direction: column; box-sizing: border-box; }
.hero-copy { flex: 0 0 auto; text-align: center; padding-top: 24rpx; position: relative; z-index: 2; }
.hero-title { display: block; font-size: 58rpx; line-height: 1.2; font-weight: 1000; color: #ff4f16; text-shadow: 4rpx 5rpx 0 #fff, 8rpx 10rpx 0 rgba(108,63,21,.2); }
.hero-subtitle { display: block; margin-top: 24rpx; color: #fff; font-size: 34rpx; font-weight: 900; text-shadow: 3rpx 3rpx 0 #ff9a00; }
.dots { display: flex; justify-content: center; align-items: center; gap: 18rpx; margin-top: 28rpx; }
.dot { width: 18rpx; height: 18rpx; border-radius: 20rpx; background: rgba(161,113,54,.25); }
.dot.active { width: 68rpx; background: linear-gradient(90deg,#ff9300,#ff501a); }
.mode-stage { flex: 1 1 auto; min-height: 0; margin-top: 46rpx; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.mode-card { width: 500rpx; height: calc(100% - 30rpx); max-height: 650rpx; min-height: 420rpx; border-radius: 100rpx; background: linear-gradient(145deg,#a9e9d5,#6fc5ad); border: 8rpx solid rgba(255,255,255,.25); box-shadow: 0 38rpx 38rpx rgba(133,93,54,.18); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 2; color: white; box-sizing: border-box; }
.mode-emoji { font-size: 104rpx; }
.mode-name { font-size: 52rpx; font-weight: 900; margin-top: 36rpx; }
.mode-note { font-size: 24rpx; opacity: .9; margin-top: 16rpx; }
.side-mode { position: absolute; top: 50%; width: 260rpx; height: 70%; max-height: 430rpx; min-height: 300rpx; transform: translateY(-50%); border-radius: 48rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 34rpx; color: white; gap: 32rpx; }
.left-card { left: -150rpx; background: #dfbdca; }
.right-card { right: -150rpx; background: #f4cf78; }
.side-mode text:first-child { font-size: 76rpx; }
.setup-panel { flex: 0 0 auto; margin-top: 40rpx; padding: 54rpx 48rpx 70rpx; border-radius: 64rpx 64rpx 0 0; background: #fffefa; }
.price-label { display: flex; gap: 16rpx; align-items: center; font-size: 34rpx; font-weight: 800; }
.price-input-wrap { margin-top: 36rpx; height: 116rpx; border: 6rpx solid #eadabd; border-radius: 34rpx; background: #fffaf0; display: flex; align-items: center; padding: 0 34rpx; box-sizing: border-box; }
.price-input-wrap input { flex: 1; height: 100%; font-size: 42rpx; font-weight: 700; color: #3a342f; }
.currency { font-size: 50rpx; color: #8d6500; font-weight: 800; margin-right: 28rpx; }
.price-placeholder { color: #8f8d8a; }
.mode-actions { display: flex; gap: 20rpx; margin-top: 40rpx; }
.mode-button { flex: 1; height: 104rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center; color: white; background: linear-gradient(145deg,#ff8b00,#ff5c16); box-shadow: 0 14rpx 0 #a53700, 0 26rpx 32rpx rgba(158,64,8,.2); font-size: 32rpx; font-weight: 900; text-decoration: none; }
.mode-button.deep { background: linear-gradient(145deg,#ff5b1c,#ff3a10); }
</style>
