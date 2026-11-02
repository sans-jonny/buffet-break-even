<template>
  <view class="setup-page">
    <app-navbar centered class="setup-navbar" inset subtitle="准备吃垮老板！" subtitle-color="#a18765"
                title="自助餐回本神器" title-color="#ff4f16" @back="goBack"/>

    <cuisine-drum v-model="typeId" :items="drumItems" @preview="panelTypeId = $event"/>
    <text class="drum-hint">‹　左右滑动，选择餐厅种类　›</text>

    <view v-if="panelTypeId === 'creator'" class="setup-panel entry-panel">
      <text class="entry-title">创建自己的自助餐厅</text>
      <text class="entry-copy">添加菜品、填写参考价值，保存后会出现在「我的餐厅」。</text>
      <depth-button class="mode-button deep entry-button" @click="editMenus">开始创建餐厅</depth-button>
    </view>
    <view v-else class="setup-panel">
      <view class="price-label">
        <text>💰</text>
        <text>门票价格</text>
      </view>
      <view class="price-input-wrap">
        <text class="currency">¥</text>
        <input v-model="ticketInput" placeholder="输入总价" placeholder-style="color: #8f8d8a;" type="digit"/>
      </view>
      <view v-if="sessions.selectionPending" class="selection-recovery">
        <text>用餐已建立，恢复会话即可继续。</text>
        <view class="selection-recovery-actions">
          <button :disabled="sessions.loading" @tap="recoverSelection">恢复会话</button>
          <button :disabled="sessions.loading" @tap="sessions.dismissSelectionRecovery()">稍后处理</button>
        </view>
      </view>
      <view v-else class="mode-actions">
        <depth-button :disabled="startingSingle || sessions.loading || !!sessions.selectionPending" class="mode-button deep" @click="startSingle">🚀 单人模式</depth-button>
        <depth-button :disabled="sessions.loading || !!sessions.selectionPending" class="mode-button" @click="openRoom">👥 多人模式</depth-button>
      </view>
    </view>
    <app-dialog v-if="showRoomModal" :title="joining ? '加入房间' : '一起吃回本'" @close="closeRoomModal">
      <template v-if="!joining">
        <text class="room-dialog-note">创建房间将使用首页门票 ¥{{ ticketInput }}，昵称可在「我的」中设置。</text>
        <button :disabled="sessions.loading" :hover-stay-time="0" class="room-dialog-primary" @tap="createRoom">创建房间</button>
        <button :hover-stay-time="0" class="room-dialog-secondary" @tap="openJoinRoom">加入房间</button>
        <button :disabled="sessions.loading" :hover-stay-time="0" class="room-dialog-secondary" @tap="resumeRoom">加入上次房间</button>
      </template>
      <template v-else>
        <text class="room-dialog-note">输入房主分享的六位房间号</text>
        <input v-model="roomCode" class="room-code-input" maxlength="6" placeholder="六位房间号" type="number"/>
        <button :disabled="sessions.loading" :hover-stay-time="0" class="room-dialog-primary" @tap="joinRoom">进入房间</button>
        <button :hover-stay-time="0" class="room-dialog-secondary" @tap="joining = false">返回</button>
      </template>
    </app-dialog>
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>

<script lang="ts" setup>
import {useDiningStore} from '@/stores/business/useDiningStore'
import {useCatalogStore} from '@/stores/business/useCatalogStore'
import {useSessionStore} from '@/stores/business/useSessionStore'
import {PageAmount} from '@/ui/presentation/PageAmount'
import DepthButton from '@/ui/components/depth-button/depth-button.vue'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import CuisineDrum from '@/ui/components/cuisine-drum/cuisine-drum.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'
import {computed, ref, watch} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'

const sessions = useSessionStore()


