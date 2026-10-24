<template>
  <view class="records-overview">
    <view class="overview-item overview-divider">
      <text class="overview-value">{{ meals }}</text>
      <text>用餐次数</text>
    </view>
    <view class="overview-item overview-divider">
      <text class="overview-value">{{ rounds }}</text>
      <text>点餐轮次</text>
    </view>
    <view class="overview-item">
      <text class="overview-value">{{ dishes }}</text>
      <text>菜品数量</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ meals: number; rounds: number; dishes: number }>()
</script>

<style scoped>
.records-overview {
  height: 176rpx;
  border-radius: 28rpx;
  background: #ffd9bd;
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.overview-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  position: relative;
  color: #8b7564;
  font-size: 23rpx;
  font-weight: 800;
}

.overview-divider::after {
  content: '';
  position: absolute;
  right: 0;
  top: 10rpx;
  height: 60rpx;
  width: 1rpx;
  background: #ffc49f;
}

.overview-value {
  font-size: 46rpx;
  color: #ff7c3f;
  font-weight: 800;
}
</style>
