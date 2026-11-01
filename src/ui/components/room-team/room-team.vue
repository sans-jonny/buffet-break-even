<template>
  <view v-if="room" class="room-team">
    <text class="team-number" @tap="copyCode">👥 房间 {{ room.code }} ⧉</text>
    <scroll-view :scroll-x="true" :show-scrollbar="false" class="team-members">
      <text v-for="member in orderedMembers" :key="member.id" :class="{away: !member.online}" class="team-member"
            @tap="transfer(member)">{{ member.id === room.hostId ? '👑 ' : '' }}{{
          member.nickname
        }}{{ member.id === memberId ? '（我）' : '' }}{{ !member.online ? ' · 离线' : '' }}
      </text>
    </scroll-view>
    <text v-if="status !== 'online' || message" class="team-status">{{
        message || '正在连接，连接恢复后可继续点菜'
      }}
    </text>
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>
<script lang="ts" setup>
import {computed} from 'vue'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'

type Member = { id: string; nickname: string; online: boolean }
const props = withDefaults(defineProps<{
  room?: { code: string; hostId: string; members: Member[] }; memberId?: string; status?: string; message?: string
}>(), {memberId: '', status: 'online', message: ''})
const emit = defineEmits<{ (event: 'select-member', member: Member): void }>()
const confirmation = useAppDialog()
const orderedMembers = computed(() => [...(props.room?.members || [])].sort((a,
                                                                             b) => Number(b.id === props.room?.hostId) - Number(a.id === props.room?.hostId)))

function transfer(member: Member) {
  confirmation.open({
    title: '转让房主', content: '确认将房主权限交给「' + member.nickname + '」？', success: r => {
      if (r.confirm) emit('select-member', member)
    }
  })
}

function copyCode() {
  confirmation.open({title: '房间号', content: props.room?.code || ''})
}
</script>
<style scoped>
.room-team {
  flex: 0 0 auto;
  padding: 16rpx 22rpx;
  background: #fff0dd;
  border: 2rpx solid #ffdfbd;
  border-radius: 24rpx;
  min-width: 0
}

.team-number {
  font-size: 25rpx;
  font-weight: 800;
  color: #ae6735
}

.team-members {
  width: 100%;
  white-space: nowrap;
  margin-top: 12rpx
}

.team-member {
  display: inline-block;
  background: #fffaf2;
  color: #73523b;
  border-radius: 16rpx;
  padding: 6rpx 14rpx;
  margin-right: 10rpx;
  font-size: 22rpx
}

.away {
  color: #a69a90;
  background: #f4e8db
}

.team-status {
  display: block;
  color: #b76935;
  font-size: 22rpx;
  margin-top: 10rpx
}
</style>
