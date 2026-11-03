<template>
  <view :class="{'preview-mode': isPreview}" class="menu-page">
    <query-feedback :loading="queryFetching" :error="queryError" @refresh="refreshQueries"/>
    <app-navbar :subtitle="isPreview ? '仅供浏览，不能添加或下单' : ''" :title="isPreview ? '菜单预览' : '菜单'" centered
                fallback @back="goBack" @fallback="returnToSetup"/>
    <view v-if="!isPreview" class="progress-area">
      <view v-if="submissionPending" class="submission-recovery">
        <text>上次提交结果待核对，请先核对房间记录，避免重复点菜。</text>
        <button :disabled="sessionsLoading" @tap="recoverSubmission">核对房间记录并恢复</button>
        <button :disabled="sessionsLoading" @tap="returnToSetup">退出房间</button>
      </view>
      <progress-panel :editable="!isPreview && (!hasRoom || room.hostId === diningIdentityData?.id)" :percent="percent"
                      :target="ticketPrice"
                      :tips="progressTips" :value="displayValue" @edit-price="editPrice">
        <template #before-tip>
          <view v-if="hasRoom">
            <room-team :member-id="diningIdentityData?.id || ''" :room="room" :busy="collaborationLoading" @select-member="transferHost"/>
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
import QueryFeedback from '@/ui/components/query-feedback/query-feedback.vue'
import {SessionPageStateStore} from '@/stores/page-state/SessionPageStateStore'
import {useScope} from '@/ui/useScope'
import {ReactiveQueryFacade} from '@/infrastructure/query/ReactiveQueryFacade'
import {DiningQueries} from '@/infrastructure/query/DiningQueries'
import {readonly} from 'vue'
import {CommandState} from '@/stores/CommandState'
import {ExitDiningSessionUseCase} from '@/coordination/application/port/in/session/ExitDiningSessionUseCase'
import {AcknowledgeDiningSubmissionUseCase} from '@/coordination/application/port/in/session/AcknowledgeDiningSubmissionUseCase'
import {Dining} from '@/coordination/application/dto/Dining'
import {DiningSelectionPendingError} from '@/coordination/application/service/DiningSelectionPendingError'
import {TransferDiningHostUseCase} from '@/coordination/application/port/in/room/TransferDiningHostUseCase'
import {IncreaseDiningProductUseCase} from '@/coordination/application/port/in/dining/IncreaseDiningProductUseCase'
import {DecreaseDiningProductUseCase} from '@/coordination/application/port/in/dining/DecreaseDiningProductUseCase'
import {RemoveDiningProductUseCase} from '@/coordination/application/port/in/dining/RemoveDiningProductUseCase'
import {ClearDiningRoundUseCase} from '@/coordination/application/port/in/dining/ClearDiningRoundUseCase'
import {ChangeDiningTicketPriceUseCase} from '@/coordination/application/port/in/dining/ChangeDiningTicketPriceUseCase'
import {MenuPageStateStore} from '@/stores/page-state/MenuPageStateStore'
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

const scope = useScope()
const queries = scope.resolve(ReactiveQueryFacade.token)
const queryReady = ref(false)
const personalQuery = queries.bind(DiningQueries.Personal, () => ({}))
const activitiesQuery = queries.bind(DiningQueries.Activities, () => ({}))
const roomsQuery = queries.bind(DiningQueries.Rooms, () => ({}))
const restaurantsQuery = queries.bind(DiningQueries.Restaurants, () => ({scopeId: queryReady.value && isPreview.value ? 'local' : personalQuery.data.value?.session?.roomId || 'local'}))
const consumptionQuery = queries.bind(DiningQueries.Consumption, () => {
 if (!queryReady.value) return undefined
 const session = personalQuery.data.value?.session, selectedId = restaurantId.value
 return session && selectedId ? {activityId: session.activityId, restaurantId: selectedId} : undefined
})
const resultQuery = queries.bind(DiningQueries.Result, () => {
 if (!queryReady.value) return undefined
 const {session, identity: actor} = (personalQuery.data.value || {identity: undefined, session: undefined}), selectedId = restaurantId.value
 return session && actor && selectedId ? {session, actor, restaurantId: selectedId} : undefined
})
const queryFetching = computed(() => [personalQuery, activitiesQuery, roomsQuery, restaurantsQuery, consumptionQuery, resultQuery].some(q => q.isFetching.value))
const queryError = computed(() => [personalQuery, activitiesQuery, roomsQuery, restaurantsQuery, consumptionQuery, resultQuery].find(q => q.error.value)?.error.value)

