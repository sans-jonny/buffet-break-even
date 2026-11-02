<template>
  <view :class="{'preview-mode': isPreview}" class="menu-page">
    <app-navbar :subtitle="isPreview ? '仅供浏览，不能添加或下单' : ''" :title="isPreview ? '菜单预览' : '菜单'" centered
                fallback @back="goBack" @fallback="returnToSetup"/>
    <view v-if="!isPreview" class="progress-area">
      <view v-if="submissionPending" class="submission-recovery">
        <text>上次提交结果待核对，请先核对房间记录，避免重复点菜。</text>
        <button :disabled="sessions.loading" @tap="recoverSubmission">核对房间记录并恢复</button>
        <button :disabled="sessions.loading" @tap="returnToSetup">退出房间</button>
      </view>
      <progress-panel :editable="!isPreview && (!hasRoom || room.hostId === dining.identityData?.id)" :percent="percent"
                      :target="ticketPrice"
                      :tips="progressTips" :value="displayValue" @edit-price="editPrice">
        <template #before-tip>
          <view v-if="hasRoom">
            <room-team :member-id="dining.identityData?.id || ''" :room="room" :busy="collaboration.loading" @select-member="transferHost"/>
          </view>
        </template>
      </progress-panel>
    </view>

    <scroll-view v-if="!isPreview" :scroll-x="true" :show-scrollbar="false" class="dining-level-tabs">
      <view
          v-for="restaurant in restaurants"
          :key="restaurant.id"
          :class="{ selected: restaurantId === restaurant.id }"
          class="dining-level-tab inline-flex-center"
          @tap="selectRestaurant(restaurant.id)"
      >{{ restaurant.name }}
      </view>
    </scroll-view>


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
                      :product="product" :readonly="isPreview || submissionPending" @add="addItem"/>
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
                :can-confirm="canCommitRound"
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
import {useCollaborationStore} from '@/stores/business/useCollaborationStore'
import {useDiningStore} from '@/stores/business/useDiningStore'
import {useCatalogStore} from '@/stores/business/useCatalogStore'
import {useAccountingStore} from '@/stores/business/useAccountingStore'
import {useSessionStore} from '@/stores/business/useSessionStore'
import {useMenuPageStateStore} from '@/stores/page-state/useMenuPageStateStore'
import {PageAmount} from '@/ui/presentation/PageAmount'
import {PageSelection} from '@/ui/presentation/PageSelection'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import ProgressPanel from '@/ui/components/progress-panel/progress-panel.vue'
import RoomTeam from '@/ui/components/room-team/room-team.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import {computed, ref, watch} from 'vue'
import {onLoad, onBackPress, onShow, onHide, onUnload} from '@dcloudio/uni-app'
import {PageFeedback} from '@/ui/presentation/PageFeedback'
import {useProductImages} from '@/ui/composables/useProductImages'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'

const sessions = useSessionStore()
const productImages = useProductImages()
const menuPageState = useMenuPageStateStore()


const collaboration = useCollaborationStore()
const dining = useDiningStore()
const selectedRestaurant = computed(() => PageSelection.restaurant(dining.restaurantsData, menuPageState.selectedRestaurants[dining.sessionData?.activityId || '']))
const catalog = useCatalogStore()
const accounting = useAccountingStore()
const isPreview = ref(false)
const previewRestaurantId = ref('')
const submissionPending = computed(() => !!dining.sessionData?.roomId &&
    ['UNKNOWN_COMMIT_OUTCOME', 'SYNC_PENDING'].includes((dining.error as Error | null)?.message || ''))
