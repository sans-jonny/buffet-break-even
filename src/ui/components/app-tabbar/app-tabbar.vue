<template>
  <view class="app-tabbar">
    <view :class="{ active: active === 'review' }" class="tab-item flex-center" @tap="reviewSoon">测评</view>
    <view :class="{ active: active === 'menu' }" class="tab-item flex-center" @tap="emit('select', 'menu')">菜单</view>
    <view :class="{ active: active === 'mine' }" class="tab-item flex-center" @tap="emit('select', 'mine')">我的</view>
  </view>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{ active?: 'review' | 'menu' | 'mine' }>(), {active: 'menu'})

const emit = defineEmits<{ (event: 'select', tab: 'menu' | 'mine'): void }>()

function reviewSoon() {
  uni.showToast({title: '测评功能即将开放', icon: 'none'})
}
</script>

<style scoped>
.app-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  height: calc(var(--app-tabbar-height, 104rpx) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  background: rgba(255, 255, 255, .97);
  border-top: 1rpx solid #eee9e4;
  box-sizing: border-box;
}

.tab-item {
  flex: 1;
  color: #aaa7a3;
  font-size: 28rpx;
  font-weight: 700;
  text-decoration: none;
}

.tab-item.active {
  color: #ff6331;
}

@media (min-width: 768px) {
  .app-tabbar {
    left: 50%;
    right: auto;
    width: 750px;
    transform: translateX(-50%);
  }
}
</style>