const sessionsExitDiningSession = scope.resolve(ExitDiningSessionUseCase.token);
const sessionsAcknowledgeDiningSubmission = scope.resolve(AcknowledgeDiningSubmissionUseCase.token);
const sessionsCommands = CommandState.create();
const sessionPageState = scope.resolve(SessionPageStateStore.token);
const sessionsPendingSelection = computed({get: () => sessionPageState.pendingSelection, set: value => { sessionPageState.pendingSelection = value; }});
async function sessionsCommand<T>(work: () => Promise<T>): Promise<T> {
    return sessionsCommands.run(async () => {
        try {
            return await work();
        }
        catch (error) {
            if (error instanceof DiningSelectionPendingError)
                sessionsPendingSelection.value = error.session;
            throw error;
        }
    });
}
function sessionsTransition<T>(work: () => Promise<T>): Promise<T> {
    return sessionsCommand(async () => { const response = await work(); sessionsPendingSelection.value = undefined; return response; });
}
const sessionsLoading = sessionsCommands.loading;
const sessionsExitMenu = () => sessionsTransition(() => sessionsExitDiningSession.execute(new ExitDiningSessionUseCase.Request()));
const sessionsAcknowledgeSubmission = () => sessionsCommand(() => sessionsAcknowledgeDiningSubmission.execute(new AcknowledgeDiningSubmissionUseCase.Request()));
const productImages = useProductImages()
const menuPageState = scope.resolve(MenuPageStateStore.token)

const collaborationTransferPort = scope.resolve(TransferDiningHostUseCase.token);
const collaborationCommands = CommandState.create();
const collaborationCurrent = () => {
    const { session, identity } = (personalQuery.data.value || {identity: undefined, session: undefined});

    return { session: session!, actorId: identity?.id! };
};
const collaborationLoading = collaborationCommands.loading;
const collaborationTransfer = (targetId: string) => collaborationCommands.run(() => {
    const { session, actorId } = collaborationCurrent();
    return collaborationTransferPort.execute(new TransferDiningHostUseCase.Request(session, actorId, targetId));
});
const diningIncreaseDiningProduct = scope.resolve(IncreaseDiningProductUseCase.token);
const diningDecreaseDiningProduct = scope.resolve(DecreaseDiningProductUseCase.token);
const diningRemoveDiningProduct = scope.resolve(RemoveDiningProductUseCase.token);
const diningClearDiningRound = scope.resolve(ClearDiningRoundUseCase.token);
const diningChangeDiningTicketPrice = scope.resolve(ChangeDiningTicketPriceUseCase.token);
const diningCommands = CommandState.create();
const diningCommand = diningCommands.run;
function diningIdentity(): Dining.Identity { return personalQuery.data.value?.identity!; }
function diningSession(): Dining.Session | undefined { return personalQuery.data.value?.session; }
function diningRestaurants(): Dining.Restaurant[] {
    const ids = diningActivity()?.restaurantIds;
    return ids ? (restaurantsQuery.data.value?.value || []).filter(a => !a.deleted && ids.includes(a.id)) : [];
}
function diningActivity() {
    return (activitiesQuery.data.value?.value || []).find(a => a.id === diningSession()?.activityId);
}
function diningRoom() {
    return (roomsQuery.data.value?.value || []).find(a => a.id === diningSession()?.roomId);
}
async function diningEditWork(restaurantId: string, action: 'add' | 'reduce' | 'remove' | 'clear', productId = '', quantity = 1) {
    const s = diningCurrent(), actor = diningIdentity()?.id!;
    if (action === 'add')
        return await diningIncreaseDiningProduct.execute(new IncreaseDiningProductUseCase.Request(s, actor, restaurantId, productId, quantity));
    else if (action === 'reduce')
        return await diningDecreaseDiningProduct.execute(new DecreaseDiningProductUseCase.Request(s, actor, restaurantId, productId, quantity));
    else if (action === 'remove')
        return await diningRemoveDiningProduct.execute(new RemoveDiningProductUseCase.Request(s, actor, restaurantId, productId));
    else
        return await diningClearDiningRound.execute(new ClearDiningRoundUseCase.Request(s, actor, restaurantId));
}
async function diningPayingWork(total: number) {
    return await diningChangeDiningTicketPrice.execute(new ChangeDiningTicketPriceUseCase.Request(diningCurrent(), diningIdentity()?.id!, total));
}
function diningPreview(id: string): Dining.Result | undefined {
    return resultQuery.data.value?.value;
}
function diningCurrent(): Dining.Session {
    const s = diningSession();
    return s!;
}
const diningError = computed(() => diningCommands.error.value ?? queryError.value);
const diningDismissError = diningCommands.clearError;
const diningIdentityData = computed(diningIdentity);
const diningSessionData = computed(diningSession);
const diningRestaurantsData = computed(() => readonly(diningRestaurants()));
const diningActivityData = computed(diningActivity);
const diningRoomData = computed(diningRoom);
const diningEdit = (...args: Parameters<typeof diningEditWork>) => diningCommand(() => diningEditWork(...args));
const diningPaying = (...args: Parameters<typeof diningPayingWork>) => diningCommand(() => diningPayingWork(...args));
const selectedRestaurant = computed(() => PageSelection.restaurant(diningRestaurantsData.value, menuPageState.selectedRestaurants[diningSessionData.value?.activityId || '']))

