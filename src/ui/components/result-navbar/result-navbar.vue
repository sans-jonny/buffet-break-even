<template>
  <view class="result-navbar" :style="navbarStyle">
    <view class="navbar-content" :style="contentStyle">
      <view class="back-button flex-center" @tap="emit('back')">
        <text class="iconfont icon-fanhui"/>
      </view>
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
}>(), {
  title: '今日战果',
  subtitle: '今日用餐记录'
})

const systemInfo = uni.getSystemInfoSync()
const statusBarHeight = systemInfo.statusBarHeight || 0
const menuButton = typeof uni.getMenuButtonBoundingClientRect === 'function'
    ? uni.getMenuButtonBoundingClientRect()
    : null
const rightGuard = menuButton && menuButton.left
    ? Math.max((systemInfo.windowWidth || systemInfo.screenWidth) - menuButton.left + 8, 24)
    : 24
const navbarStyle = {paddingTop: `${statusBarHeight}px`}
const contentStyle = {paddingRight: `${rightGuard}px`}

const emit = defineEmits<{ (event: 'back'): void }>()
</script>

<style scoped>
.result-navbar {
  flex: 0 0 auto;
  box-sizing: border-box;
}

.navbar-content {
  min-height: 120rpx;
  padding-left: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-sizing: border-box;
}

.back-button {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, .95);
  color: #3e352e;
  box-shadow: 0 12rpx 28rpx rgba(101, 70, 40, .1);
  font-size: 50rpx;
}

.title-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.navbar-title {
  color: #342a23;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.15;
}

.navbar-subtitle {
  color: #b9a89a;
  font-size: 22rpx;
  font-weight: 700;
}
</style>
