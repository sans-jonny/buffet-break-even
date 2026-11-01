<template>
  <view :class="{'preview-mode': isPreview}" class="menu-page">
    <app-navbar :subtitle="isPreview ? '仅供浏览，不能添加或下单' : ''" :title="isPreview ? '菜单预览' : '菜单'" centered
                fallback @back="goBack" @fallback="returnToSetup"/>
    <view v-if="!isPreview" class="progress-area">
      <progress-panel :editable="!isPreview && (!hasRoom || room.hostId === dining.identity()?.id)" :percent="percent"
                      :target="ticketPrice"
                      :tips="progressTips" :value="displayValue" @edit-price="editPrice">
        <template #before-tip>
          <view v-if="hasRoom">
            <room-team :member-id="dining.identity()?.id || ''" :room="room" @select-member="transferHost"/>
          </view>
        </template>
      </progress-panel>
    </view>

    <scroll-view :scroll-x="true" :show-scrollbar="false" class="dining-level-tabs">
      <view
          v-for="restaurant in restaurants"
          :key="restaurant.id"
          :class="{ selected: restaurantId === restaurant.id }"
          class="dining-level-tab inline-flex-center"
          @tap="selectRestaurant(restaurant.id)"
      >{{ restaurant.name }}
      </view>
    </scroll-view>

    <view v-if="!isPreview && dining.activity()?.status === 'ACTIVE'" class="session-actions">
      <button size="mini" @tap="clearRound">清空本轮</button>
      <button v-if="!hasRoom || room.hostId === dining.identity()?.id" size="mini" @tap="abandonDining">放弃用餐
      </button>
      <button v-if="hasRoom" size="mini" @tap="leaveRoom">退出房间</button>
      <button v-if="hasRoom" size="mini" @tap="reviewSubmission">核对提交</button>
    </view>
    <app-confirm-dialog :controller="confirmation"/>

    <view :class="{'room-readonly': !isPreview && hasRoom && !canEditRoom}" class="menu-content">
      <scroll-view :scroll-y="true" :show-scrollbar="false" class="category-list">
        <view v-for="category in categories" :key="category" :class="{ active: activeCategory === category }"
              class="category-item flex-center" @tap="selectCategory(category)">{{ category }}
        </view>
        <view aria-hidden="true" class="category-spacer"/>
      </scroll-view>

      <scroll-view :scroll-y="true" :show-scrollbar="false" class="product-list">
        <product-card v-for="product in filteredProducts" :key="product.id"
                      :count="isPreview ? undefined : selected[product.id]"
                      :product="product" :readonly="isPreview" @add="addItem"/>
        <view v-if="!filteredProducts.length" class="empty-products flex-center">
          <text>🍽️</text>
          <text>此餐厅暂无此类菜品</text>
        </view>
        <text v-if="currentRestaurant && filteredProducts.length" class="valuation-note">
          菜品价值为参考估值，非官方菜单及售价，仅供参考
        </text>
        <view class="product-spacer"/>
      </scroll-view>
    </view>

    <view v-if="!isPreview && (totalSelectedCount > 0 || rounds.length)" class="floating-actions">
      <view class="outline-action flex-center" @tap="finish">🧾 今日战果</view>
      <view class="solid-action flex-center" @tap="showCart = true">🛒 已选
        ({{ totalSelectedCount }})
      </view>
    </view>

    <cart-sheet v-if="!isPreview && showCart" :lines="selectedLines" :total="currentRoundValue"
                @add="addItem"
                @close="showCart = false" @confirm="openOrderSlip" @remove="removeItem"/>
    <app-dialog v-if="editingPrice" title="修改门票价格" @close="editingPrice = false">
      <input v-model="priceInput" class="price-editor" placeholder="输入门票价格" type="digit"/>
      <button :disabled="isPreview" :hover-stay-time="0" class="price-save" @tap="savePrice">保存票价</button>
    </app-dialog>
    <app-tabbar v-if="!isPreview" active="menu" @select="openTab"/>
  </view>
</template>

<script lang="ts" setup>
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import ProgressPanel from '@/ui/components/progress-panel/progress-panel.vue'
import RoomTeam from '@/ui/components/room-team/room-team.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'
import {computed, ref, watch} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'

import {useDining} from '@/ui/useDining'
import {DiningClient} from '@/ui/DiningClient'