const catalogRestaurants = computed(() => readonly((restaurantsQuery.data.value?.value || []).filter(r => !r.deleted)));

const accountingConsumption = (activityId: string, restaurantId: string) => consumptionQuery.data.value?.value;
const isPreview = ref(false)
const previewRestaurantId = ref('')
const submissionPending = computed(() => !!diningSessionData.value?.roomId &&
    ['UNKNOWN_COMMIT_OUTCOME', 'SYNC_PENDING'].includes((diningError.value as Error | null)?.message || ''))
const hasValidActivity = computed(() => {
  const session = diningSessionData.value, activity = diningActivityData.value
  if (!session || !activity || activity.status === 'ABANDONED') return false
  if (activity.mode === 'SINGLE') return !session.roomId && session.scopeId === activity.id
  const activeRoom = diningRoomData.value, actorId = diningIdentityData.value?.id
  return !!activeRoom && activeRoom.id === session.roomId && activeRoom.activityId === activity.id && session.scopeId === activeRoom.id &&
      activeRoom.status !== 'ABANDONED' && (activeRoom.members.some(member => member.id === actorId && member.present) ||
          (activeRoom.status === 'ENDED' && activeRoom.eligibleIds.includes(actorId || '')))
})
// 展示数据
const restaurants = computed(() => {
  return isPreview.value ? catalogRestaurants.value.filter(r => r.id === previewRestaurantId.value) : hasValidActivity.value ? diningRestaurantsData.value : []
})
const restaurantId = ref(selectedRestaurant.value)
const pageState = computed(() => menuPageState.state(JSON.stringify([
  isPreview.value ? 'preview' : diningSessionData.value?.activityId || 'no-session', restaurantId.value
])))
const currentRestaurant = computed(() => restaurants.value.find(r => r.id === restaurantId.value))
const categories = computed(() => currentRestaurant.value?.categories.map(c => c.name) || [])
const activeCategory = computed({get: () => pageState.value.activeCategory, set: value => { pageState.value.activeCategory = value }})
const products = computed(() => (currentRestaurant.value?.products || []).map(p => ({
  id: p.id,
  name: p.name,
  price: p.priceMinor / 100,
  coverUrl: currentRestaurant.value ? productImages.cover(currentRestaurant.value, p.id,
      isPreview.value ? undefined : diningSessionData.value?.roomId || undefined) : '',
  category: currentRestaurant.value?.categories.find(c => c.id === p.categoryId)?.name || '',
  level: currentRestaurant.value?.name || '',
  emoji: currentRestaurant.value ? productImages.emoji(currentRestaurant.value, p.id) : '🍽️',
  gradient: 'linear-gradient(145deg,#fff0d5,#ffdfbd)',
  unit: '份'
})))
const filteredProducts = computed(() => products.value.filter(p => !activeCategory.value || p.category === activeCategory.value))
const consumption = computed(() => {
  if (isPreview.value || !hasValidActivity.value || !currentRestaurant.value) return undefined
  const activityId = diningSessionData.value?.activityId
  return activityId ? accountingConsumption(activityId, currentRestaurant.value.id) : undefined
})
const selected = computed(() => consumption.value?.rounds.find(r => r.status === 'ACTIVE')?.items || {})
const selectedLines = computed(() => products.value.filter(p => selected.value[p.id]).map(product => ({
  product,
  count: selected.value[product.id]
})))
const totalSelectedCount = computed(() => Object.values(selected.value).reduce((a, b) => a + b, 0))
const displayValue = computed(() => {
  if (isPreview.value || !hasValidActivity.value || !currentRestaurant.value) return 0
  return (diningPreview(restaurantId.value)?.foodValueMinor || 0) / 100
})
const ticketPrice = computed(() => {
  return (diningActivityData.value?.ticketPriceMinor || 0) / 100
})
const percent = computed(() => ticketPrice.value ? displayValue.value / ticketPrice.value * 100 : 0)
const currentRoundValue = computed(() => selectedLines.value.reduce((sum, l) => sum + l.product.price * l.count, 0))
const rounds = computed(() => consumption.value?.rounds || [])
const hasRoom = computed(() => {
  return !!diningRoomData.value
})
const room = computed(() => {
  const r = diningRoomData.value;
  return r ? {...r, members: r.members.filter(m => m.present)} : {code: '', hostId: null, status: '', members: []}
})
const canEditRoom = computed(() => !hasRoom.value || !!room.value.members.find(m => m.id === diningIdentityData.value?.id && m.online))
const canCommitRound = computed(() => !isPreview.value && !submissionPending.value && (!hasRoom.value ||
    (room.value.status === 'ACTIVE' && room.value.hostId === diningIdentityData.value?.id && canEditRoom.value)))
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
  const activity = diningActivityData.value
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
  menuPageState.selectedRestaurants[diningSessionData.value?.activityId || ''] = restaurantId.value
  return navigateAway(() => navigation.toResult())
}

