<template>
  <view class="sub-page">
    <app-navbar centered fallback title="点餐明细" @back="goBack" @fallback="goBack"/>
    <view v-if="receipt" class="detail-body">
      <records-overview :dishes="dishCount" :meals="meals" :rounds="receipt.rounds.length"/>
      <view class="detail-card">
        <view class="detail-head">
          <view>
            <text class="label-chip inline-flex-center">本餐</text>
            <text class="restaurant">{{ formatRestaurantTitle(receipt.restaurant, receipt.typeName) }}</text>
          </view>
          <text class="record-date">{{ formatDateTime(receipt.date) }}</text>
          <text v-if="receipt.participants?.length" class="record-date">用餐人：{{
              receipt.participants.join('、')
            }}
          </text>
        </view>
        <view v-for="(round, roundIndex) in receipt.rounds" :key="roundIndex" class="round-box">
          <view class="round-head">
            <text class="round-chip inline-flex-center">第 {{ roundIndex + 1 }} 轮</text>
            <text class="round-time">{{ formatRoundTime(round.time) }}</text>
            <text class="round-value">¥{{ round.value.toFixed(2) }}</text>
          </view>
          <view v-for="line in round.lines" :key="line.name" class="detail-line">
            <text>{{ line.name }}</text>
            <text>x{{ line.count }}</text>
            <text>¥{{ (line.price * line.count).toFixed(2) }}</text>
          </view>
        </view>
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
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {ref} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'
import {formatDateTime, formatRoundTime} from '@/ui/format/time'
import {formatRestaurantTitle} from '@/ui/format/restaurantTitle'

// 展示数据
interface RecordDetail {
  id: string
  restaurant: string
  typeName: string
  date: string
  participants: string[]
  rounds: { time: string; value: number; lines: { name: string; count: number; price: number }[] }[]
}

const receipt = ref<RecordDetail | null>({
  "id": "ui-receipt-001",
  "restaurant": "牛牛",
  "typeName": "寿喜烧",
  "date": "2026-11-01T12:30:00+08:00",
  "participants": [
    "小羊",
    "饭搭子"
  ],
  "rounds": [
    {
      "time": "2026-11-01T12:00:00+08:00",
      "value": 88,
      "lines": [
        {
          "name": "牛上脑",
          "count": 4,
          "price": 10
        },
        {
          "name": "鲜虾",
          "count": 2,
          "price": 18
        },
        {
          "name": "时蔬拼盘",
          "count": 1,
          "price": 12
        }
      ]
    },
    {
      "time": "2026-11-01T12:25:00+08:00",
      "value": 160,
      "lines": [
        {
          "name": "牛上脑",
          "count": 16,
          "price": 10
        }
      ]
    }
  ]
})

const meals = ref(2), dishCount = ref(23)

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

// 业务方法（仅保留事件接口）
function deleteRecord() {
}

// 生命周期与动画监听
onLoad(query => {
  if (query?.recordId && receipt.value) receipt.value.id = query.recordId
})
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

.round-box {
  margin-top: 26rpx;
  padding: 22rpx;
  border: 2rpx solid #ffe1cd;
  border-radius: 20rpx;
}

.round-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-bottom: 18rpx;
  border-bottom: 1rpx solid #eee;
}

.round-chip {
  padding: 8rpx 12rpx;
  border-radius: 10rpx;
  background: #ffe9db;
  color: #ff7439;
  font-size: 22rpx;
  font-weight: 900;
}

.round-time {
  color: #8f8074;
  font-size: 22rpx;
  flex: 1;
}

.round-value {
  color: #ff7439;
  font-size: 25rpx;
  font-weight: 800;
}

.detail-line {
  min-height: 58rpx;
  display: grid;
  grid-template-columns: 1fr 60rpx 100rpx;
  align-items: center;
  font-size: 24rpx;
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
