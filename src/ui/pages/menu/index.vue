<template>
  <view class="menu-page" :class="{'preview-mode': isPreview}">
    <app-navbar centered fallback :title="isPreview ? '菜单预览' : '菜单'" :subtitle="isPreview ? '仅供浏览，不能添加或下单' : ''" @back="goBack" @fallback="returnToSetup"/>
    <initialization-gate>
    <view v-if="!isPreview" class="progress-area">
      <progress-panel :value="diningStore.view.displayValue" :target="diningStore.view.session.ticketPrice" :percent="diningStore.view.breakEven.percent"
                      :tips="progressTips" :editable="canChangePrice" @edit-price="editPrice">
        <template #before-tip>
          <view v-if="roomStore.view.snapshot"><room-team/></view>
        </template>
      </progress-panel>
    </view>

    <scroll-view :scroll-x="true" class="dining-level-tabs" :show-scrollbar="false">
      <view
          v-for="restaurant in restaurants"
          :key="restaurant.id"
          class="dining-level-tab inline-flex-center"
          :class="{ selected: restaurantId === restaurant.id }"
          @tap="selectRestaurant(restaurant.id)"
      >{{ restaurant.name }}
      </view>
    </scroll-view>

    <view class="menu-content" :class="{'room-readonly': !isPreview && roomStore.view.snapshot && !canEditRoom}">
      <scroll-view :scroll-y="true" class="category-list" :show-scrollbar="false">
        <view v-for="category in categories" :key="category" class="category-item flex-center"
              :class="{ active: activeCategory === category }" @tap="selectCategory(category)">{{ category }}
        </view>
        <view class="category-spacer" aria-hidden="true"/>
      </scroll-view>

      <scroll-view :scroll-y="true" class="product-list" :show-scrollbar="false">
        <product-card v-for="product in filteredProducts" :key="product.id" :product="product"
                      :readonly="isPreview" :count="isPreview ? undefined : diningStore.view.session.selected[product.id]" @add="addItem"/>
        <view v-if="!filteredProducts.length" class="empty-products flex-center">
          <text>🍽️</text>
          <text>此餐厅暂无此类菜品</text>
        </view>
        <text v-if="currentRestaurant && filteredProducts.length" class="valuation-note">菜品价值为参考估值，非官方菜单及售价，仅供参考</text>
        <view class="product-spacer"/>
      </scroll-view>
    </view>

    <view v-if="!isPreview && (diningStore.view.totalSelectedCount > 0 || diningStore.view.session.rounds.length)" class="floating-actions">
      <view class="outline-action flex-center" @tap="finish">🧾 今日战果</view>
      <view class="solid-action flex-center" @tap="showCart = true">🛒 已选
        ({{ diningStore.view.totalSelectedCount }})
      </view>
    </view>

    <cart-sheet v-if="!isPreview && showCart" :lines="diningStore.view.selectedLines" :total="diningStore.view.currentRoundValue" @close="showCart = false"
                :can-confirm="canCommitRound" @add="addItem" @remove="removeItem" @confirm="openOrderSlip"/>
    <app-dialog v-if="editingPrice" title="修改门票价格" @close="editingPrice = false">
      <input v-model="priceInput" class="price-editor" type="digit" placeholder="输入门票价格" />
      <button :hover-stay-time="0" class="price-save" :disabled="savingPrice || !canChangePrice" @tap="savePrice">保存票价</button>
    </app-dialog>
    <app-tabbar v-if="!isPreview" active="menu" @select="openTab"/>
  </initialization-gate>
  </view>
</template>

