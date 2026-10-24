<template>
  <view class="app-navbar" :class="{'is-inset': inset, 'is-centered': centered}" :style="navbarStyle">
    <view class="navbar-content" :style="contentStyle">
      <button v-if="canGoBack" class="back-button flex-center" :hover-stay-time="0" aria-label="返回" @tap="handleBack">
        <text class="iconfont icon-fanhui"/>
      </button>
      <view class="title-copy">
        <text class="navbar-title" :style="{color: titleColor}">{{ title }}</text>
        <text v-if="subtitle" class="navbar-subtitle" :style="{color: subtitleColor}">{{ subtitle }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
export default {options: {virtualHost: true}}
</script>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'

const props = withDefaults(defineProps<{
  title?: string
  subtitle?: string
  titleColor?: string
  subtitleColor?: string
  /** 主副标题相对导航栏整体居中，同时避让返回键和微信胶囊。 */
  centered?: boolean
  /** 为有明确返回目标的根页面显示返回键；默认根据页面栈判断。 */
  showBack?: boolean
  /** 无上一级时显示返回键，并触发 fallback 事件，由页面指定返回目标。 */
  fallback?: boolean
  /** The parent page already provides horizontal gutters. */
  inset?: boolean
}>(), {
  title: '',
  subtitle: '',
  titleColor: '#342a23',
  subtitleColor: '#b9a89a',
  centered: false,
  showBack: undefined,
  fallback: false,
  inset: false
})

const hasPreviousPage = ref(false)
const canGoBack = computed(() => props.showBack ?? (hasPreviousPage.value || props.fallback))
function updateBackVisibility() {
  hasPreviousPage.value = typeof getCurrentPages === 'function' && getCurrentPages().length > 1
}
updateBackVisibility()
onMounted(updateBackVisibility)
onShow(updateBackVisibility)

const systemInfo = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
const statusBarHeight = systemInfo.statusBarHeight || 0
const menuButton = typeof uni.getMenuButtonBoundingClientRect === 'function'
    ? uni.getMenuButtonBoundingClientRect()
    : null
const rightGuard = menuButton && menuButton.left
    ? Math.max((systemInfo.windowWidth || systemInfo.screenWidth) - menuButton.left + 8, 24)
    : 24
const navbarStyle = {paddingTop: `${statusBarHeight}px`}
const contentStyle = computed(() => ({
  paddingRight: `${rightGuard}px`,
  '--navbar-center-guard': canGoBack.value ? `max(${rightGuard}px, 120rpx)` : `${rightGuard}px`
}))

const emit = defineEmits<{ (event: 'back'): void; (event: 'fallback'): void }>()
function handleBack() {
  updateBackVisibility()
  if (!hasPreviousPage.value && props.fallback) emit('fallback')
  else emit('back')
}
</script>

<style scoped>
.app-navbar {
  flex: 0 0 auto;
  box-sizing: border-box;
}

.navbar-content {
  position: relative;
  min-height: 120rpx;
  padding-left: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-sizing: border-box;
}

.back-button {
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  line-height: 1;
  border: 0;
  width: 76rpx;
  height: 76rpx;
  --button-radius: 50%;
  background: rgba(255, 255, 255, .95);
  color: #3e352e;
  box-shadow: 0 12rpx 28rpx rgba(101, 70, 40, .1);
  font-size: 50rpx;
}

.back-button::after {border: 0}
.is-inset .navbar-content {padding-left: 0}

.title-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.is-centered .title-copy {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - var(--navbar-center-guard) - var(--navbar-center-guard));
  text-align: center;
}

.navbar-title {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.15;
}

.navbar-subtitle {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 22rpx;
  font-weight: 700;
}
</style>
