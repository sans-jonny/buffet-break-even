<template>
  <view class="app-tabbar">
    <view class="tab-item flex-center" :class="{ active: active === 'review' }" @tap="reviewSoon">测评</view>
    <navigator class="tab-item flex-center" :class="{ active: active === 'menu' }" url="/pages/menu/index" open-type="redirect">菜单</navigator>
    <navigator class="tab-item flex-center" :class="{ active: active === 'mine' }" url="/pages/mine/index" open-type="redirect">我的</navigator>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ active?: 'review' | 'menu' | 'mine' }>(), { active: 'menu' })

function reviewSoon() {
  uni.showToast({ title: '测评功能即将开放', icon: 'none' })
}
</script>

<style scoped>
.app-tabbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; height: calc(104rpx + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); display: flex; background: rgba(255,255,255,.97); border-top: 1rpx solid #eee9e4; box-sizing: border-box; }
.tab-item { flex: 1; color: #aaa7a3; font-size: 28rpx; font-weight: 700; text-decoration: none; }
.tab-item.active { color: #ff6331; }
@media (min-width: 768px) { .app-tabbar { left: 50%; right: auto; width: 750px; transform: translateX(-50%); } }
</style>
