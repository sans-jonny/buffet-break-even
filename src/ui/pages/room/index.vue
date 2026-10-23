<template>
  <view class="room">
    <view class="topbar">
      <view class="topbar-info">
        <text class="room-code">房间 {{ roomStore.view.roomCode }}</text>
        <text class="room-status">{{ statusText }}</text>
      </view>
      <view class="leave" @tap="doLeave">离开</view>
    </view>

    <text v-if="roomStore.view.error" class="error">{{ roomStore.view.error }}</text>

    <scroll-view scroll-y class="scroll">
      <!-- 结算结果 -->
      <view v-if="roomStore.view.result" class="result">
        <text class="result-title">🎉 结算完成</text>
        <text class="result-value">合计回本 ¥{{ roomStore.view.result.value }}</text>
        <text class="result-price">门票 ¥{{ roomStore.view.result.price }}</text>
        <text v-if="amHost && savedLocally" class="result-saved">✅ 已保存到本地（仅你可见）</text>
        <view v-for="p in roomStore.view.result.byParticipant" :key="p.participantId" class="result-person">
          <view class="result-person-head">
            <text class="person-name">{{ p.nickname }}</text>
            <text class="person-value">¥{{ p.value }}</text>
          </view>
          <text class="person-lines">{{ linesText(p.lines) }}</text>
        </view>
      </view>

      <!-- 参与者 -->
      <view v-if="!roomStore.view.result" class="participants">
        <view v-for="p in roomStore.view.participants" :key="p.id" class="chip" :class="{self: p.isSelf}">
          <text>{{ p.nickname }}</text>
          <text v-if="p.isHost" class="badge">房主</text>
          <text v-if="p.isSelf" class="badge me">我</text>
        </view>
      </view>

      <!-- 未开始：房主开始 -->
      <view v-if="!roomStore.view.result && !roomStore.view.active" class="begin-panel">
        <text v-if="!amHost" class="wait">⏳ 等待房主开始…</text>
        <template v-else>
          <text class="label">门票价格</text>
          <view class="price-row">
            <text class="currency">¥</text>
            <input v-model="ticketInput" type="digit" class="price-input" placeholder="输入总价"/>
          </view>
          <view class="action" @tap="doBegin">开始用餐</view>
        </template>
      </view>

      <!-- 用餐中 -->
      <template v-if="!roomStore.view.result && roomStore.view.active">
        <view class="section">
          <text class="section-title">当前待选</text>
          <view v-for="s in roomStore.view.selections" :key="s.participantId" v-show="s.lines.length" class="selection">
            <text class="selection-name">{{ s.nickname }}</text>
            <view class="selection-lines">
              <view v-for="line in s.lines" :key="line.id" class="selection-line">
                <text>{{ line.emoji }} {{ line.name }} × {{ line.count }}</text>
              </view>
            </view>
          </view>
          <text v-if="noSelection" class="empty">还没人点菜，快选几道吧</text>
        </view>

        <view class="section">
          <text class="section-title">菜单</text>
          <view v-for="g in grouped" :key="g.category" class="group">
            <text class="group-title">{{ g.category }}</text>
            <view v-for="item in g.items" :key="item.id" class="menu-item">
              <text class="menu-emoji">{{ item.emoji }}</text>
              <view class="menu-info">
                <text class="menu-name">{{ item.name }}</text>
                <text class="menu-price">¥{{ item.price }}</text>
              </view>
              <view class="stepper">
                <view v-if="myCount(item.id) > 0" class="step minus" @tap="change(item.id, -1)">−</view>
                <text v-if="myCount(item.id) > 0" class="count">{{ myCount(item.id) }}</text>
                <view class="step plus" @tap="change(item.id, 1)">＋</view>
              </view>
            </view>
          </view>
        </view>

        <view class="section">
          <text class="section-title">已提交 · 合计 ¥{{ roomStore.view.committedValue }}</text>
          <view v-for="r in roomStore.view.rounds" :key="r.time + r.participantId" class="round">
            <text class="round-head">{{ r.nickname }} · ¥{{ r.value }}</text>
            <text class="round-lines">{{ linesText(r.lines) }}</text>
          </view>
          <text v-if="!roomStore.view.rounds.length" class="empty">还没有提交记录</text>
        </view>
      </template>
    </scroll-view>

    <view v-if="!roomStore.view.result && roomStore.view.active" class="footer">
      <view class="action ghost" @tap="doCommit">提交本轮</view>
      <view v-if="amHost" class="action danger" @tap="doFinish">结束用餐</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {products, categories} from '@/data/catalog'
