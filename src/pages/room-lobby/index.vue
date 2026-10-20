<template>
  <view class="lobby">
    <view class="card">
      <text class="title">👥 多人房间</text>
      <text class="subtitle">创建房间，把房间码发给朋友一起点</text>

      <view class="field">
        <text class="label">你的昵称</text>
        <input v-model="nickname" class="input" placeholder="输入昵称" placeholder-class="ph"/>
      </view>

      <view class="button primary" @tap="create">创建房间</view>

      <view class="divider">
        <text class="divider-line"/>
        <text class="divider-text">或</text>
        <text class="divider-line"/>
      </view>

      <view class="field">
        <text class="label">房间码</text>
        <input v-model="roomCodeInput" class="input code" placeholder="输入 6 位房间码" placeholder-class="ph"/>
      </view>

      <view class="button" @tap="join">加入房间</view>

      <text v-if="view.connection === 'connecting'" class="hint">连接中…</text>
      <text v-if="view.error" class="error">{{ view.error }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import {storeToRefs} from 'pinia'
import {CreateRoomInput, JoinRoomInput} from '@/contexts/independent/room/public'
import {useRequired} from '@/composables/useRequired'
import {runAction} from '@/composables/runAction'
import {BuffetNavigation} from '@/navigation/BuffetNavigation'
import {useRoomStore} from '@/stores/useRoomStore'

const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const createRoom = useRequired<CreateRoomInput>(CreateRoomInput.Token)
const joinRoom = useRequired<JoinRoomInput>(JoinRoomInput.Token)
const {view} = storeToRefs(useRoomStore())

const nickname = ref('')
const roomCodeInput = ref('')

function goRoom() {
  if (view.value.roomCode) void navigation.toRoom()
}

// 首次显示（或从房间返回）时若已在房，直接进房；建房/加入成功后靠 watch 兜底跳转。
onShow(() => goRoom())
watch(() => view.value.roomCode, code => {
  if (code) goRoom()
})

function create() {
  void runAction(() => createRoom.execute({nickname: nickname.value.trim()}))
}

function join() {
  void runAction(() => joinRoom.execute({roomCode: roomCodeInput.value.trim().toUpperCase(), nickname: nickname.value.trim()}))
}
</script>

<style scoped>
.lobby {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffe4b8 0 60%, #ffdcb2 100%);
  padding: 48rpx 40rpx;
  box-sizing: border-box;
}

.card {
  background: #fffefa;
  border-radius: 48rpx;
  padding: 56rpx 44rpx;
  box-shadow: 0 30rpx 40rpx rgba(133, 93, 54, .16);
}

.title {
  display: block;
  font-size: 56rpx;
  font-weight: 1000;
  color: #ff4f16;
}

.subtitle {
  display: block;
  margin-top: 16rpx;
  color: #8f7a63;
  font-size: 28rpx;
}

.field {
  margin-top: 44rpx;
}

.label {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #3a342f;
  margin-bottom: 20rpx;
}

.input {
  height: 108rpx;
  border: 6rpx solid #eadabd;
  border-radius: 30rpx;
  background: #fffaf0;
  padding: 0 30rpx;
  font-size: 36rpx;
  color: #3a342f;
  box-sizing: border-box;
}

.input.code {
  letter-spacing: 8rpx;
  font-weight: 800;
}

.ph {
  color: #b7aea3;
}

.button {
  margin-top: 36rpx;
  height: 104rpx;
  border-radius: 40rpx;
  color: white;
  background: linear-gradient(145deg, #ff8b00, #ff5c16);
  box-shadow: 0 14rpx 0 #a53700, 0 24rpx 30rpx rgba(158, 64, 8, .2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 900;
}

.button.primary {
  background: linear-gradient(145deg, #ff5b1c, #ff3a10);
  box-shadow: 0 14rpx 0 #b23200, 0 24rpx 30rpx rgba(158, 64, 8, .2);
}

.divider {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 44rpx;
}

.divider-line {
  flex: 1;
  height: 2rpx;
  background: #eadabd;
}

.divider-text {
  color: #b7aea3;
  font-size: 26rpx;
}

.hint {
  display: block;
  margin-top: 32rpx;
  color: #8f7a63;
  font-size: 26rpx;
  text-align: center;
}

.error {
  display: block;
  margin-top: 32rpx;
  color: #e5484d;
  font-size: 28rpx;
  text-align: center;
}
</style>
