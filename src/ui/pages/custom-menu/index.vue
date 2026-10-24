<template>
  <view class="restaurant-page editor-page">
    <initialization-gate>
      <app-navbar fallback class="restaurant-navbar" inset title-color="#ff4f0a" subtitle-color="#a18765" title="创造者模式" :subtitle="restaurant?.name || '新建餐厅'" @back="goBack" @fallback="goBack"/>
      <template v-if="restaurant">
        <view class="restaurant-card restaurant-main name-card">
          <view class="restaurant-badge">{{ restaurant.name.slice(0,1) || '店' }}</view>
          <view class="restaurant-copy"><text class="editor-label">餐厅名</text><input v-model="restaurant.name" maxlength="60" class="restaurant-name-input" placeholder="给餐厅起个名字"/></view>
        </view>
        <view class="dishes-heading"><text>菜品</text><text>{{ restaurant.products.length }} 道</text></view>
        <view v-for="p in restaurant.products" :key="p.id" class="restaurant-card dish-card" @tap="editProduct(p.id)">
          <view class="dish-picture flex-center">{{ p.emoji || '🍽️' }}</view>
          <view class="restaurant-copy"><text class="restaurant-name">{{ p.name }}</text><view class="dish-details"><text class="dish-price">¥{{ p.price }}</text><text class="dish-category">{{ restaurant.categories.find(c => c.id === p.category)?.name }}</text></view></view>
        </view>
        <button :hover-stay-time="0" class="restaurant-add" :disabled="restaurant.products.length >= 200" @tap="editProduct()">＋ 新增菜品</button>
        <view class="category-tools">
          <text class="editor-label">分类管理</text>
          <view class="category-tags"><text v-for="c in restaurant.categories" :key="c.id" @tap="editCategory(c.id)">{{ c.name }} ✎</text><text @tap="editCategory()">＋ 分类</text></view>
        </view>
        <text class="editor-note">保存后会出现在「我的餐厅」。修改仅影响之后新开的用餐。</text>
        <view class="editor-footer"><button :hover-stay-time="0" @tap="previewRestaurant(restaurant)">预览</button><button :hover-stay-time="0" class="primary" :disabled="!isDirty || saving" @tap="saveAll">{{ saving ? '保存中…' : '保存' }}</button></view>
      </template>
      <app-dialog v-if="form" :title="form.kind === 'category' ? '编辑分类' : '编辑菜品'" @close="form = null">
        <input v-model="form.name" class="editor-input" maxlength="60" placeholder="名称" />
        <template v-if="form.kind === 'product'">
          <picker :range="restaurant?.categories || []" range-key="name" :value="form.categoryIndex" @change="chooseCategory">
            <view class="editor-input">分类：{{ restaurant?.categories[form.categoryIndex]?.name || '请选择分类' }}</view>
          </picker>
          <input v-model="form.price" class="editor-input" type="digit" placeholder="每份参考价值（元）" />
        </template>
        <text class="editor-note">所有估值由你提供，用于回本参考。</text>
        <button :hover-stay-time="0" class="primary" @tap="applyForm">确认修改</button>
        <button v-if="form.id" :hover-stay-time="0" class="delete-entry" @tap="deleteEntry">{{ form.kind === 'category' ? '删除分类' : '删除菜品' }}</button>
      </app-dialog>
      <app-dialog v-if="showLeaveDialog" title="是否保存修改？" @close="showLeaveDialog = false">
        <text class="editor-note">餐厅有未保存的修改，保存后再离开，或放弃本次修改。</text>
        <view class="leave-actions">
          <button :hover-stay-time="0" class="delete-entry" :disabled="saving" @tap="discardAndLeave">放弃修改</button>
          <button :hover-stay-time="0" class="primary" :disabled="saving" @tap="saveAndLeave">保存并离开</button>
        </view>
      </app-dialog>
      <app-confirm-dialog :controller="confirmation"/>
  </initialization-gate>
  </view>
</template>
<script setup lang="ts">
import AppConfirmDialog from '@/ui/components/app-confirm-dialog/app-confirm-dialog.vue'
import {useAppDialog} from '@/ui/composables/useAppDialog'
const confirmation = useAppDialog()
import {computed, ref} from 'vue'
import {onLoad, onBackPress} from '@dcloudio/uni-app'
import {useCustomRestaurants} from '@/ui/composables/useCustomRestaurants'
import {useRestaurantPreview} from '@/ui/composables/useRestaurantPreview'
import {cloneCatalog, type DiningCatalog} from '@/utils/restaurant-catalog'
import {useRequired} from '@/ui/composables/useRequired'
import {runAction} from '@/ui/composables/runAction'
import InitializationGate from '@/ui/components/initialization-gate/initialization-gate.vue'
import AppDialog from '@/ui/components/app-dialog/app-dialog.vue'
import AppNavbar from '@/ui/components/app-navbar/app-navbar.vue'
import {BuffetNavigation} from '@/ui/navigation/BuffetNavigation'