import {
  BeginRoomInput,
  ChangeRoomSelectionInput,
  CommitRoomRoundInput,
  FinishRoomInput,
  LeaveRoomInput
} from '@/contexts/room/public'
import {SaveRecordInput, CollectReceiptInput} from '@/contexts/dining/public'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useRoomStore} from '@/ui/stores/useRoomStore'

const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const begin = useRequired<BeginRoomInput>(BeginRoomInput.Token)
const changeSelection = useRequired<ChangeRoomSelectionInput>(ChangeRoomSelectionInput.Token)
const commitRound = useRequired<CommitRoomRoundInput>(CommitRoomRoundInput.Token)
const finishRoom = useRequired<FinishRoomInput>(FinishRoomInput.Token)
const leaveRoom = useRequired<LeaveRoomInput>(LeaveRoomInput.Token)
const saveRecord = useRequired<SaveRecordInput>(SaveRecordInput.Token)
const collectReceipt = useRequired<CollectReceiptInput>(CollectReceiptInput.Token)

const roomStore = useRoomStore()
const ticketInput = ref('200')
const savedLocally = ref(false)

const me = computed(() => roomStore.view.participants.find(p => p.isSelf))
const amHost = computed(() => me.value?.isHost ?? false)
const grouped = computed(() => categories
    .map(category => ({category, items: products.filter(p => p.category === category)}))
    .filter(g => g.items.length))
const noSelection = computed(() => roomStore.view.selections.every(s => s.lines.length === 0))
const statusText = computed(() => {
  if (roomStore.view.result) return '已结束'
  if (roomStore.view.active) return '用餐中'
  return '等待开始'
})

function myCount(id: string): number {
  return roomStore.view.selections.find(s => s.participantId === roomStore.view.selfId)?.lines.find(l => l.id === id)?.count ?? 0
}

function change(id: string, delta: 1 | -1) {
  void runAction(() => changeSelection.execute({productId: id, change: delta}))
}

function linesText(lines: readonly {name: string; count: number}[]): string {
  return lines.map(l => `${l.name}×${l.count}`).join('、')
}

function doBegin() {
  void runAction(() => begin.execute({ticketPrice: Number(ticketInput.value)}))
}

function doCommit() {
  void runAction(() => commitRound.execute())
}

function doFinish() {
  void runAction(() => finishRoom.execute())
}

function doLeave() {
  void runAction(() => leaveRoom.execute())
}

// 结算结果仅由房主落到本地（历史记录 + 小票收藏）。
function saveLocally(result: NonNullable<typeof roomStore.view.result>) {
  const record = {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    restaurant: '多人房间',
    date: result.date,
    price: result.price,
    value: result.value,
    lines: result.lines.map(l => ({name: l.name, count: l.count, price: l.price})),
    rounds: result.rounds.map(r => ({
      time: r.time,
      value: r.value,
      lines: r.lines.map(l => ({name: l.name, count: l.count, price: l.price}))
    }))
  }
  saveRecord.execute(new SaveRecordInput.Request(record))
  collectReceipt.execute(new CollectReceiptInput.Request(record))
}

watch(() => roomStore.view.result, result => {
  if (!result) {
    savedLocally.value = false
    return
  }
  if (amHost.value && !savedLocally.value) {
    savedLocally.value = true
    saveLocally(result)
  }
})

// 离开或房间结束后房码清空，自动退回上一页。
watch(() => roomStore.view.roomCode, code => {
  if (!code) void navigation.back('setup')
})
</script>

<style scoped>
.room {
  height: 100vh;
  height: 100svh;
  display: flex;
  flex-direction: column;
  background: #fffaf0;
  box-sizing: border-box;
}

.topbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 36rpx;
  background: #fffefa;
  border-bottom: 2rpx solid #f0e6d6;
}

.room-code {
  font-size: 40rpx;
  font-weight: 1000;
  color: #ff4f16;
}

.room-status {
  display: block;
  font-size: 24rpx;
  color: #8f7a63;
  margin-top: 6rpx;
}

.leave {
  padding: 14rpx 28rpx;
  border-radius: 30rpx;
  background: #f7efe2;
  color: #8f7a63;
  font-size: 26rpx;
  font-weight: 700;
}

.error {
  flex: 0 0 auto;
  display: block;
  padding: 20rpx 36rpx;
  color: #e5484d;
  font-size: 26rpx;
  background: #fdecec;
}

.scroll {
  flex: 1 1 auto;
  min-height: 0;
}

.participants {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 28rpx 32rpx 0;
}

