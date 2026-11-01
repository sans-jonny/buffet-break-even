<template>
  <view class="restaurant-page editor-page">
    <app-navbar :subtitle="restaurant.name || '新建餐厅'" class="restaurant-navbar" fallback inset
                subtitle-color="#a18765"
                title="创造者模式" title-color="#ff4f0a" @back="goBack" @fallback="goBack"/>

    <view class="restaurant-card restaurant-main name-card">
      <view class="restaurant-badge">{{ restaurant.name.slice(0, 1) || '店' }}</view>
      <view class="restaurant-copy">
        <text class="editor-label">餐厅名</text>
        <input v-model="restaurant.name" class="restaurant-name-input" maxlength="60" placeholder="给餐厅起个名字"
               @input="isDirty = true"/>
      </view>
    </view>
    <view class="dishes-heading">
      <text>菜品</text>
      <text>{{ restaurant.products.length }} 道</text>
    </view>
    <view v-for="p in restaurant.products" :key="p.id" class="restaurant-card dish-card" @tap="editProduct(p.id)">
      <view class="dish-picture flex-center">{{ p.emoji || '🍽️' }}</view>
      <view class="restaurant-copy">
        <text class="restaurant-name">{{ p.name }}</text>
        <view class="dish-details">
          <text class="dish-price">¥{{ p.price }}</text>
          <text class="dish-category">{{ restaurant.categories.find(c => c.id === p.category)?.name }}</text>
        </view>
      </view>
    </view>
    <button :hover-stay-time="0" class="restaurant-add" @tap="editProduct()">＋ 新增菜品</button>
    <view class="category-tools">
      <text class="editor-label">分类管理</text>
      <view class="category-tags">
        <text v-for="c in restaurant.categories" :key="c.id" @tap="editCategory(c.id)">{{ c.name }} ✎</text>
        <text @tap="editCategory()">＋ 分类</text>
      </view>
    </view>
    <text class="editor-note">保存后会出现在「我的餐厅」。修改仅影响之后新开的用餐。</text>
    <view class="editor-footer">
      <button :hover-stay-time="0" @tap="previewRestaurant(restaurant)">预览</button>
      <button :disabled="!isDirty" :hover-stay-time="0" class="primary" @tap="saveAll">保存</button>
    </view>
    <app-dialog v-if="form" :title="form.kind === 'category' ? '编辑分类' : '编辑菜品'" @close="form = null">
      <input v-model="form.name" class="editor-input" maxlength="60" placeholder="名称"/>
      <template v-if="form.kind === 'product'">
        <picker :range="restaurant.categories" :value="form.categoryIndex" range-key="name" @change="chooseCategory">
          <view class="editor-input">分类：{{ restaurant.categories[form.categoryIndex]?.name || '请选择分类' }}</view>
        </picker>
        <input v-model="form.price" class="editor-input" placeholder="每份参考价值（元）" type="digit"/>
      </template>
      <text class="editor-note">所有估值由你提供，用于回本参考。</text>
      <button :hover-stay-time="0" class="primary" @tap="applyForm">确认修改</button>
      <button v-if="form.id" :hover-stay-time="0" class="delete-entry" @tap="deleteEntry">
        {{ form.kind === 'category' ? '删除分类' : '删除菜品' }}
      </button>
    </app-dialog>
    <app-dialog v-if="showLeaveDialog" title="是否保存修改？" @close="showLeaveDialog = false">
      <text class="editor-note">餐厅有未保存的修改，保存后再离开，或放弃本次修改。</text>
      <view class="leave-actions">
        <button :hover-stay-time="0" class="delete-entry" @tap="discardAndLeave">放弃修改</button>
        <button :hover-stay-time="0" class="primary" @tap="saveAndLeave">保存并离开</button>
      </view>
    </app-dialog>
    <app-confirm-dialog :controller="confirmation"/>
  </view>