<script setup lang="ts">
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import {useApplicationStore} from '@/ui/stores/useApplicationStore'
import InitializationGate from '@/ui/components/initialization-gate/initialization-gate.vue'
import {computed, ref, watch} from 'vue'
import {onLoad, onShow, onBackPress} from '@dcloudio/uni-app'
import {GetMenuInput} from '@/contexts/catalog/public'
import {ChangeSelectionInput, SelectRestaurantInput} from '@/contexts/dining/public'
import {restaurantProducts, type DiningCatalog} from '@/utils/restaurant-catalog'
import {MenuPreviewCache} from '@/ui/preview/MenuPreviewCache'
import {LoadDiningInput} from '@/contexts/dining/public'
import {productAppearance} from '@/presentation/dining/productAppearance'
import ProgressPanel from '@/ui/components/progress-panel/progress-panel.vue'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {RoomInput} from '@/contexts/dining/public'
import {useRoomStore} from '@/ui/stores/useRoomStore'
import {useActiveDining, useRoomConnection} from '@/ui/composables/useActiveDining'
import RoomTeam from '@/ui/components/room-team/room-team.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import {ChangeTicketPriceInput} from '@/contexts/dining/public'

const applicationStore = useApplicationStore()
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const previewCache = useRequired<MenuPreviewCache>(MenuPreviewCache.Token)
const isPreview = ref(false), previewCatalog = ref<DiningCatalog | null>(null), previewRestaurantId = ref('')
onLoad(query => {
  if (!query?.previewId) return
  isPreview.value = true
  void runAction(async () => {
    try {
      previewCatalog.value = previewCache.read(query.previewId!)
      previewRestaurantId.value = previewCatalog.value.restaurants[0]?.id || ''
      activeCategory.value = previewCatalog.value.restaurants[0]?.categories[0]?.name || ''
    } catch (error) {await navigation.back('creator'); throw error}
  })
})
const closePreview = () => runAction(() => navigation.back('creator'))
const returnToSetup = () => runAction(async () => {
  if (roomStore.view.snapshot) await roomInput.execute({command:'suspend',params:{}})
  await navigation.open('setup','reset')
})
const goBack = () => {
  if (isPreview.value) return closePreview()
  if (roomStore.view.snapshot) return returnToSetup()
  return runAction(() => navigation.back('setup'))
}
const diningStore = useActiveDining()
const roomStore = useRoomStore()
const roomInput = useRequired<RoomInput>(RoomInput.Token)
onBackPress(() => {
  if (isPreview.value || !roomStore.view.snapshot) return false
  void goBack()
  return true
})
const restoreRoom = useRoomConnection()
const canEditRoom = computed(() => roomStore.view.status === 'online' && !roomStore.view.busy && roomStore.view.snapshot?.status === 'active')
const isHost = computed(() => roomStore.view.snapshot?.hostId === roomStore.view.memberId)
const canCommitRound = computed(() => !isPreview.value && (!roomStore.view.snapshot || (isHost.value && canEditRoom.value)))
const canChangePrice = computed(() => !isPreview.value && (roomStore.view.snapshot ? isHost.value && canEditRoom.value : diningStore.view.session.active))
const changePrice = useRequired<ChangeTicketPriceInput>(ChangeTicketPriceInput.Token)
const editingPrice = ref(false), priceInput = ref(''), savingPrice = ref(false)
function editPrice() {if (canChangePrice.value) {priceInput.value = String(diningStore.view.session.ticketPrice); editingPrice.value = true}}
const savePrice = () => runAction(async () => {
  if (savingPrice.value || !canChangePrice.value) return
  savingPrice.value = true
  try {
    if (roomStore.view.snapshot) await roomInput.execute({command: 'setPrice', params: {ticketPrice: Number(priceInput.value), expectedRevision: roomStore.view.snapshot.revision}})
    else changePrice.execute({ticketPrice: Number(priceInput.value)})
    editingPrice.value = false
  } finally {savingPrice.value = false}
})
const getMenu = useRequired<GetMenuInput>(GetMenuInput.Token)
const changeSelection = useRequired<ChangeSelectionInput>(ChangeSelectionInput.Token)
const load = useRequired<LoadDiningInput>(LoadDiningInput.Token)
const selectRestaurantInput = useRequired<SelectRestaurantInput>(SelectRestaurantInput.Token)
const initialMenu = getMenu.execute({category: '', levels: []})
const catalog = computed(() => isPreview.value ? previewCatalog.value : diningStore.view.session.catalog)
const restaurantId = computed(() => isPreview.value ? previewRestaurantId.value : diningStore.view.session.restaurantId || '')
const restaurants = computed(() => catalog.value?.restaurants || [])
const currentRestaurant = computed(() => restaurants.value.find(r => r.id === restaurantId.value))
const categories = computed(() => currentRestaurant.value?.categories.map(c => c.name) || (isPreview.value ? [] : initialMenu.categories))
const activeCategory = ref(categories.value[0] || '')
const filteredProducts = computed(() => (currentRestaurant.value ? restaurantProducts(currentRestaurant.value).filter(p => p.category === activeCategory.value) : isPreview.value ? [] : getMenu.execute({category: activeCategory.value, levels: []}).products)
  .map(product => ({...product, ...productAppearance(product.id), emoji: ('emoji' in product && product.emoji as string) || productAppearance(product.id).emoji})))
