<template>
  <view class="restaurant-page">
    <initialization-gate>
      <app-navbar fallback class="restaurant-navbar" inset title-color="#ff4f0a" subtitle-color="#a18765" title="创造者模式" :subtitle="library.restaurants.value.length + ' 个本地餐厅'" @back="goBack" @fallback="goBack"/>
      <view v-for="restaurant in library.restaurants.value" :key="restaurant.id" class="restaurant-card">
        <view class="restaurant-main">
          <view class="restaurant-badge">{{ restaurant.name.slice(0,1) }}</view>
          <view class="restaurant-copy"><text class="restaurant-name">{{ restaurant.name }}</text><text class="restaurant-meta">{{ restaurant.products.length }} 道菜 · 已保存</text></view>
        </view>
        <view class="restaurant-actions">
          <button :hover-stay-time="0" @tap="previewRestaurant(restaurant)">预览</button>
          <button :hover-stay-time="0" @tap="editRestaurant(restaurant.id)">编辑</button>
          <button :hover-stay-time="0" class="danger" @tap="remove(restaurant.id)">删除</button>
        </view>
      </view>
      <view v-if="!library.restaurants.value.length" class="restaurant-empty"><text>创建你的第一家餐厅</text><text>保存后即可在「我的餐厅」中使用</text></view>
      <button :hover-stay-time="0" class="restaurant-add" :disabled="library.restaurants.value.length >= 10" @tap="editRestaurant()">＋ 新建餐厅</button>
      <app-confirm-dialog :controller="confirmation"/>
  </initialization-gate>
  </view>
</template>
<script setup lang="ts">
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {useAppDialog} from '@/ui/composables/useAppDialog'
const confirmation = useAppDialog()
import {onShow} from '@dcloudio/uni-app'
import {useCustomRestaurants} from '@/ui/composables/useCustomRestaurants'
import {useRestaurantPreview} from '@/ui/composables/useRestaurantPreview'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import InitializationGate from '@/ui/components/initialization-gate/initialization-gate.vue'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const library = useCustomRestaurants()
const previewRestaurant = useRestaurantPreview()
onShow(() => {void runAction(library.reload)})
const goBack = () => runAction(() => navigation.back('setup'))
const editRestaurant = (id?: string) => runAction(() => navigation.toCustomMenu(id))
function remove(id: string) {
  confirmation.open({title:'删除餐厅',content:'删除此本地餐厅及其菜品？正在进行的用餐不受影响。',success:result=>{
    if (result.confirm) void runAction(()=>library.deleteRestaurant(id))
  }})
}
</script>
<style scoped src="@/ui/styles/restaurants.css"></style>