const dining = useDiningStore()
const catalog = useCatalogStore()
const confirmation = useAppDialog(), startingSingle = ref(false)
// 分类名称来自 Catalog；图标属于页面展示配置。
const cuisineEmoji: Record<string, string> = {
  sukiyaki: '🍲', barbecue: '🥩', hotpot: '🥘', pizza: '🍕', My: '👨‍🍳'
}
const cuisineTypes = computed(() => {
  return catalog.categories.map(category => ({...category, emoji: cuisineEmoji[category.id] || '🍽️'}))
})
const drumItems = computed(() => [{id: 'creator', name: '创造者模式', emoji: '✏️'}, ...cuisineTypes.value])
const ticketInput = ref('200'), typeId = ref(''), panelTypeId = ref('')
watch(typeId, id => { panelTypeId.value = id })
watch(cuisineTypes, categories => {
  if (typeId.value && typeId.value !== 'creator' && !categories.some(category => category.id === typeId.value))
    typeId.value = categories[0]?.id || 'creator'
})

const showRoomModal = ref(false), joining = ref(false), roomCode = ref('')

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const goBack = () => navigation.back('mine')

const editMenus = () => navigation.open('creator')

// UI 交互方法
function openRoom() {
  joining.value = false;
  showRoomModal.value = true
}

function closeRoomModal() {
  showRoomModal.value = false
}

function openJoinRoom() {
  roomCode.value = '';
  joining.value = true
}

// 业务操作
async function startSingle() {
  if (startingSingle.value || confirmation.dialog.value) return
  startingSingle.value = true
  try {
    const existing = dining.unfinishedSingle()
    const total = ticketInput.value, categoryId = typeId.value
    if (existing) {
      confirmation.open({
        title: '继续上次用餐？',
        content: '存在尚未结束的单人用餐。继续将保留原票价和记录；新建会放弃旧用餐，不生成正式历史。',
        confirmText: '继续用餐',
        cancelText: '放弃旧用餐并新建',
        success: result => enterSingle(() => result.confirm
          ? sessions.resumeSingle(existing)
          : sessions.startSingle(PageAmount.minor(total), categoryId, existing.activityId))
      })
      return
    }
    await sessions.startSingle(PageAmount.minor(total), categoryId)
    await navigation.open('menu')
  } finally {
    startingSingle.value = false
  }
}

async function enterSingle(action: () => Promise<unknown>) {
  if (startingSingle.value) return
  startingSingle.value = true
  try {
    await action()
    await navigation.open('menu')
  } finally {
    startingSingle.value = false
  }
}

async function enterRoom(action: () => Promise<unknown>) {
  try { await action() }
  catch (error) {
    if (sessions.selectionPending) closeRoomModal()
    throw error
  }
  closeRoomModal()
  await navigation.open('menu')
}

const createRoom = () => enterRoom(() => sessions.createRoom(PageAmount.minor(ticketInput.value), typeId.value))
const joinRoom = () => enterRoom(() => sessions.joinRoom(roomCode.value))
const resumeRoom = () => enterRoom(() => sessions.joinRoom())

async function recoverSelection() {
  await sessions.recoverSelection()
  closeRoomModal()
  await navigation.open('menu')
}

// 生命周期与动画监听
onLoad(async query => {
  const requested = query?.typeId === 'custom' ? 'My' : query?.typeId
  typeId.value = cuisineTypes.value.some(category => category.id === requested)
    ? requested! : cuisineTypes.value[0]?.id || 'creator'
  panelTypeId.value = typeId.value
})
</script>

<style scoped>
.selection-recovery {
  padding-top: 24rpx;
  font-size: 25rpx;
  color: #946511;
}

.selection-recovery-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.selection-recovery-actions button {
  flex: 1;
  font-size: 25rpx;
}

.setup-navbar {
  padding-left: 28rpx;
  padding-right: 28rpx
}

.entry-title {
  display: block;
  font-size: 34rpx;
  font-weight: 900;
  color: #56340e
}