const openTab = (tab: 'menu' | 'mine') => {
  if (tab === 'menu') return
  return navigateAway(() => navigation.open(tab, 'replace'))
}

const returnToSetup = () => navigateAway(async () => {
  if (!isPreview.value) await sessionsExitMenu()
  await navigation.open('setup', 'reset')
})

const goBack = () => navigateAway(async () => {
  if (!isPreview.value) await sessionsExitMenu()
  await navigation.back(isPreview.value ? 'creator' : 'setup')
})

onBackPress(event => {
  if (isPreview.value) return false
  if (event.from === 'navigateBack' && navigation.isNavigating?.()) return false
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
  if (!isPreview.value) menuPageState.selectedRestaurants[diningSessionData.value?.activityId || ''] = id
  activeCategory.value = '';
  showCart.value = false
}

function selectCategory(category: string) {
  activeCategory.value = activeCategory.value === category ? '' : category
}

// 业务操作
async function savePrice() {
  await diningPaying(PageAmount.minor(priceInput.value))
  editingPrice.value = false
}

async function addItem(id: string) {
  if (isPreview.value || submissionPending.value) return
  await editItem(() => diningEdit(restaurantId.value, 'add', id))
}

async function removeItem(id: string) {
  if (submissionPending.value) return
  await editItem(() => diningEdit(restaurantId.value, 'reduce', id))
}

async function editItem(action: () => Promise<unknown>) {
  try { await action() } catch (error) {
    if (!['UNKNOWN_COMMIT_OUTCOME', 'SYNC_PENDING'].includes((error as Error).message)) throw error
    PageFeedback.report(error)
  }
}

async function recoverSubmission() {
  await sessionsAcknowledgeSubmission()
  diningDismissError()
  uni.showToast({title: '已核对房间记录，请确认数量后继续', icon: 'none'})
}

async function transferHost(member: { id: string }) {
  await collaborationTransfer(member.id)
}

// 生命周期与动画监听
onLoad(async query => {
  previewRestaurantId.value = query?.previewId || ''
  isPreview.value = Boolean(query?.previewId)
  restaurantId.value = query?.previewId || selectedRestaurant.value
  menuVisible.value = true
})

async function refreshQueries() { await Promise.all([personalQuery, activitiesQuery, roomsQuery, restaurantsQuery, consumptionQuery, resultQuery].map(query => query.refresh())) }
queryReady.value = true
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