const client = useDining()
const dining = client.dining
const confirmation = useAppDialog()
const isPreview = ref(false)
// 展示数据
const restaurants = computed(() => {
  client.revision.value;
  return isPreview.value ? dining.localRestaurants() : dining.restaurants()
})
const restaurantId = ref(client.selectedRestaurant())
const currentRestaurant = computed(() => restaurants.value.find(r => r.id === restaurantId.value))
const categories = computed(() => currentRestaurant.value?.categories.map(c => c.name) || [])
const activeCategory = ref('')
const products = computed(() => (currentRestaurant.value?.products || []).map(p => ({
  id: p.id,
  name: p.name,
  price: p.priceMinor / 100,
  category: currentRestaurant.value?.categories.find(c => c.id === p.categoryId)?.name || '',
  level: currentRestaurant.value?.name || '',
  emoji: '🍽️',
  gradient: 'linear-gradient(145deg,#fff0d5,#ffdfbd)',
  unit: '份'
})))
const filteredProducts = computed(() => products.value.filter(p => !activeCategory.value || p.category === activeCategory.value))
const consumption = computed(() => {
  client.revision.value;
  return dining.consumption(restaurantId.value)
})
const selected = computed(() => consumption.value?.rounds.find(r => r.status === 'ACTIVE')?.items || {})
const selectedLines = computed(() => products.value.filter(p => selected.value[p.id]).map(product => ({
  product,
  count: selected.value[product.id]
})))
const totalSelectedCount = computed(() => Object.values(selected.value).reduce((a, b) => a + b, 0))
const displayValue = computed(() => {
  client.revision.value
  if (!dining.session() || !currentRestaurant.value) return 0
  return dining.preview(restaurantId.value).foodValueMinor / 100
})
const ticketPrice = computed(() => {
  client.revision.value;
  return (dining.activity()?.ticketPriceMinor || 0) / 100
})
const percent = computed(() => ticketPrice.value ? displayValue.value / ticketPrice.value * 100 : 0)
const currentRoundValue = computed(() => selectedLines.value.reduce((sum, l) => sum + l.product.price * l.count, 0))
const rounds = computed(() => consumption.value?.rounds || [])
const hasRoom = computed(() => {
  client.revision.value;
  return !!dining.room()
})
const room = computed(() => {
  client.revision.value;
  const r = dining.room();
  return r ? {...r, members: r.members.filter(m => m.present)} : {code: '', hostId: null, members: []}
})
const canEditRoom = computed(() => !hasRoom.value || !!room.value.members.find(m => m.id === dining.identity()?.id && m.online))
watch(restaurants, list => {
  if (!list.some(r => r.id === restaurantId.value)) restaurantId.value = list[0]?.id || ''
})
const progressTips = ref([
  {progress: 0, text: '✈ 刚开始，大胆点！', color: '#9f9b97'},
  {progress: 1, text: 'ϟ 快了快了，再来一波！', color: '#f09c22'},
  {progress: 50, text: '🔥 胜利就在眼前！', color: '#ff7439'},
  {progress: 100, text: '🎉 已经回本，继续快乐！', color: '#35a86b'}
])

// UI 交互状态

const editingPrice = ref(false), priceInput = ref('200'), showCart = ref(false)

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const openOrderSlip = () => navigation.toOrderSlip()

const finish = () => navigation.toResult()

const openTab = (tab: 'menu' | 'mine') => navigation.open(tab, 'replace')

const returnToSetup = () => navigation.open('setup', 'reset')

const goBack = () => navigation.back(isPreview.value ? 'creator' : 'setup')

// UI 交互方法
function editPrice() {
  priceInput.value = String(ticketPrice.value);
  editingPrice.value = true
}

function selectRestaurant(id: string) {
  restaurantId.value = id;
  void client.selectRestaurant(id).catch(DiningClient.report)
  activeCategory.value = categories.value[0] || '';
  showCart.value = false
}

function selectCategory(category: string) {
  activeCategory.value = category
}

// 业务操作
async function savePrice() {
  await dining.paying(DiningClient.minor(priceInput.value))
  editingPrice.value = false
}

async function addItem(id: string) {
  if (!isPreview.value) await dining.edit(restaurantId.value, 'add', id)
}

async function removeItem(id: string) {
  await dining.edit(restaurantId.value, 'reduce', id)
}

async function transferHost(member: { id: string }) {
  await dining.transfer(member.id)
}

function clearRound() {
  confirmation.open({
    title: '清空本轮', content: '移除本轮全部菜品，保留本轮？', success: r => {
      if (r.confirm) return dining.edit(restaurantId.value, 'clear')
    }
  })
}

function abandonDining() {
  confirmation.open({
    title: '放弃用餐', content: '放弃本次活动，不生成正式历史？', success: async r => {
      if (r.confirm) {
        await dining.abandon();
        await navigation.open('setup', 'reset')
      }
    }
  })
}

function leaveRoom() {
  confirmation.open({
    title: '退出房间', content: '退出后可凭房间码重新加入；完成前退出将失去结果领取资格。', success: async r => {
      if (r.confirm) {
        await client.leaveRoom();
        await navigation.open('setup', 'reset')
      }
    }
  })
}

function reviewSubmission() {
  confirmation.open({
    title: '核对提交结果',
    content: '先查看已同步的数量。确认已核对，后续点击将作为新的操作提交；上次结果不明的操作不会自动重发。',
    success: async r => {
      if (r.confirm) await client.acknowledgeSubmission()
    }
  })
}

