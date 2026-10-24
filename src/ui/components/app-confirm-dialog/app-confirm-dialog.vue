<template>
  <app-dialog v-if="controller.dialog.value" :title="controller.dialog.value.title" @close="controller.close">
    <text class="confirmation-content">{{ controller.dialog.value.content }}</text>
    <view class="confirmation-actions">
      <button :hover-stay-time="0" class="cancel-action" @tap="controller.cancel">{{ controller.dialog.value.cancelText || '取消' }}</button>
      <button :hover-stay-time="0" class="confirm-action" :style="{backgroundColor: controller.dialog.value.confirmColor || '#ff6331'}" @tap="controller.confirm">{{ controller.dialog.value.confirmText || '确定' }}</button>
    </view>
  </app-dialog>
</template>

<script setup lang="ts">
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import type {AppDialogController} from '@/ui/composables/useAppDialog'
defineProps<{controller: AppDialogController}>()
</script>

<style scoped>
.confirmation-content {display:block;font-size:28rpx;line-height:1.8;color:#946e4c;overflow-wrap:anywhere}
.confirmation-actions {display:flex;gap:20rpx;margin-top:32rpx}
.cancel-action, .confirm-action {flex:1;min-width:0;margin:0;padding:0 12rpx;font-size:28rpx;line-height:88rpx;font-weight:800;--button-radius:32rpx}
.cancel-action::after, .confirm-action::after {border:0}
.cancel-action {background:#fff0dd;color:#b66d34}
.confirm-action {color:white}
</style>