const navigation = useRequired<BuffetNavigation>(BuffetNavigation)
const library = useCustomRestaurants()
const draft = ref<DiningCatalog>(library.read())
const selectedId = ref('')
const restaurant = computed(() => draft.value.restaurants.find(r => r.id === selectedId.value))
const savedSnapshot = ref('')
const isDirty = computed(() => JSON.stringify(restaurant.value) !== savedSnapshot.value)
const saving = ref(false), showLeaveDialog = ref(false)
let allowingBack = false
const previewRestaurant = useRestaurantPreview()
type Form = {kind: 'category' | 'product'; id: string; name: string; price: string; categoryIndex: number}
const form = ref<Form | null>(null)
const newId = () => 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
function loadRestaurant(id?: string) {
  draft.value = library.read()
  if (id) {
    if (!draft.value.restaurants.some(r => r.id === id)) throw new Error('餐厅不存在或已删除')
    selectedId.value = id
  } else {
    selectedId.value = newId()
    draft.value.restaurants.push({id:selectedId.value,name:'',categories:[{id:newId(),name:'默认分类'}],products:[],valuationNote:'用户提供的人民币参考估值，非官方售价',sources:['用户按实际食用份量和个人经验录入']})
  }
  savedSnapshot.value = JSON.stringify(restaurant.value)
}
loadRestaurant()
onLoad(query => {void runAction(() => loadRestaurant(query?.restaurantId))})
async function leave() {
  allowingBack = true
  try {await navigation.back('creator')} finally {allowingBack = false}
}
const goBack = () => {
  if (saving.value) return
  if (isDirty.value) showLeaveDialog.value = true
  else return runAction(leave)
}
onBackPress(() => {
  if (allowingBack) return false
  if (saving.value) return true
  if (!isDirty.value) return false
  showLeaveDialog.value = true
  return true
})
function open(kind: Form['kind'], id = '', name = '') {form.value = {kind, id, name, price: '', categoryIndex: 0}}
function editCategory(id = '') {open('category', id, restaurant.value?.categories.find(c => c.id === id)?.name)}
function editProduct(id = '') {
  if (!restaurant.value?.categories.length) {uni.showToast({title: '请先添加分类', icon: 'none'}); return}
  const p = restaurant.value.products.find(p => p.id === id)
  open('product', id, p?.name)
  if (p && form.value) {form.value.price = String(p.price); form.value.categoryIndex = restaurant.value.categories.findIndex(c => c.id === p.category)}
}
function chooseCategory(event: {detail: {value: string | number}}) {if (form.value) form.value.categoryIndex = Number(event.detail.value)}
const applyForm = () => runAction(() => {
  const f = form.value
  if (!f) return
  const name = f.name.trim()
  if (!name) throw new Error('请输入名称')
  const id = f.id || newId()
  if (restaurant.value && f.kind === 'category') {
    const old = restaurant.value.categories.find(c => c.id === id)
    if (old) old.name = name
    else {
      if (restaurant.value.categories.length >= 30) throw new Error('每家最多30个分类')
      restaurant.value.categories.push({id, name})
    }
  } else if (restaurant.value) {
    const price = Number(f.price)
    if (!Number.isFinite(price) || price <= 0 || Math.round(price * 100) <= 0 || price > 1000000) throw new Error('请输入有效正数估值')
    const category = restaurant.value.categories[f.categoryIndex]?.id
    if (!category) throw new Error('请选择分类')
    const product = {id, name, unit: restaurant.value.products.find(p => p.id === id)?.unit || '份', price: Math.round(price * 100) / 100, category, emoji: '🍽️'}
    const index = restaurant.value.products.findIndex(p => p.id === id)
    if (index >= 0) restaurant.value.products[index] = product
    else {
      if (restaurant.value.products.length >= 200) throw new Error('每家最多200个商品')
      restaurant.value.products.push(product)
    }
  }
  form.value = null
})
function confirmDelete(content: string, action: () => void) {confirmation.open({title: '确认删除', content, success: r => {if (r.confirm) action()}})}
function removeCategory(id: string) {
  if (restaurant.value?.products.some(p => p.category === id)) {uni.showToast({title: '请先移走或删除此分类的商品', icon: 'none'}); return}
  if (restaurant.value) restaurant.value.categories = restaurant.value.categories.filter(c => c.id !== id)
}
function removeProduct(id: string) {confirmDelete('删除此商品？', () => {if (restaurant.value) restaurant.value.products = restaurant.value.products.filter(p => p.id !== id); form.value = null})}
function deleteEntry() {
  if (!form.value) return
  if (form.value.kind === 'category') {
    const id = form.value.id
    removeCategory(id)
    if (!restaurant.value?.categories.some(c => c.id === id)) form.value = null
  } else removeProduct(form.value.id)
}
function persistRestaurant() {
  if (saving.value || !isDirty.value) return false
  if (!restaurant.value?.name.trim()) throw new Error('请填写餐厅名')
  if (!restaurant.value.products.length) throw new Error('请至少添加一道菜品后保存')
  saving.value = true
  try {
    library.saveRestaurant(cloneCatalog(restaurant.value))
    // Use the persisted, validated data as the baseline for subsequent edits.
    draft.value = library.read()
    savedSnapshot.value = JSON.stringify(restaurant.value)
    uni.showToast({title:'餐厅已保存',icon:'none'})
    return true
  } finally {saving.value = false}
}
const saveAll = () => runAction(persistRestaurant)
const saveAndLeave = () => runAction(async () => {
  if (persistRestaurant()) {showLeaveDialog.value = false; await leave()}
})
const discardAndLeave = () => runAction(async () => {
  if (saving.value) return
  await leave()
  showLeaveDialog.value = false
})
</script>
<style scoped src="@/ui/styles/restaurants.css"></style>
<style scoped>
.leave-actions {display:flex;gap:20rpx;margin-top:32rpx}
.leave-actions button {flex:1;min-width:0;margin:0;padding:0 10rpx;font-size:28rpx;line-height:88rpx}
.editor-page {padding-bottom:calc(180rpx + env(safe-area-inset-bottom))}.editor-label {display:block;font-size:26rpx;font-weight:800;color:#a18c74;margin-bottom:8rpx}.restaurant-name-input {height:86rpx;padding:0 22rpx;border:2rpx solid #eadabd;background:#fff8e8;border-radius:24rpx;font-size:34rpx;font-weight:800;box-sizing:border-box;width:100%}.dishes-heading {display:flex;justify-content:space-between;align-items:center;margin:26rpx 4rpx 20rpx;font-size:32rpx;font-weight:900}.dishes-heading text:last-child {font-size:24rpx;color:#a18c74}.dish-card {display:flex;align-items:center;gap:18rpx;padding:18rpx}.dish-picture {width:94rpx;height:94rpx;flex-shrink:0;background:#ffe7d4;border-radius:22rpx;font-size:48rpx}.dish-details {display:flex;gap:12rpx;align-items:center;margin-top:6rpx}.dish-price {color:#ff641a;font-weight:900;font-size:28rpx}.dish-category {background:#fff0e5;color:#a18c74;padding:4rpx 16rpx;border-radius:20rpx;font-size:23rpx}.category-tools {margin-top:30rpx}.category-tags {display:flex;gap:12rpx;flex-wrap:wrap}.category-tags text {font-size:24rpx;color:#9a693c;background:#fff6e6;border-radius:24rpx;padding:10rpx 20rpx}.editor-note {display:block;color:#a18c74;font-size:24rpx;line-height:1.7;margin:20rpx 0}.editor-footer {position:fixed;bottom:0;left:0;right:0;padding:18rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));background:#fffaf0;display:flex;gap:18rpx;z-index:50}.editor-footer button {flex:1;margin:0;font-size:34rpx;font-weight:900;line-height:94rpx;--button-radius:24rpx;color:#ff580c;background:white}.editor-footer .primary,.primary,.primary[disabled] {background:#ff641a;color:white}.editor-input {box-sizing:border-box;display:block;height:90rpx;line-height:90rpx;margin:16rpx 0;background:#fff;border:2rpx solid #eadabd;border-radius:20rpx;padding:0 20rpx;font-size:28rpx}.delete-entry,.delete-entry[disabled] {margin-top:16rpx;background:#fff0e5;color:#a9350b;font-size:26rpx;--button-radius:24rpx}
</style>