// 生命周期与动画监听
onLoad(async query => {
  await client.ready
  isPreview.value = Boolean(query?.previewId)
  restaurantId.value = query?.previewId || client.selectedRestaurant()
})
</script>

<style scoped>
.session-actions {
  display: flex;
  gap: 10rpx;
  padding: 8rpx 24rpx;
  flex-shrink: 0
}

.session-actions button {
  font-size: 21rpx;
  margin: 0;
  background: #fff0dd;
  color: #9a6937
}

.menu-page.preview-mode {
  padding-bottom: 0
}

.valuation-note {
  display: block;
  font-size: 22rpx;
  line-height: 1.6;
  color: #c1bcb6;
  padding: 4rpx 12rpx 16rpx;
  text-align: center
}

.price-editor {
  height: 100rpx;
  padding: 0 24rpx;
  background: white;
  border: 3rpx solid #eadabd;
  border-radius: 24rpx;
  font-size: 36rpx
}

.price-save, .price-save[disabled] {
  margin-top: 28rpx;
  background: #ff6331;
  color: white;
  --button-radius: 24rpx;
  font-size: 30rpx
}

.room-readonly {
  opacity: .65;
  pointer-events: none
}

.menu-page {
  --menu-section-gap: 24rpx;
  --menu-gutter: 24rpx;
  --menu-tabs-height: calc(62rpx + var(--menu-section-gap) + var(--menu-section-gap));
  --app-tabbar-height: 104rpx;
  --floating-actions-height: 88rpx;
  --floating-actions-bottom-offset: 24rpx;
  --floating-actions-bottom: calc(var(--app-tabbar-height) + env(safe-area-inset-bottom) + var(--floating-actions-bottom-offset));
  height: 100vh;
  padding-bottom: calc(var(--app-tabbar-height) + env(safe-area-inset-bottom));
  overflow: hidden;
  background: #fff9f2;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

@supports (height: 100svh) {
  .menu-page {
    height: 100svh;
  }
}

.progress-area {
  flex: 0 0 auto;
}

.dining-level-tabs {
  width: 100%;
  height: var(--menu-tabs-height);
  padding: var(--menu-section-gap) var(--menu-gutter);
  white-space: nowrap;
  flex: 0 0 var(--menu-tabs-height);
  box-sizing: border-box;
}

.dining-level-tab {
  height: 62rpx;
  min-width: 116rpx;
  padding: 0 30rpx;
  border: 2rpx solid #ff6331;
  color: #ff6331;
  border-radius: 34rpx;
  font-size: 27rpx;
  font-weight: 700;
  margin-right: 14rpx;
  box-sizing: border-box;
}

.dining-level-tab.selected {
  background: #ff6331;
  color: white;
  box-shadow: 0 12rpx 18rpx rgba(255, 98, 48, .2);
}

.dining-level-tab.wide {
  min-width: 154rpx;
}

.menu-content {
  flex: 1 1 0;
  height: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.category-list {
  width: 168rpx;
  flex: 0 0 168rpx;
  height: 100%;
  background: #fffdf9;
}

.category-item {
  height: 98rpx;
  font-size: 27rpx;
  color: #6d6965;
  position: relative;
}

.category-item.active {
  background: #fff;
  color: #ff6432;
  font-weight: 900;
}

.category-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 8rpx;
  height: 56rpx;
  background: #ff6432;
  border-radius: 0 8rpx 8rpx 0;
}

.product-list {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 var(--menu-gutter);
  box-sizing: border-box;
}

.empty-products {
  height: 360rpx;
  color: #aaa;
  flex-direction: column;
  gap: 24rpx;
  font-size: 27rpx;
}

.empty-products text:first-child {
  font-size: 80rpx;
}

.product-spacer {
  height: calc(var(--floating-actions-bottom-offset) + var(--floating-actions-height));
}

.category-spacer {
  height: calc(var(--floating-actions-height) + var(--floating-actions-bottom-offset));
}

.floating-actions {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: var(--floating-actions-bottom);
  height: var(--floating-actions-height);
  z-index: 60;
  display: flex;
  gap: 16rpx;
}

.floating-actions > view {
  flex: 1;
  border-radius: 46rpx;
  font-size: 29rpx;
  font-weight: 900;
}

.outline-action {
  background: white;
  color: #ff6331;
  border: 2rpx solid #ffdfbd;
  box-shadow: 0 12rpx 28rpx rgba(154, 99, 48, .08);
}

.solid-action {
  background: #ff6331;
  color: white;
  box-shadow: 0 12rpx 28rpx rgba(255, 98, 48, .2);
}

@media (min-width: 768px) {
  .floating-actions {
    left: 50%;
    right: auto;
    width: 686rpx;
    transform: translateX(-50%);
  }
}
</style>
