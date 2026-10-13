<template>
  <view class="result-navbar" :style="navbarStyle">
    <view class="navbar-content" :style="contentStyle">
      <view class="back-button" @tap="goBack">‹</view>
      <view class="title-copy">
        <text class="navbar-title">{{ title }}</text>
        <text class="navbar-subtitle">{{ subtitle }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  subtitle?: string
  fallback?: string
}>(), {
  title: '今日战果',
  subtitle: '长按保存到相册',
  fallback: '/pages/menu/index'
})

const systemInfo = uni.getSystemInfoSync()
const statusBarHeight = systemInfo.statusBarHeight || 0
const menuButton = typeof uni.getMenuButtonBoundingClientRect === 'function'
  ? uni.getMenuButtonBoundingClientRect()
  : null
const rightGuard = menuButton && menuButton.left
  ? Math.max((systemInfo.windowWidth || systemInfo.screenWidth) - menuButton.left + 8, 24)
  : 24
const navbarStyle = { paddingTop: `${statusBarHeight}px` }
const contentStyle = { paddingRight: `${rightGuard}px` }

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: props.fallback })
}
</script>

<style scoped>
.result-navbar { flex: 0 0 auto; box-sizing: border-box; }
.navbar-content { min-height: 120rpx; padding-left: 24rpx; display: flex; align-items: center; gap: 20rpx; box-sizing: border-box; }
.back-button { width: 76rpx; height: 76rpx; border-radius: 50%; background: rgba(255,255,255,.95); color: #3e352e; box-shadow: 0 12rpx 28rpx rgba(101,70,40,.1); display: flex; flex: 0 0 76rpx; align-items: center; justify-content: center; font-family: serif; font-size: 50rpx; line-height: 1; }
.title-copy { min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.navbar-title { color: #342a23; font-size: 36rpx; font-weight: 900; line-height: 1.15; }
.navbar-subtitle { color: #b9a89a; font-size: 22rpx; font-weight: 700; }
</style>
