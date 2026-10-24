<template>
  <view class="mine-page" :style="pageStyle">
    <initialization-gate>
    <view class="profile-card">
      <view class="avatar flex-center">🐑</view>
      <view class="profile-copy">
        <text class="profile-name" @tap="editNickname">{{ profileStore.nickname }} ✏️</text>
        <view class="first-ticket inline-flex-center">🧾 第一张小票</view>
      </view>
    </view>

    <view class="stats-row">
      <view class="flex-center">
        <text class="stat-value">¥{{ historyStore.view.lifetimeDifference }}</text>
        <text>累计回本</text>
      </view>
      <view class="flex-center">
        <text class="stat-value">{{ historyStore.view.records.length }}</text>
        <text>就餐次数</text>
      </view>
      <view class="trophy flex-center">
        <text class="stat-value">🏆</text>
        <text>成就奖杯</text>
        <text class="progress-badge inline-flex-center">{{ Math.min(historyStore.view.records.length + 1, 7) }}/7</text>
      </view>
    </view>

    <text class="section-title">我的资产</text>
    <view class="settings-card">
      <mine-setting-row icon="🧾" label="小票夹" icon-theme="orange" :badge="collectionStore.view.receipts.length" @click="openReceipts"/>
      <mine-setting-row icon="📋" label="点餐明细" icon-theme="green" :badge="historyStore.view.totalRoundsSaved" @click="openRecords"/>
      <mine-setting-row icon="❤️" label="我的最爱" icon-theme="white"/>
      <mine-setting-row icon="🔥" label="必吃榜" icon-theme="peach" :divider="false"/>
    </view>

    <text class="section-title">更多服务</text>
    <view class="settings-card">
      <mine-setting-row icon="🎫" label="餐券福利" icon-theme="yellow" compact/>
      <mine-setting-row icon="👥" label="自助同好群" icon-theme="teal" compact :divider="false"/>
    </view>
    <view class="bottom-space"/>
    <app-tabbar active="mine" @select="openTab"/>
    <app-dialog v-if="editingNickname" title="设置昵称" @close="editingNickname = false">
      <text class="nickname-note">朋友会在多人房间中看到这个昵称</text>
      <input v-model="nicknameInput" class="nickname-input" maxlength="20" placeholder="输入昵称（最多20字）" />
      <button :hover-stay-time="0" class="nickname-save" :disabled="savingNickname || roomStore.view.busy" @tap="saveNickname">保存昵称</button>
    </app-dialog>
  </initialization-gate>
  </view>
</template>

<script setup lang="ts">
import InitializationGate from '@/ui/components/initialization-gate/initialization-gate.vue'
import MineSettingRow from '@/ui/components/mine-setting-row/mine-setting-row.vue'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {useProfileStore} from '@/ui/stores/useProfileStore'
import {useRoomStore} from '@/ui/stores/useRoomStore'
import {ProfileSettings} from '@/ui/profile/ProfileSettings'
import {RoomInput} from '@/contexts/dining/public'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'

const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const profileStore = useProfileStore(), roomStore = useRoomStore()
const profile = useRequired<ProfileSettings>(ProfileSettings)
const roomInput = useRequired<RoomInput>(RoomInput.Token)
const editingNickname = ref(false), nicknameInput = ref(''), savingNickname = ref(false)
onShow(() => {void runAction(() => profile.load())})
function editNickname() {nicknameInput.value = profileStore.nickname; editingNickname.value = true}
function saveNickname() {
  if (savingNickname.value) return
  return runAction(async () => {
    savingNickname.value = true
    try {
      profile.save(nicknameInput.value)
      if (roomStore.view.snapshot?.status === 'active' && roomStore.view.status === 'online') {
        await roomInput.execute({command: 'rename', params: {nickname: profileStore.nickname}})
      }
      editingNickname.value = false
      uni.showToast({title: '昵称已保存', icon: 'none'})
    } finally {savingNickname.value = false}
  })
}
import {useHistoryStore} from '@/ui/stores/useHistoryStore'
import {useCollectionStore} from '@/ui/stores/useCollectionStore'

const historyStore = useHistoryStore()
const collectionStore = useCollectionStore()
const statusBarHeight = (typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()).statusBarHeight || 0
const pageStyle = {paddingTop: (statusBarHeight + uni.upx2px(24)) + 'px'}
const openReceipts = () => runAction(() => navigation.open('receipts'))
const openRecords = () => runAction(() => navigation.open('records'))
const openTab = (tab: 'menu' | 'mine') => runAction(() => navigation.open(tab, 'replace'))
</script>

<style scoped>
.nickname-note {display:block;font-size:26rpx;color:#9a7d65;margin-bottom:24rpx}
.nickname-input {height:100rpx;padding:0 24rpx;background:white;border:3rpx solid #eadabd;border-radius:24rpx;font-size:32rpx}
.nickname-save,.nickname-save[disabled] {margin-top:28rpx;background:#ff6331;color:white;--button-radius:26rpx;font-size:30rpx;font-weight:800}
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
