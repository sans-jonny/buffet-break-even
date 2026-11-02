<template>
  <view class="order-page">
    <query-feedback :loading="queryFetching" :error="queryError" @refresh="refreshQueries"/>
    <app-navbar centered fallback title="本轮点单" @back="goBack" @fallback="goBack"/>
    <view v-if="!hasRoom || isHost" class="notebook">
      <view class="rings">
        <view v-for="number in 9" :key="number" class="ring"/>
      </view>
      <view class="notebook-head">
        <text>Order Time（下单时间）</text>
        <text>≡🖊️</text>
      </view>
      <text class="order-time">{{ date }} {{ time }}</text>
      <view class="paper-rule"/>
      <view v-for="line in selectedLines" :key="line.product.id" class="order-line">
        <text class="order-qty">{{ line.count }}x</text>
        <text>{{ line.product.name }}</text>
        <text class="order-check">✓</text>
      </view>
      <view class="paper-rule"/>
      <text class="order-note">辛苦了！希望菜品能尽快上齐，感激不尽！ 🌟</text>
      <view v-if="!hasRoom || isHost" class="order-done flex-center" @tap="completeRound">点单完毕！</view>
      <text v-else class="order-note">只有房主可以给 Waiter 看菜单并提交本轮</text>
    </view>
  </view>
</template>

<script lang="ts" setup>
import QueryFeedback from '@/ui/components/query-feedback/query-feedback.vue'
import {useScope} from '@/ui/useScope'
import {ReactiveQueryFacade} from '@/infrastructure/query/ReactiveQueryFacade'
import {DiningQueries} from '@/infrastructure/query/DiningQueries'
import {readonly} from 'vue'
import {CommandState} from '@/stores/CommandState'
import {Dining} from '@/coordination/application/dto/Dining'
import {SubmitDiningRoundUseCase} from '@/coordination/application/port/in/dining/SubmitDiningRoundUseCase'
import {MenuPageStateStore} from '@/stores/page-state/MenuPageStateStore'
import {PageSelection} from '@/ui/presentation/PageSelection'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import {computed, ref} from 'vue'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'

const scope = useScope()
const queries = scope.resolve(ReactiveQueryFacade.token)
const queryReady = ref(false)
const personalQuery = queries.bind(DiningQueries.Personal, () => ({}))
const activitiesQuery = queries.bind(DiningQueries.Activities, () => ({}))
const roomsQuery = queries.bind(DiningQueries.Rooms, () => ({}))
const restaurantsQuery = queries.bind(DiningQueries.Restaurants, () => ({scopeId: personalQuery.data.value?.session?.roomId || 'local'}))
const consumptionQuery = queries.bind(DiningQueries.Consumption, () => {
 if (!queryReady.value) return undefined
 const session = personalQuery.data.value?.session, restaurantId = selectedRestaurant.value
 return session && restaurantId ? {activityId: session.activityId, restaurantId} : undefined
})
const queryFetching = computed(() => [personalQuery, activitiesQuery, roomsQuery, restaurantsQuery, consumptionQuery].some(q => q.isFetching.value))
const queryError = computed(() => [personalQuery, activitiesQuery, roomsQuery, restaurantsQuery, consumptionQuery].find(q => q.error.value)?.error.value)

const menuPageState = scope.resolve(MenuPageStateStore.token)

const diningSubmitDiningRound = scope.resolve(SubmitDiningRoundUseCase.token);
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
function diningConsumption(id: string) {
    const activityId = diningSession()?.activityId;
    return activityId ? consumptionQuery.data.value?.value : undefined;
}
async function diningSubmitWork(id: string) {
    return await diningSubmitDiningRound.execute(new SubmitDiningRoundUseCase.Request(diningCurrent(), diningIdentity()?.id!, id));
}
function diningCurrent(): Dining.Session {
    const s = diningSession();
    return s!;
}
const diningIdentityData = computed(diningIdentity);
const diningSessionData = computed(diningSession);
const diningRestaurantsData = computed(() => readonly(diningRestaurants()));
const diningRoomData = computed(diningRoom);
const diningSubmit = (...args: Parameters<typeof diningSubmitWork>) => diningCommand(() => diningSubmitWork(...args));
const selectedRestaurant = computed(() => PageSelection.restaurant(diningRestaurantsData.value, menuPageState.selectedRestaurants[diningSessionData.value?.activityId || '']))
// 展示数据
const selectedLines = computed(() => {
  const id = selectedRestaurant.value, restaurant = diningRestaurants().find(r => r.id === id)
  const items = diningConsumption(id)?.rounds.find(r => r.status === 'ACTIVE')?.items || {}
  return (restaurant?.products || []).filter(p => items[p.id]).map(p => ({
    product: {id: p.id, name: p.name},
    count: items[p.id]
  }))
})
const hasRoom = computed(() => {
  return !!diningRoomData.value
})
const isHost = computed(() => {
  return !diningRoomData.value || diningRoomData.value?.hostId === diningIdentityData.value?.id
})
const date = ref(new Date().toLocaleDateString()), time = ref(new Date().toLocaleTimeString())

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const goBack = () => navigation.back('menu')

// 业务操作
async function completeRound() {
  await diningSubmit(selectedRestaurant.value)
  menuPageState.state(JSON.stringify([diningSessionData.value?.activityId || 'no-session', selectedRestaurant.value])).showCart = false
  await navigation.back('menu')
}

async function refreshQueries() { await Promise.all([personalQuery, activitiesQuery, roomsQuery, restaurantsQuery, consumptionQuery].map(query => query.refresh())) }
queryReady.value = true
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  padding-bottom: 34rpx;
  background: #e9eee8;
  box-sizing: border-box;
}

.notebook {
  min-height: calc(100vh - 116rpx);
  margin: 10rpx 30rpx;
  background: #fffcf3;
  padding: 84rpx 50rpx;
  position: relative;
  box-shadow: 0 16rpx 38rpx rgba(78, 86, 73, .12);
  box-sizing: border-box;
}

.rings {
  position: absolute;
  left: 62rpx;
  right: 62rpx;
  top: -28rpx;
  display: flex;
  justify-content: space-between;
}

.ring {
  width: 16rpx;
  height: 64rpx;
  border-radius: 10rpx;
  background: linear-gradient(90deg, #c4c4c4, #fff, #bbb);
  box-shadow: 0 5rpx 0 #555;
}

.notebook-head {
  display: flex;
  justify-content: space-between;
  font-size: 38rpx;
  font-weight: 900;
}

.order-time {
  display: block;
  color: #ff6331;
  font-size: 54rpx;
  font-weight: 900;
  margin: 26rpx 0 8rpx;
}

.paper-rule {
  height: 1rpx;
  background: #e9e1d2;
  margin: 18rpx 0;
}

.order-line {
  min-height: 104rpx;
  border-bottom: 1rpx solid #f0eadf;
  display: grid;
  grid-template-columns: 90rpx 1fr 50rpx;
  align-items: center;
  font-size: 32rpx;
  font-weight: 800;
}

.order-qty {
  color: #191715;
  font-size: 36rpx;
}

.order-check {
  color: #ed7b43;
  font-size: 45rpx;
  text-align: right;
}

.order-note {
  display: block;
  text-align: center;
  color: #77716a;
  font-size: 26rpx;
  font-style: italic;
  padding: 10rpx 0 36rpx;
}

.order-done {
  width: 100%;
  height: 104rpx;
  border-radius: 44rpx;
  background: #ff6331;
  color: white;
  font-size: 32rpx;
  font-weight: 900;
}
</style>