const selectCategory = (category: string) => {activeCategory.value = category}
function selectRestaurant(id: string) {
  if (isPreview.value) {previewRestaurantId.value = id; activeCategory.value = categories.value[0] || ''; return}
  void runAction(async () => {
    if (roomStore.view.snapshot) await roomInput.execute({command: 'selectRestaurant', params: {restaurantId: id}})
    else selectRestaurantInput.execute({restaurantId: id})
    activeCategory.value = categories.value[0] || ''
    showCart.value = false
  })
}
watch(restaurantId, () => {activeCategory.value = categories.value[0] || ''})
const showCart = ref(false)
const progressTips = [
  {progress: 0, text: '✈ 刚开始，大胆点！', color: '#9f9b97'},
  {progress: 1, text: 'ϟ 快了快了，再来一波！', color: '#f09c22'},
  {progress: 50, text: '🔥 胜利就在眼前！', color: '#ff7439'},
  {progress: 100, text: '🎉 已经回本，继续快乐！', color: '#35a86b'}
]
function changeItem(productId: string, change: 1 | -1) {
  if (isPreview.value) return
  return runAction(() => {
    if (roomStore.view.snapshot) {
      if (!canEditRoom.value) throw new Error('请等待房间同步完成后再操作')
      return roomInput.execute({command: 'changeSelection', params: {productId, change, restaurantId: restaurantId.value}})
    }
    changeSelection.execute({productId, change})
  })
}
const addItem = (productId: string) => changeItem(productId, 1)
const removeItem = (productId: string) => changeItem(productId, -1)
function checkDining() {
  if (isPreview.value || !applicationStore.ready) return
  return runAction(async () => {
    try {await restoreRoom()} catch (error) {if (!roomStore.view.snapshot) throw error}
    if (roomStore.view.snapshot) {
      return
    }
    load.execute({})
    if (!diningStore.view.session.active) await navigation.open('setup', 'reset')
  })
}
onShow(() => {void checkDining()})
watch(() => applicationStore.ready, initialized => { if (initialized) void checkDining() })

function openOrderSlip() {
  if (isPreview.value) return
  if (!canCommitRound.value) {uni.showToast({title: '只有房主可以给 Waiter 看菜单并提交本轮', icon: 'none'}); return}
  if (!diningStore.view.selectedLines.length) return
  showCart.value = false
  void runAction(() => navigation.toOrderSlip())
}

function finish() {
  if (isPreview.value) return
  if (!diningStore.view.canFinish) {
    uni.showToast({title: '先点一些菜吧', icon: 'none'});
    return
  }
  void runAction(() => navigation.toResult())
}

const openTab = (tab: 'menu' | 'mine') => runAction(() => navigation.open(tab, 'replace'))
</script>

<style scoped>
.menu-page.preview-mode {padding-bottom:0}
.valuation-note {display:block;font-size:22rpx;line-height:1.6;color:#c1bcb6;padding:4rpx 12rpx 16rpx;text-align:center}
.price-editor {height:100rpx;padding:0 24rpx;background:white;border:3rpx solid #eadabd;border-radius:24rpx;font-size:36rpx}
.price-save,.price-save[disabled] {margin-top:28rpx;background:#ff6331;color:white;--button-radius:24rpx;font-size:30rpx}
.room-readonly {opacity:.65;pointer-events:none}
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
