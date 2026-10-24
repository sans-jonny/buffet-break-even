<template>
  <view v-if="room" class="room-team">
    <text class="team-number" @tap="copyCode">👥 房间 {{ room.code }} ⧉</text>
    <scroll-view :scroll-x="true" :show-scrollbar="false" class="team-members">
      <text v-for="member in orderedMembers" :key="member.id" class="team-member" @tap="transfer(member)" :class="{away: !member.online}">{{ member.id === room.hostId ? '👑 ' : '' }}{{ member.nickname }}{{ member.id === store.view.memberId ? '（我）' : '' }}{{ !member.online ? ' · 离线' : '' }}</text>
    </scroll-view>
    <text v-if="store.view.status !== 'online' || store.view.message" class="team-status">{{ store.view.message || '正在连接，连接恢复后可继续点菜' }}</text>
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>
<script setup lang="ts">
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {useAppDialog} from '@/ui/composables/useAppDialog'
const confirmation = useAppDialog()
import {computed} from 'vue'
import {RoomInput} from '@/contexts/dining/public'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import {useRoomStore} from '@/ui/stores/useRoomStore'
const store = useRoomStore(), room = computed(() => store.view.snapshot)
const orderedMembers = computed(() => {
  const snapshot = room.value
  if (!snapshot) return []
  // 服务端成员列表按首次加入顺序返回；只把当前房主移到最前，不改变其他人的次序。
  return [...snapshot.members.filter(member => member.id === snapshot.hostId),
    ...snapshot.members.filter(member => member.id !== snapshot.hostId)]
})
const input = useRequired<RoomInput>(RoomInput.Token)
function transfer(member: {id: string; nickname: string; online: boolean}) {
  const s = room.value
  if (!s || s.hostId !== store.view.memberId || s.status !== 'active' || member.id === s.hostId || !member.online || store.view.status !== 'online' || store.view.busy) return
  const expectedRevision = s.revision
  confirmation.open({title: '转让房主', content: '确认将房主权限交给「' + member.nickname + '」？', success: result => {
    if (result.confirm) void runAction(() => input.execute({command: 'transferHost', params: {targetMemberId: member.id, expectedRevision}}))
  }})
}
const copyCode = () => {if (room.value) uni.setClipboardData({data: room.value.code})}
</script>
<style scoped>
.room-team {flex:0 0 auto;padding:16rpx 22rpx;background:#fff0dd;border:2rpx solid #ffdfbd;border-radius:24rpx;min-width:0}
.team-number {font-size:25rpx;font-weight:800;color:#ae6735}.team-members {width:100%;white-space:nowrap;margin-top:12rpx}.team-member {display:inline-block;background:#fffaf2;color:#73523b;border-radius:16rpx;padding:6rpx 14rpx;margin-right:10rpx;font-size:22rpx}.away {color:#a69a90;background:#f4e8db}.team-status {display:block;color:#b76935;font-size:22rpx;margin-top:10rpx}
</style>
