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
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>
<script lang="ts" setup>
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import {computed} from 'vue'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'

import {useDining} from '@/ui/useDining'

const client = useDining()
const dining = client.dining
// 展示数据
const restaurants = computed(() => {
  client.revision.value;
  return dining.localRestaurants().filter(r => r.type === 'PRIVATE').map(r => ({
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
  await dining.deleteRestaurant(id)
}
</script>

<style scoped src="@/ui/styles/restaurants.css"></style>
