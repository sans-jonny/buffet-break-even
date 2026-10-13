<template>
  <view class="menu-page">
    <view class="progress-area">
      <progress-panel :value="displayValue" :target="session.ticketPrice" :tips="progressTips" />
    </view>

    <scroll-view scroll-x class="dining-level-tabs" :show-scrollbar="false">
      <view
        v-for="level in diningLevels"
        :key="level"
        class="dining-level-tab inline-flex-center"
        :class="{ selected: selectedDiningLevels.includes(level), wide: level === '餐券好价' }"
        @tap="toggleDiningLevel(level)"
      >{{ level }}</view>
    </scroll-view>

    <view class="menu-content">
      <scroll-view scroll-y class="category-list" :show-scrollbar="false">
        <view v-for="category in categories" :key="category" class="category-item flex-center" :class="{ active: activeCategory === category }" @tap="activeCategory = category">{{ category }}</view>
      </scroll-view>

      <scroll-view scroll-y class="product-list" :show-scrollbar="false">
        <view class="section-title"><view class="title-mark" />{{ activeCategory }}</view>
        <product-card v-for="product in filteredProducts" :key="product.id" :product="product" :count="session.selected[product.id]" @add="addItem" />
        <view v-if="!filteredProducts.length" class="empty-products flex-center"><text>🍽️</text><text>所选等级暂无此类菜品</text></view>
        <view class="product-spacer" />
      </scroll-view>
    </view>

    <view v-if="totalSelectedCount > 0 || session.rounds.length" class="floating-actions">
      <view class="outline-action flex-center" @tap="finish">🧾 今日战果</view>
      <view v-if="totalSelectedCount > 0" class="solid-action flex-center" @tap="showCart = true">🛒 已选 ({{ totalSelectedCount }})</view>
      <view v-else class="solid-action flex-center" @tap="finish">查看结果</view>
    </view>

    <cart-sheet v-if="showCart" :lines="selectedLines" :total="currentRoundValue" @close="showCart = false" @add="addItem" @remove="removeItem" @confirm="openOrderSlip" />
    <app-tabbar active="menu" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { categories, diningLevels, productsForCategory } from '@/data/menu'
import { useBuffetStore } from '@/store/buffet'
import type { DiningLevel } from '@/types/buffet'
import ProgressPanel from './components/progress-panel.vue'

const activeCategory = ref('夯品推介')
const selectedDiningLevels = ref<DiningLevel[]>([])
const showCart = ref(false)
const progressTips = [
  { progress: 0, text: '✈ 刚开始，大胆点！', color: '#9f9b97' },
  { progress: 1, text: 'ϟ 快了快了，再来一波！', color: '#f09c22' },
  { progress: 50, text: '🔥 胜利就在眼前！', color: '#ff7439' },
  { progress: 100, text: '🎉 已经回本，继续快乐！', color: '#35a86b' }
]
const store = useBuffetStore()
const { session, selectedLines, currentRoundValue, displayValue, totalSelectedCount, addItem, removeItem, beginSession } = store
const filteredProducts = computed(() => productsForCategory(activeCategory.value, selectedDiningLevels.value))

onLoad((query) => {
  const price = Number(query?.price)
  if (price > 0) beginSession(price, decodeURIComponent(query?.mode || '单人'))
})

onShow(() => {
  if (!session.active) uni.reLaunch({ url: '/pages/setup/index' })
})

function toggleDiningLevel(level: DiningLevel) {
  const index = selectedDiningLevels.value.indexOf(level)
  if (index >= 0) selectedDiningLevels.value.splice(index, 1)
  else selectedDiningLevels.value.push(level)
}

function openOrderSlip() {
  if (!selectedLines.value.length) return
  showCart.value = false
  uni.navigateTo({ url: '/pages/order-slip/index' })
}

function finish() {
  if (!session.rounds.length && !selectedLines.value.length) {
    uni.showToast({ title: '先点一些菜吧', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/result/index' })
}
</script>

<style scoped>
.menu-page { height: 100vh; height: 100svh; padding-bottom: calc(104rpx + env(safe-area-inset-bottom)); overflow: hidden; background: #fff9f2; display: flex; flex-direction: column; box-sizing: border-box; }
.progress-area { flex: 0 0 auto; }
.dining-level-tabs { width: 100%; height: 86rpx; padding: 10rpx 24rpx 14rpx; white-space: nowrap; flex: 0 0 86rpx; box-sizing: border-box; }
.dining-level-tab { height: 62rpx; min-width: 116rpx; padding: 0 30rpx; border: 2rpx solid #ff6331; color: #ff6331; border-radius: 34rpx; font-size: 27rpx; font-weight: 700; margin-right: 14rpx; box-sizing: border-box; }
.dining-level-tab.selected { background: #ff6331; color: white; box-shadow: 0 12rpx 18rpx rgba(255,98,48,.2); }
.dining-level-tab.wide { min-width: 154rpx; }
.menu-content { flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; }
.category-list { width: 168rpx; flex: 0 0 168rpx; height: 100%; background: #fffdf9; }
.category-item { height: 98rpx; font-size: 27rpx; color: #6d6965; position: relative; }
.category-item.active { background: #fff; color: #ff6432; font-weight: 900; }
.category-item.active::before { content: ''; position: absolute; left: 0; width: 8rpx; height: 56rpx; background: #ff6432; border-radius: 0 8rpx 8rpx 0; }
.product-list { flex: 1 1 auto; min-width: 0; height: 100%; padding: 0 20rpx; box-sizing: border-box; }
.section-title { height: 82rpx; display: flex; align-items: center; font-size: 31rpx; font-weight: 900; }
.title-mark { width: 8rpx; height: 34rpx; border-radius: 8rpx; background: #ff6331; margin-right: 16rpx; }
.empty-products { height: 360rpx; color: #aaa; flex-direction: column; gap: 24rpx; font-size: 27rpx; }
.empty-products text:first-child { font-size: 80rpx; }
.product-spacer { height: 184rpx; }
.floating-actions { position: fixed; left: 32rpx; right: 32rpx; bottom: calc(128rpx + env(safe-area-inset-bottom)); height: 88rpx; z-index: 60; display: flex; gap: 16rpx; }
.floating-actions > view { flex: 1; border-radius: 46rpx; font-size: 29rpx; font-weight: 900; }
.outline-action { background: white; color: #ff6331; border: 2rpx solid #ffdfbd; box-shadow: 0 12rpx 28rpx rgba(154,99,48,.08); }
.solid-action { background: #ff6331; color: white; box-shadow: 0 12rpx 28rpx rgba(255,98,48,.2); }
@media (min-width: 768px) { .floating-actions { left: 50%; right: auto; width: 686rpx; transform: translateX(-50%); } }
</style>