</template>
<script lang="ts" setup>
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import {ref} from 'vue'
import {onBackPress, onLoad} from '@dcloudio/uni-app'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'
import {useAppDialog} from '@/ui/components/app-confirm-dialog/useAppDialog'

import {useDining} from '@/ui/useDining'
import {DiningClient} from '@/ui/DiningClient'

const client = useDining()
const dining = client.dining
// 展示数据
const restaurant = ref({
  id: DiningClient.id(),
  name: '',
  categories: [] as { id: string; name: string }[],
  products: [] as { id: string; name: string; price: number; category: string; emoji: string; unit: string }[]
})
let catalogVersion = 0
// UI 交互状态
const confirmation = useAppDialog()

const isDirty = ref(false)

const showLeaveDialog = ref(false)

type Form = { kind: 'category' | 'product'; id: string; name: string; price: string; categoryIndex: number }

const form = ref<Form | null>(null)

// 路由方法
const navigation = useRequired<BuffetNavigation>(BuffetNavigation)

const previewRestaurant = (restaurant: { id: string }) => navigation.toMenuPreview(restaurant.id)

let allowingBack = false

async function leave() {
  allowingBack = true;
  try {
    await navigation.back('creator')
  } finally {
    allowingBack = false
  }
}

function goBack() {
  if (isDirty.value) showLeaveDialog.value = true; else return leave()
}

// UI 交互方法
function open(kind: Form['kind'], id = '', name = '') {
  form.value = {kind, id, name, price: '', categoryIndex: 0}
}

function editCategory(id = '') {
  open('category', id, restaurant.value.categories.find(c => c.id === id)?.name)
}

function editProduct(id = '') {
  const p = restaurant.value.products.find(p => p.id === id)
  open('product', id, p?.name)
  if (p && form.value) {
    form.value.price = String(p.price);
    form.value.categoryIndex = restaurant.value.categories.findIndex(c => c.id === p.category)
  }
}

function chooseCategory(event: { detail: { value: string | number } }) {
  if (form.value) form.value.categoryIndex = Number(event.detail.value)
}

function deleteEntry() {
  if (!form.value) return
  const {kind, id} = form.value
  if (kind === 'category') return removeCategory(id)
  confirmation.open({
    title: '确认删除', content: '删除此商品？', success: result => {
      if (result.confirm) return removeProduct(id)
    }
  })
}

// 业务操作
function applyForm() {
  const input = form.value
  if (!input) return
  if (!input.name.trim()) throw new Error('名称不能为空')
  const id = input.id || DiningClient.id()
  if (input.kind === 'category') {
    const value = {id, name: input.name.trim()}
    const index = restaurant.value.categories.findIndex(c => c.id === id)
    if (index < 0) restaurant.value.categories.push(value); else restaurant.value.categories[index] = value
  } else {
    const category = restaurant.value.categories[input.categoryIndex]
    if (!category) throw new Error('请先选择分类')
    const value = {
      id,
      name: input.name.trim(),
      price: DiningClient.minor(input.price) / 100,
      category: category.id,
      emoji: '🍽️',
      unit: '份'
    }
    const index = restaurant.value.products.findIndex(p => p.id === id)
    if (index < 0) restaurant.value.products.push(value); else restaurant.value.products[index] = value
  }
  isDirty.value = true;
  form.value = null
}

function removeCategory(id: string) {
  restaurant.value.categories = restaurant.value.categories.filter(c => c.id !== id)
  restaurant.value.products = restaurant.value.products.filter(p => p.category !== id)
  isDirty.value = true;
  form.value = null
}

function removeProduct(id: string) {
  restaurant.value.products = restaurant.value.products.filter(p => p.id !== id)
  isDirty.value = true;
  form.value = null
}