.entry-copy {
  display: block;
  margin-top: var(--entry-content-gap);
  font-size: 26rpx;
  line-height: 1.8;
  color: #946511
}

.entry-panel {
  --entry-content-gap: 36rpx;
  display: flex;
  flex-direction: column
}

.entry-panel .entry-button {
  margin-top: var(--entry-content-gap);
  width: 100%;
  flex: 0 0 104rpx
}

.custom-edit {
  margin: 24rpx 0 0;
  padding: 0 24rpx;
  line-height: 64rpx;
  background: #ffffffdd;
  color: #78597a;
  border-radius: 28rpx;
  font-size: 24rpx
}

.room-dialog-note {
  display: block;
  font-size: 27rpx;
  line-height: 1.8;
  color: #9a7d65;
  margin-bottom: 24rpx
}

.room-dialog-primary, .room-dialog-secondary, .room-dialog-secondary[disabled] {
  margin-top: 20rpx;
  --button-radius: 26rpx;
  font-size: 30rpx;
  font-weight: 800
}

.room-dialog-primary, .room-dialog-primary[disabled] {
  background: #ff6331;
  color: white
}

.room-dialog-secondary {
  background: #fff0dd;
  color: #b66d34
}

.room-code-input {
  height: 100rpx;
  box-sizing: border-box;
  background: white;
  border: 3rpx solid #eadabd;
  border-radius: 24rpx;
  text-align: center;
  font-size: 42rpx;
  letter-spacing: 10rpx
}

.setup-page {
  --setup-panel-height: 530rpx;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #ffe4b8 0 76%, #ffdcb2 100%);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

@supports (height: 100svh) {
  .setup-page {
    height: 100svh;
  }
}

.drum-hint {
  display: block;
  flex: 0 0 auto;
  margin-bottom: 24rpx;
  width: 100%;
  line-height: 32rpx;
  text-align: center;
  font-size: 23rpx;
  color: #ac7546;
  pointer-events: none;
}

.setup-panel {
  height: var(--setup-panel-height);
  box-sizing: border-box;
  flex: 0 0 auto;
  padding: 36rpx 48rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 64rpx 64rpx 0 0;
  background: #fffefa;
}

.price-label {
  display: flex;
  gap: 16rpx;
  align-items: center;
  font-size: 34rpx;
  font-weight: 800;
}

.price-input-wrap {
  margin-top: 36rpx;
  height: 116rpx;
  border: 6rpx solid #eadabd;
  border-radius: 34rpx;
  background: #fffaf0;
  display: flex;
  align-items: center;
  padding: 0 34rpx;
  box-sizing: border-box;
}

.price-input-wrap input {
  flex: 1;
  height: 100%;
  font-size: 42rpx;
  font-weight: 700;
  color: #3a342f;
}

.currency {
  font-size: 50rpx;
  color: #8d6500;
  font-weight: 800;
  margin-right: 28rpx;
}

.mode-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.mode-button {
  flex: 1;
  height: 104rpx;
  border-radius: 44rpx;
  color: white;
  background: linear-gradient(145deg, #ff8b00, #ff5c16);
  font-size: 32rpx;
  font-weight: 900;
  text-decoration: none;
}

.mode-button.deep {
  background: linear-gradient(145deg, #ff5b1c, #ff3a10);
}

@media (max-height: 650px) {
  .setup-page {
    --setup-panel-height: 436rpx
  }

  .entry-panel .entry-button {
    flex-basis: 88rpx
  }

  .custom-edit {
    margin-top: 12rpx;
    line-height: 48rpx;
    font-size: 22rpx
  }

  .setup-panel {
    padding: 28rpx 40rpx calc(40rpx + env(safe-area-inset-bottom))
  }

  .price-input-wrap {
    height: 90rpx;
    margin-top: 20rpx
  }

  .mode-actions {
    margin-top: 24rpx
  }

  .mode-button {
    height: 88rpx;
    font-size: 28rpx
  }
}
</style>
