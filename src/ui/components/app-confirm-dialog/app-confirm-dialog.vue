<template>
  <app-dialog v-if="dialog" :title="dialog.title" @close="controller.close">
    <text class="confirmation-content">{{ dialog.content }}</text>
    <view class="confirmation-actions">
      <button :hover-stay-time="0" class="cancel-action" @tap="controller.cancel">{{
          dialog.cancelText || '取消'
        }}
      </button>
      <button :hover-stay-time="0" :style="{backgroundColor: dialog.confirmColor || '#ff6331'}" class="confirm-action"
              @tap="controller.confirm">{{ dialog.confirmText || '确定' }}
      </button>
    </view>
  </app-dialog>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import type {AppDialogController} from './useAppDialog'

const props = defineProps<{ controller: AppDialogController }>()
const dialog = computed(() => props.controller.dialog.value)
</script>

<style scoped>
.confirmation-content {
  display: block;
  font-size: 28rpx;
  line-height: 1.8;
  color: #946e4c;
  overflow-wrap: anywhere
}

.confirmation-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx
}

.cancel-action, .confirm-action {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0 12rpx;
  font-size: 28rpx;
  line-height: 88rpx;
  font-weight: 800;
  --button-radius: 32rpx
}

.cancel-action::after, .confirm-action::after {
  border: 0
}

.cancel-action {
  background: #fff0dd;
  color: #b66d34
}

.confirm-action {
  color: white
}
</style>
