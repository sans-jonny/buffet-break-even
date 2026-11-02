<template>
  <view class="sub-page">
    <app-navbar centered fallback title="点餐明细" @back="goBack" @fallback="goBack"/>
    <view class="records-body">
      <records-overview :dishes="totalDishesSaved" :meals="records.length" :rounds="totalRoundsSaved"/>
      <view v-for="(item, index) in records" :key="item.id" :class="{ expanded: expandedRecordId === item.id }"
            class="record-card">
        <view class="record-summary" @tap="toggleRecord(item.id)">
          <view class="record-copy">
            <view>
              <text class="label-chip inline-flex-center">第 {{ records.length - index }} 餐</text>
              <text class="restaurant">{{
                  restaurantTitle.formatRestaurantTitle(item.restaurant, item.typeName)
                }}
              </text>
            </view>
            <text class="record-date">{{ time.formatDateTime(item.date) }}</text>
          </view>
          <view class="round-count">
            <text>{{ item.rounds.length }} 轮</text>
            <text class="chevron">◀</text>
          </view>
        </view>
        <view v-if="expandedRecordId === item.id" class="record-details">
          <view class="record-total" @tap="openDetail(item.id)">
            <text>查看详情 / 删除 ›</text>
          </view>
          <view class="record-total">
            <text>就餐价格 ¥{{ item.price }}</text>
            <text>已吃价值 ¥{{ item.value }}</text>
          </view>
          <view v-if="item.participants?.length" class="record-total record-participants">
            <text>用餐人：{{ item.participants.join('、') }}</text>
          </view>
          <view v-for="(round, roundIndex) in item.rounds" :key="roundIndex" class="round-box">
            <view class="round-head">
              <text>第 {{ roundIndex + 1 }} 轮</text>
              <text>{{ time.formatRoundTime(round.time) }}</text>
              <text>¥{{ round.value.toFixed(2) }}</text>
            </view>
            <view v-for="line in round.lines" :key="line.name" class="detail-line">
              <text>{{ line.name }}</text>
              <text>×{{ line.count }}</text>
              <text>¥{{ (line.price * line.count).toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-if="!records.length" class="empty-state flex-center">
        <text class="empty-icon">📋</text>
        <text class="empty-title">还没有点餐记录</text>
        <text>开始第一顿自助餐吧</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import {useDiningStore} from '@/stores/business/useDiningStore'
import {ReceiptView} from '@/ui/presentation/ReceiptView'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import {computed, ref} from 'vue'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {time} from '@/ui/format/time'
import {restaurantTitle} from '@/ui/format/restaurantTitle'

const dining = useDiningStore()
// 展示数据
const records = computed(() => {
  return dining.historyData.map(ReceiptView.fromResult)
})
const totalRoundsSaved = computed(() => records.value.reduce((sum, r) => sum + r.rounds.length, 0))
const totalDishesSaved = computed(() => records.value.reduce((sum, r) => sum + r.lines.reduce((a,
                                                                                               l) => a + l.count, 0), 0))
// UI 交互状态
const expandedRecordId = ref<string | null>(null)

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const goBack = () => navigation.back('mine')

const openDetail = (id: string) => navigation.toRecord(id)

// UI 交互方法
function toggleRecord(id: string) {
  expandedRecordId.value = expandedRecordId.value === id ? null : id
}

// 业务操作
// 当前页面无此类方法。
</script>

<style scoped>
.sub-page {
  min-height: 100vh;
  background: #fff9f2;
}

.records-body {
  padding: 20rpx 30rpx 50rpx;
}

.record-card {
  background: white;
  border-radius: 24rpx;
  margin-bottom: 22rpx;
  overflow: hidden;
  color: #302d2a;
  box-shadow: 0 12rpx 28rpx rgba(100, 73, 47, .06);
}

.record-summary {
  min-height: 154rpx;
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}

.record-copy {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-copy > view {
  display: flex;
  align-items: center;
  gap: 18rpx;
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
  font-size: 30rpx;
  font-weight: 800;
}

.record-date {
  color: #9c8d80;
  font-size: 23rpx;
}

.round-count {
  color: #9a887a;
  display: flex;
  align-items: center;
  gap: 30rpx;
  font-size: 24rpx;
  font-weight: 800;
}

.chevron {
  display: inline-block;
  font-size: 35rpx;
  transform: rotate(0);
  transition: transform .2s ease;
}

.record-card.expanded .chevron {
  transform: rotate(-90deg);
}

.record-details {
  padding: 0 30rpx 30rpx;
  border-top: 1rpx solid #f1ebe5;
}

.record-total {
  padding-top: 24rpx;
  display: flex;
  justify-content: space-between;
  color: #ff7439;
  font-size: 23rpx;
  font-weight: 800;
}

.round-box {
  margin-top: 24rpx;
  padding: 20rpx;
  border: 2rpx solid #ffe1cd;
  border-radius: 18rpx;
}

.record-participants {
  color: #9c8d80;
  font-weight: 400;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.round-head {
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eee;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  color: #8f8074;
  font-size: 22rpx;
  font-weight: 800;
}

.round-head text:last-child {
  color: #ff7439;
  text-align: right;
}

.detail-line {
  min-height: 54rpx;
  display: grid;
  grid-template-columns: 1fr 60rpx 100rpx;
  align-items: center;
  font-size: 23rpx;
  font-weight: 700;
}

.detail-line text:nth-child(2), .detail-line text:nth-child(3) {
  text-align: right;
}

.detail-line text:nth-child(2) {
  color: #998b80;
}

.detail-line text:nth-child(3) {
  color: #ff7439;
  font-weight: 800;
}

.empty-state {
  height: 440rpx;
  flex-direction: column;
  gap: 20rpx;
  color: #9f958b;
  font-size: 23rpx;
}

.empty-icon {
  font-size: 100rpx;
}

.empty-title {
  font-size: 30rpx;
  color: #403b36;
  font-weight: 800;
}
</style>