.chip {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 24rpx;
  border-radius: 30rpx;
  background: #f7efe2;
  font-size: 28rpx;
  font-weight: 700;
  color: #3a342f;
}

.chip.self {
  background: linear-gradient(145deg, #ff8b00, #ff5c16);
  color: white;
}

.badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  background: #ffd98a;
  color: #8d6500;
  font-weight: 800;
}

.badge.me {
  background: rgba(255, 255, 255, .85);
  color: #ff5c16;
}

.begin-panel {
  margin: 36rpx 32rpx;
  padding: 40rpx 36rpx;
  border-radius: 36rpx;
  background: #fffefa;
  box-shadow: 0 20rpx 30rpx rgba(133, 93, 54, .1);
}

.wait {
  display: block;
  text-align: center;
  color: #8f7a63;
  font-size: 30rpx;
  padding: 20rpx 0;
}

.label {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #3a342f;
}

.price-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  height: 100rpx;
  border: 6rpx solid #eadabd;
  border-radius: 28rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
}

.currency {
  font-size: 44rpx;
  color: #8d6500;
  font-weight: 800;
  margin-right: 24rpx;
}

.price-input {
  flex: 1;
  height: 100%;
  font-size: 38rpx;
  font-weight: 700;
  color: #3a342f;
}

.section {
  padding: 28rpx 32rpx 0;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 900;
  color: #3a342f;
  margin-bottom: 20rpx;
}

.selection {
  margin-bottom: 20rpx;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  background: #fffefa;
}

.selection-name {
  font-size: 28rpx;
  font-weight: 800;
  color: #ff5c16;
}

.selection-lines {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.selection-line {
  padding: 8rpx 18rpx;
  border-radius: 22rpx;
  background: #f7efe2;
  font-size: 24rpx;
  color: #3a342f;
}

.group-title {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #b07a2a;
  margin: 20rpx 0 12rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 18rpx 20rpx;
  margin-bottom: 12rpx;
  border-radius: 24rpx;
  background: #fffefa;
}

.menu-emoji {
  font-size: 48rpx;
}

.menu-info {
  flex: 1;
  margin-left: 20rpx;
}

.menu-name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3a342f;
}

.menu-price {
  display: block;
  font-size: 24rpx;
  color: #b07a2a;
  margin-top: 4rpx;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.step {
  width: 56rpx;
  height: 56rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 900;
  color: white;
}

.step.plus {
  background: linear-gradient(145deg, #ff8b00, #ff5c16);
}

.step.minus {
  background: #c9b39a;
}

.count {
  font-size: 30rpx;
  font-weight: 800;
  color: #3a342f;
  min-width: 32rpx;
  text-align: center;
}

.round {
  padding: 18rpx 24rpx;
  margin-bottom: 14rpx;
  border-radius: 22rpx;
  background: #f7efe2;
}

.round-head {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #3a342f;
}

.round-lines {
  display: block;
  font-size: 24rpx;
  color: #8f7a63;
  margin-top: 6rpx;
}

.empty {
  display: block;
  color: #b7aea3;
  font-size: 26rpx;
  padding: 12rpx 0 24rpx;
}

.result {
  padding: 40rpx 32rpx;
}

.result-title {
  display: block;
  font-size: 40rpx;
  font-weight: 1000;
  color: #ff4f16;
}

.result-value {
  display: block;
  font-size: 64rpx;
  font-weight: 1000;
  color: #ff8b00;
  margin-top: 16rpx;
}

.result-price {
  display: block;
  font-size: 28rpx;
  color: #8f7a63;
  margin-top: 8rpx;
}

.result-saved {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #1a9e5c;
}

.result-person {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: #fffefa;
}

.result-person-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.person-name {
  font-size: 30rpx;
  font-weight: 900;
  color: #3a342f;
}

.person-value {
  font-size: 32rpx;
  font-weight: 900;
  color: #ff5c16;
}

.person-lines {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #8f7a63;
}

.footer {
  flex: 0 0 auto;
  display: flex;
  gap: 20rpx;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #fffefa;
  border-top: 2rpx solid #f0e6d6;
}

.action {
  flex: 1;
  height: 96rpx;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32rpx;
  font-weight: 900;
  background: linear-gradient(145deg, #ff8b00, #ff5c16);
  box-shadow: 0 12rpx 0 #a53700;
}

.action.ghost {
  background: #fff;
  color: #ff5c16;
  border: 4rpx solid #ffc7a3;
  box-shadow: none;
}

.action.danger {
  background: linear-gradient(145deg, #ff5b1c, #e0480f);
  box-shadow: 0 12rpx 0 #a53700;
}
</style>