async function saveAll() {
  const r = restaurant.value
  await dining.publishLocal({
    id: r.id, name: r.name, type: 'PRIVATE', deleted: false, version: catalogVersion + 1, categories: r.categories,
    restaurantCategory: {id: 'My', name: '我的餐厅'},
    products: r.products.map(p => ({
      id: p.id,
      name: p.name,
      categoryId: p.category,
      priceMinor: DiningClient.minor(String(p.price))
    }))
  })
  catalogVersion++;
  isDirty.value = false
}

async function saveAndLeave() {
  await saveAll();
  showLeaveDialog.value = false;
  await leave()
}

async function discardAndLeave() {
  isDirty.value = false;
  showLeaveDialog.value = false;
  await leave()
}

// 生命周期与动画监听
onLoad(async query => {
  await client.ready
  if (query?.restaurantId) {
    const r = dining.localRestaurant(query.restaurantId)
    if (r.type !== 'PRIVATE' || r.deleted) throw new Error('餐厅不存在')
    catalogVersion = r.version
    restaurant.value = {
      id: r.id,
      name: r.name,
      categories: r.categories.map(c => ({...c})),
      products: r.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.priceMinor / 100,
        category: p.categoryId,
        emoji: '🍽️',
        unit: '份'
      }))
    }
  }
})

onBackPress(() => {
  if (allowingBack || !isDirty.value) return false;
  showLeaveDialog.value = true;
  return true
})
</script>

<style scoped src="@/ui/styles/restaurants.css"></style>
<style scoped>
.leave-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx
}

.leave-actions button {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0 10rpx;
  font-size: 28rpx;
  line-height: 88rpx
}

.editor-page {
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom))
}

.editor-label {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #a18c74;
  margin-bottom: 8rpx
}

.restaurant-name-input {
  height: 86rpx;
  padding: 0 22rpx;
  border: 2rpx solid #eadabd;
  background: #fff8e8;
  border-radius: 24rpx;
  font-size: 34rpx;
  font-weight: 800;
  box-sizing: border-box;
  width: 100%
}

.dishes-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 26rpx 4rpx 20rpx;
  font-size: 32rpx;
  font-weight: 900
}

.dishes-heading text:last-child {
  font-size: 24rpx;
  color: #a18c74
}

.dish-card {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx
}

.dish-picture {
  width: 94rpx;
  height: 94rpx;
  flex-shrink: 0;
  background: #ffe7d4;
  border-radius: 22rpx;
  font-size: 48rpx
}

.dish-details {
  display: flex;
  gap: 12rpx;
  align-items: center;
  margin-top: 6rpx
}

.dish-price {
  color: #ff641a;
  font-weight: 900;
  font-size: 28rpx
}

.dish-category {
  background: #fff0e5;
  color: #a18c74;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 23rpx
}

.category-tools {
  margin-top: 30rpx
}

.category-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap
}

.category-tags text {
  font-size: 24rpx;
  color: #9a693c;
  background: #fff6e6;
  border-radius: 24rpx;
  padding: 10rpx 20rpx
}

.editor-note {
  display: block;
  color: #a18c74;
  font-size: 24rpx;
  line-height: 1.7;
  margin: 20rpx 0
}

.editor-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 18rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #fffaf0;
  display: flex;
  gap: 18rpx;
  z-index: 50
}

.editor-footer button {
  flex: 1;
  margin: 0;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 94rpx;
  --button-radius: 24rpx;
  color: #ff580c;
  background: white
}

.editor-footer .primary, .primary, .primary[disabled] {
  background: #ff641a;
  color: white
}

.editor-input {
  box-sizing: border-box;
  display: block;
  height: 90rpx;
  line-height: 90rpx;
  margin: 16rpx 0;
  background: #fff;
  border: 2rpx solid #eadabd;
  border-radius: 20rpx;
  padding: 0 20rpx;
  font-size: 28rpx
}

.delete-entry, .delete-entry[disabled] {
  margin-top: 16rpx;
  background: #fff0e5;
  color: #a9350b;
  font-size: 26rpx;
  --button-radius: 24rpx
}
</style>