const hasValidActivity = computed(() => {
  const session = dining.sessionData, activity = dining.activityData
  if (!session || !activity || activity.status === 'ABANDONED') return false
  if (activity.mode === 'SINGLE') return !session.roomId && session.scopeId === activity.id
  const room = dining.roomData, actorId = dining.identityData?.id
  return !!room && room.id === session.roomId && room.activityId === activity.id && session.scopeId === room.id &&
      room.status !== 'ABANDONED' && (room.members.some(member => member.id === actorId && member.present) ||
          (room.status === 'ENDED' && room.eligibleIds.includes(actorId || '')))
})
// 展示数据
const restaurants = computed(() => {
  return isPreview.value ? catalog.restaurants.filter(r => r.id === previewRestaurantId.value) : hasValidActivity.value ? dining.restaurantsData : []
})
const restaurantId = ref(selectedRestaurant.value)
const pageState = computed(() => menuPageState.state(JSON.stringify([
  isPreview.value ? 'preview' : dining.sessionData?.activityId || 'no-session', restaurantId.value
])))
const currentRestaurant = computed(() => restaurants.value.find(r => r.id === restaurantId.value))
const categories = computed(() => currentRestaurant.value?.categories.map(c => c.name) || [])
const activeCategory = computed({get: () => pageState.value.activeCategory, set: value => { pageState.value.activeCategory = value }})
const products = computed(() => (currentRestaurant.value?.products || []).map(p => ({
  id: p.id,
  name: p.name,
  price: p.priceMinor / 100,
  coverUrl: currentRestaurant.value ? productImages.cover(currentRestaurant.value, p.id,
      isPreview.value ? undefined : dining.sessionData?.roomId || undefined) : '',
  category: currentRestaurant.value?.categories.find(c => c.id === p.categoryId)?.name || '',
  level: currentRestaurant.value?.name || '',
  emoji: '🍽️',
  gradient: 'linear-gradient(145deg,#fff0d5,#ffdfbd)',
  unit: '份'
})))
const filteredProducts = computed(() => products.value.filter(p => !activeCategory.value || p.category === activeCategory.value))
const consumption = computed(() => {
  if (isPreview.value || !hasValidActivity.value || !currentRestaurant.value) return undefined
  const activityId = dining.sessionData?.activityId
  return activityId ? accounting.consumption(activityId, currentRestaurant.value.id) : undefined
})
const selected = computed(() => consumption.value?.rounds.find(r => r.status === 'ACTIVE')?.items || {})
const selectedLines = computed(() => products.value.filter(p => selected.value[p.id]).map(product => ({
  product,
  count: selected.value[product.id]
})))
const totalSelectedCount = computed(() => Object.values(selected.value).reduce((a, b) => a + b, 0))
const displayValue = computed(() => {
  if (isPreview.value || !hasValidActivity.value || !currentRestaurant.value) return 0
  return dining.preview(restaurantId.value).foodValueMinor / 100
})
const ticketPrice = computed(() => {
  return (dining.activityData?.ticketPriceMinor || 0) / 100
})
const percent = computed(() => ticketPrice.value ? displayValue.value / ticketPrice.value * 100 : 0)
const currentRoundValue = computed(() => selectedLines.value.reduce((sum, l) => sum + l.product.price * l.count, 0))
const rounds = computed(() => consumption.value?.rounds || [])
const hasRoom = computed(() => {
  return !!dining.roomData
})
const room = computed(() => {
  const r = dining.roomData;
  return r ? {...r, members: r.members.filter(m => m.present)} : {code: '', hostId: null, status: '', members: []}
})
const canEditRoom = computed(() => !hasRoom.value || !!room.value.members.find(m => m.id === dining.identityData?.id && m.online))
const canCommitRound = computed(() => !isPreview.value && !submissionPending.value && (!hasRoom.value ||
    (room.value.status === 'ACTIVE' && room.value.hostId === dining.identityData?.id && canEditRoom.value)))
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

