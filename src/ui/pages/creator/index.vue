<template>
  <view class="restaurant-page">
    <app-navbar :subtitle="restaurants.length + ' 个本地餐厅'" class="restaurant-navbar" fallback inset
                subtitle-color="#a18765"
                title="创造者模式" title-color="#ff4f0a" @back="goBack" @fallback="goBack"/>
    <view v-for="restaurant in restaurants" :key="restaurant.id" class="restaurant-card">
      <view class="restaurant-main">
        <view class="restaurant-badge">{{ restaurant.name.slice(0, 1) }}</view>
        <view class="restaurant-copy">
          <text class="restaurant-name">{{ restaurant.name }}</text>
          <text class="restaurant-meta">{{ restaurant.productCount }} 道菜 · 已保存</text>
        </view>
      </view>
      <view class="restaurant-actions">
        <button :hover-stay-time="0" @tap="previewRestaurant(restaurant)">预览</button>
        <button :hover-stay-time="0" @tap="editRestaurant(restaurant.id)">编辑</button>
        <button :hover-stay-time="0" class="danger" @tap="remove(restaurant.id)">删除</button>
      </view>
    </view>
    <view v-if="!restaurants.length" class="restaurant-empty">
      <text>创建你的第一家餐厅</text>
      <text>保存后即可在「我的餐厅」中使用</text>
    </view>
    <button :hover-stay-time="0" class="restaurant-add" @tap="editRestaurant()">＋ 新建餐厅</button>
    <view v-for="pending in catalog.pendingSyncData" :key="pending.restaurantId" class="restaurant-card">
      <text>{{ pending.name }} 已保存本地，{{ pending.roomIds.length }} 个房间待同步</text>
      <button :disabled="catalog.loading" @tap="retrySync(pending.restaurantId)">重试房间同步</button>
    </view>
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>
<script lang="ts" setup>
import {useCatalogStore} from '@/stores/business/useCatalogStore'
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import {computed} from 'vue'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'

const catalog = useCatalogStore()
// 展示数据
const restaurants = computed(() => {
  return catalog.restaurants.filter(r => r.type === 'PRIVATE').map(r => ({
    id: r.id,
    name: r.name,
    productCount: r.products.length
  }))
})

// UI 交互状态
const confirmation = useAppDialog()

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const goBack = () => navigation.back('setup')

const editRestaurant = (id?: string) => navigation.toCustomMenu(id)

const previewRestaurant = (restaurant: { id: string }) => navigation.toMenuPreview(restaurant.id)

// UI 交互方法
function remove(id: string) {
  confirmation.open({
    title: '删除餐厅', content: '删除此餐厅及其菜品？', success: result => {
      if (result.confirm) return deleteRestaurant(id)
    }
  })
}

// 业务操作
async function deleteRestaurant(id: string) {
  const response = await catalog.remove(id)
  if (response.value.pendingRooms.length)
    uni.showToast({title: '本地已删除，房间同步待恢复', icon: 'none'})
}

async function retrySync(id: string) {
  const response = await catalog.retrySync(id)
  const unknown = response.value.pendingRooms.some(room => room.code === 'UNKNOWN_COMMIT_OUTCOME')
  uni.showToast({title: unknown ? '请先返回房间核对上次提交' : response.value.pendingRooms.length ? '尚未同步，请稍后重试' : '房间同步完成', icon: 'none'})
}
</script>

<style scoped src="@/ui/styles/restaurants.css"></style>
