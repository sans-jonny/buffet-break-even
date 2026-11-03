<template>
  <view class="sub-page">
    <query-feedback :loading="queryFetching" :error="queryError" @refresh="refreshQueries"/>
    <app-navbar centered fallback title="点餐明细" @back="goBack" @fallback="goBack"/>
    <view v-if="receipt" class="detail-body">
      <records-overview :dishes="dishCount" :meals="meals" :rounds="receipt.rounds.length"/>
      <view class="detail-card">
        <view class="detail-head">
          <view>
            <text class="label-chip inline-flex-center">本餐</text>
            <text class="restaurant">{{
                restaurantTitle.formatRestaurantTitle(receipt.restaurant, receipt.typeName, receipt.isMultiplayer)
              }}
            </text>
          </view>
          <text class="record-date">{{ time.formatDateTime(receipt.date) }}</text>
        </view>
        <record-rounds :receipt="receipt"/>
        <view class="delete-record flex-center" @tap="confirmDelete">删除此餐记录</view>
      </view>
    </view>
    <view v-else class="empty-state flex-center">
      <text class="empty-icon">📋</text>
      <text>记录不存在</text>
    </view>
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>

<script lang="ts" setup>
import {time} from '@/ui/format/time'
import {restaurantTitle} from '@/ui/format/restaurantTitle'
import QueryFeedback from '@/ui/components/query-feedback/query-feedback.vue'
import {useScope} from '@/ui/useScope'
import {ReactiveQueryFacade} from '@/infrastructure/query/ReactiveQueryFacade'
import {DiningQueries} from '@/infrastructure/query/DiningQueries'
import {readonly} from 'vue'
import {CommandState} from '@/stores/CommandState'
import {DeleteDiningHistoryUseCase} from '@/coordination/application/port/in/records/DeleteDiningHistoryUseCase'
import {ReceiptView} from '@/ui/presentation/ReceiptView'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import RecordRounds from '@/ui/components/record-rounds/record-rounds.vue'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {computed, ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'

const scope = useScope()
const queries = scope.resolve(ReactiveQueryFacade.token)
const personalQuery = queries.bind(DiningQueries.Personal, () => ({}))
const activitiesQuery = queries.bind(DiningQueries.Activities, () => ({}))
const restaurantsQuery = queries.bind(DiningQueries.Restaurants, () => ({scopeId: 'local'}))
const queryFetching = computed(() => [personalQuery, activitiesQuery, restaurantsQuery].some(q => q.isFetching.value))
const queryError = computed(() => [personalQuery, activitiesQuery, restaurantsQuery].find(q => q.error.value)?.error.value)

const personalDeleteHistoryPort = scope.resolve(DeleteDiningHistoryUseCase.token);
const personalCommands = CommandState.create();
const personalHistory = () => (personalQuery.data.value?.history || []).slice();
const personalHistoryData = computed(() => readonly(personalHistory()));
const personalDeleteHistory = (id: string) => personalCommands.run(() => personalDeleteHistoryPort.execute(new DeleteDiningHistoryUseCase.Request(id)));
// 展示数据
const recordId = ref('')
const receipt = computed(() => {
  const record = personalHistoryData.value.find(r => r.activityId === recordId.value);
  return record ? ReceiptView.fromResult(record, {activities: activitiesQuery.data.value?.value, restaurants: restaurantsQuery.data.value?.value}) : null
})
const meals = computed(() => receipt.value ? 1 : 0)
const dishCount = computed(() => receipt.value?.lines.reduce((sum, l) => sum + l.count, 0) || 0)
// UI 交互状态
const confirmation = useAppDialog()

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const goBack = () => navigation.back('records')

// UI 交互方法
function confirmDelete() {
  confirmation.open({
    title: '删除记录',
    content: '确定删除这次用餐记录吗？',
    confirmColor: '#ff4a45',
    success: result => {
      if (result.confirm) return deleteRecord()
    }
  })
}

// 业务操作
async function deleteRecord() {
  await personalDeleteHistory(recordId.value)
  await navigation.back('records')
}

// 生命周期与动画监听
onLoad(query => {
  recordId.value = query?.recordId || ''
})

async function refreshQueries() { await Promise.all([personalQuery, activitiesQuery, restaurantsQuery].map(query => query.refresh())) }
</script>

<style scoped>
.sub-page {
  min-height: 100vh;
  background: #fff9f2;
}

.detail-body {
  padding: 20rpx 30rpx 50rpx;
}

.detail-card {
  background: white;
  border-radius: 26rpx;
  padding: 30rpx;
}

.detail-head {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-bottom: 28rpx;
  border-bottom: 1rpx solid #eee;
}

.detail-head > view {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.label-chip {
  padding: 9rpx 15rpx;
  border-radius: 12rpx;
  background: #fff0e5;
  color: #ff7439;
  font-size: 24rpx;
  font-weight: 900;
}

.restaurant {
  font-size: 31rpx;
  font-weight: 800;
}

.record-date {
  color: #9b8c7f;
  font-size: 23rpx;
}

.delete-record {
  width: 100%;
  height: 72rpx;
  margin-top: 28rpx;
  border: 2rpx solid #ff4a45;
  border-radius: 18rpx;
  background: white;
  color: #ff4a45;
  font-size: 25rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.empty-state {
  height: 500rpx;
  flex-direction: column;
  gap: 18rpx;
  color: #999;
}

.empty-icon {
  font-size: 90rpx;
}
</style>