const editingPrice = computed({get: () => pageState.value.editingPrice, set: value => { pageState.value.editingPrice = value }})
const priceInput = computed({get: () => pageState.value.priceInput, set: value => { pageState.value.priceInput = value }})
const showCart = computed({get: () => pageState.value.showCart, set: value => { pageState.value.showCart = value }})

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const menuVisible = ref(false)
let redirectedActivity = ''
const stopEndedRedirect = watch(() => {
  if (!menuVisible.value || isPreview.value) return ''
  if (navigation.isNavigating?.()) return ''
  const pages = getCurrentPages(), current = pages[pages.length - 1]
  if (current?.route && current.route.replace(/^\//, '') !== 'pages/menu/index') return ''
  const activity = dining.activityData
  if (!hasValidActivity.value || !activity) return 'setup'
  return activity.status === 'ENDED' ? `result:${activity.id}` : ''
}, target => {
  if (!target || redirectedActivity === target) return
  redirectedActivity = target
  showCart.value = false
  const redirect = target === 'setup' ? navigation.open('setup', 'replace') : navigation.toResult(undefined, 'replace')
  void redirect.catch(error => {
    redirectedActivity = ''
    PageFeedback.report(error)
  })
})

const openOrderSlip = () => {
  if (!canCommitRound.value || !selectedLines.value.length) return
  showCart.value = false
  return navigateAway(() => navigation.toOrderSlip())
}

async function navigateAway(action: () => Promise<void>) {
  // Stop route guards before cleanup changes the session; onHide can arrive later.
  menuVisible.value = false
  try {
    await action()
  } catch (error) {
    menuVisible.value = true
    throw error
  }
}

const finish = () => {
  menuPageState.selectedRestaurants[dining.sessionData?.activityId || ''] = restaurantId.value
  return navigateAway(() => navigation.toResult())
}

const openTab = (tab: 'menu' | 'mine') => {
  if (tab === 'menu') return
  return navigateAway(async () => {
    await sessions.exitMenu()
    await navigation.open(tab, 'replace')
  })
}

const returnToSetup = () => navigateAway(async () => {
  if (!isPreview.value) await sessions.exitMenu()
  await navigation.open('setup', 'reset')
})

const goBack = () => navigateAway(async () => {
  if (!isPreview.value) await sessions.exitMenu()
  await navigation.back(isPreview.value ? 'creator' : 'setup')
})

onBackPress(event => {
  if (isPreview.value || event.from === 'navigateBack') return false
  if (navigation.isNavigating?.()) return true
  void goBack().catch(PageFeedback.report)
  return true
})
onShow(() => { showCart.value = false; menuVisible.value = true })
onHide(() => { menuVisible.value = false; redirectedActivity = '' })
onUnload(() => { menuVisible.value = false; stopEndedRedirect() })

// UI 交互方法
function editPrice() {
  priceInput.value = String(ticketPrice.value);
  editingPrice.value = true
}

function selectRestaurant(id: string) {
  if (isPreview.value || !restaurants.value.some(r => r.id === id)) return
  restaurantId.value = id;
  if (!isPreview.value) menuPageState.selectedRestaurants[dining.sessionData?.activityId || ''] = id
  activeCategory.value = '';
  showCart.value = false
}

function selectCategory(category: string) {
  activeCategory.value = activeCategory.value === category ? '' : category
}

// 业务操作
async function savePrice() {
  await dining.paying(PageAmount.minor(priceInput.value))
  editingPrice.value = false
}

async function addItem(id: string) {
  if (isPreview.value || submissionPending.value) return
  await editItem(() => dining.edit(restaurantId.value, 'add', id))
}

async function removeItem(id: string) {
  if (submissionPending.value) return
  await editItem(() => dining.edit(restaurantId.value, 'reduce', id))
}

async function editItem(action: () => Promise<unknown>) {
  try { await action() } catch (error) {
    if (!['UNKNOWN_COMMIT_OUTCOME', 'SYNC_PENDING'].includes((error as Error).message)) throw error
    PageFeedback.report(error)
  }
}

async function recoverSubmission() {
  await sessions.acknowledgeSubmission()
  dining.dismissError()
  uni.showToast({title: '已核对房间记录，请确认数量后继续', icon: 'none'})
}

async function transferHost(member: { id: string }) {
  await collaboration.transfer(member.id)
}

// 生命周期与动画监听
onLoad(async query => {
  previewRestaurantId.value = query?.previewId || ''
  isPreview.value = Boolean(query?.previewId)
  restaurantId.value = query?.previewId || selectedRestaurant.value
  menuVisible.value = true
})
</script>

<style scoped>
.submission-recovery {padding:20rpx;border-radius:20rpx;background:#fff0d5;color:#946511;font-size:25rpx}
.submission-recovery button {margin-top:12rpx;font-size:25rpx}
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
