<template>
  <view :style="pageStyle" class="mine-page">
    <query-feedback :loading="queryFetching" :error="queryError" @refresh="refreshQueries"/>
    <view class="profile-card">
      <view class="avatar flex-center">🐑</view>
      <view class="profile-copy">
        <text class="profile-name" @tap="editNickname">{{ nickname }} ✏️</text>
        <view class="first-ticket inline-flex-center">🧾 第一张小票</view>
      </view>
    </view>

    <view class="stats-row">
      <view class="flex-center">
        <text class="stat-value">¥{{ lifetimeDifference }}</text>
        <text>累计回本</text>
      </view>
      <view class="flex-center">
        <text class="stat-value">{{ meals }}</text>
        <text>就餐次数</text>
      </view>
      <view class="trophy flex-center">
        <text class="stat-value">🏆</text>
        <text>成就奖杯</text>
        <text class="progress-badge inline-flex-center">{{ achievement }}</text>
      </view>
    </view>

    <text class="section-title">我的资产</text>
    <view class="settings-card">
      <mine-setting-row :badge="receiptsCount" icon="🧾" icon-theme="orange" label="小票夹" @click="openReceipts"/>
      <mine-setting-row :badge="meals" icon="📋" icon-theme="green" label="用餐记录" @click="openRecords"/>
      <mine-setting-row icon="❤️" icon-theme="white" label="我的最爱"/>
      <mine-setting-row :divider="false" icon="🔥" icon-theme="peach" label="必吃榜"/>
    </view>

    <text class="section-title">更多服务</text>
    <view class="settings-card">
      <mine-setting-row compact icon="🎫" icon-theme="yellow" label="餐券福利"/>
      <mine-setting-row :divider="false" compact icon="👥" icon-theme="teal" label="自助同好群"/>
    </view>
    <view class="bottom-space"/>
    <app-tabbar active="mine" @select="openTab"/>
    <app-dialog v-if="editingNickname" title="设置昵称" @close="editingNickname = false">
      <text class="nickname-note">朋友会在多人房间中看到这个昵称</text>
      <input v-model="nicknameInput" class="nickname-input" maxlength="20" placeholder="输入昵称（最多20字）"/>
      <button :hover-stay-time="0" class="nickname-save" @tap="saveNickname">保存昵称</button>
    </app-dialog>
  </view>
</template>

<script lang="ts" setup>
import QueryFeedback from '@/ui/components/query-feedback/query-feedback.vue'
import {useScope} from '@/ui/useScope'
import {ReactiveQueryFacade} from '@/infrastructure/query/ReactiveQueryFacade'
import {DiningQueries} from '@/infrastructure/query/DiningQueries'
import {readonly} from 'vue'
import {CommandState} from '@/stores/CommandState'
import {ChangeNicknameUseCase} from '@/coordination/application/port/in/device/ChangeNicknameUseCase'
import MineSettingRow from '@/ui/components/mine-setting-row/mine-setting-row.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import {computed, ref} from 'vue'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'

const scope = useScope()
const queries = scope.resolve(ReactiveQueryFacade.token)
const personalQuery = queries.bind(DiningQueries.Personal, () => ({}))
const queryFetching = computed(() => [personalQuery].some(q => q.isFetching.value))
const queryError = computed(() => [personalQuery].find(q => q.error.value)?.error.value)

const personalChangeNickname = scope.resolve(ChangeNicknameUseCase.token);
const personalCommands = CommandState.create();
const personalHistory = () => (personalQuery.data.value?.history || []).slice();
const personalIdentityData = computed(() => personalQuery.data.value?.identity);
const personalHistoryData = computed(() => readonly(personalHistory()));
const personalNickname = (name: string) => personalCommands.run(() => personalChangeNickname.execute(new ChangeNicknameUseCase.Request(name)));
// 展示数据
const history = computed(() => {
  return personalHistoryData.value
})
const nickname = computed(() => {
  return personalIdentityData.value?.nickname || ''
})
const lifetimeDifference = computed(() => history.value.reduce((sum, r) => sum + r.netMinor, 0) / 100)
const meals = computed(() => history.value.length)
const receiptsCount = computed(() => personalQuery.data.value?.receipts.length || 0)
const achievement = computed(() => history.value.filter(r => r.netMinor >= 0).length + '/' + history.value.length)
const statusBarHeight = (typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()).statusBarHeight || 0

const pageStyle = {paddingTop: (statusBarHeight + uni.upx2px(24)) + 'px'}

// UI 交互状态
const editingNickname = ref(false), nicknameInput = ref('')

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const openReceipts = () => navigation.open('receipts')

const openRecords = () => navigation.open('records')

const openTab = (tab: 'menu' | 'mine') => navigation.open(tab, 'replace')

// UI 交互方法
function editNickname() {
  nicknameInput.value = nickname.value;
  editingNickname.value = true
}

// 业务操作
async function saveNickname() {
  await personalNickname(nicknameInput.value)
  editingNickname.value = false
}

async function refreshQueries() { await Promise.all([personalQuery].map(query => query.refresh())) }
</script>

<style scoped>
.nickname-note {
  display: block;
  font-size: 26rpx;
  color: #9a7d65;
  margin-bottom: 24rpx
}

.nickname-input {
  height: 100rpx;
  padding: 0 24rpx;
  background: white;
  border: 3rpx solid #eadabd;
  border-radius: 24rpx;
  font-size: 32rpx
}

.nickname-save, .nickname-save[disabled] {
  margin-top: 28rpx;
  background: #ff6331;
  color: white;
  --button-radius: 26rpx;
  font-size: 30rpx;
  font-weight: 800
}

.mine-page {
  min-height: 100vh;
  padding-right: 22rpx;
  padding-bottom: 120rpx;
  padding-left: 22rpx;
  background: linear-gradient(180deg, #ffe4bd, #fff9f2 48%);
  box-sizing: border-box;
}

.profile-card {
  height: 178rpx;
  padding: 28rpx 32rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, .92);
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-sizing: border-box;
}

.avatar {
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  background: #ffd8c7;
  font-size: 66rpx;
}

.profile-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16rpx;
}

.profile-name {
  font-size: 35rpx;
  font-weight: 900;
}

.first-ticket {
  height: 46rpx;
  border: 2rpx solid #ffd8c7;
  border-radius: 24rpx;
  padding: 0 18rpx;
  color: #ff6331;
  font-size: 23rpx;
  font-weight: 800;
}

.stats-row {
  display: flex;
  gap: 14rpx;
  margin: 24rpx 0 42rpx;
}

.stats-row > view {
  height: 142rpx;
  flex: 1;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, .92);
  flex-direction: column;
  gap: 14rpx;
  position: relative;
}

.stat-value {
  font-size: 31rpx;
  color: #ff6331;
  font-weight: 800;
}

.stats-row text:not(.stat-value):not(.progress-badge) {
  color: #a3a0a0;
  font-size: 23rpx;
  font-weight: 700;
}

.progress-badge {
  position: absolute;
  right: 6rpx;
  top: 6rpx;
  border-radius: 24rpx;
  padding: 5rpx 12rpx;
  background: #ff6331;
  color: white;
  font-size: 18rpx;
}

.section-title {
  display: block;
  font-size: 31rpx;
  font-weight: 900;
  margin: 0 8rpx 20rpx;
}

.settings-card {
  border-radius: 26rpx;
  overflow: hidden;
  background: rgba(255, 255, 255, .95);
  margin-bottom: 38rpx;
}

.bottom-space {
  height: 40rpx;
}
</style>
