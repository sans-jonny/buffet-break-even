<script setup lang="ts">
import {onLaunch, onShow, onHide} from '@dcloudio/uni-app'
import {ApplicationBootstrap} from '@/ui/composition/ApplicationBootstrap'
import {useRequired} from '@/ui/composables/useRequired'
import {useRoomResultNavigation} from '@/ui/composables/useRoomResultNavigation'
import {useEmptySessionCleanup} from '@/ui/composables/useEmptySessionCleanup'

const bootstrap = useRequired<ApplicationBootstrap>(ApplicationBootstrap.Token)
const checkRoomResult = useRoomResultNavigation()
const clearEmptySession = useEmptySessionCleanup()
onLaunch(() => {
  // 被系统强制终止时可能没有退出回调，下次启动补清理空会话。
  if (bootstrap.initialize()) void clearEmptySession()
})
onShow(() => {void checkRoomResult()})
onHide(() => {void clearEmptySession()})
</script>
<style>
@import "./static/iconfont/iconfont.css";

/* #ifdef H5 */
@font-face {
  font-family: "SourceHanSansSC";
  src: url("./static/SourceHanSansSC-Regular-2.otf") format("opentype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
/* #endif */

/* page 是 uni-app 的页面根元素。 */
/*noinspection CssInvalidHtmlTagReference */
page {
  min-height: 100%;
  background: #fff9f2;
  color: #302d2a;
  font-family: "SourceHanSansSC", sans-serif;
}

view,
text,
input,
textarea,
button,
scroll-view,
navigator {
  font-family: inherit;
}

/* The outline owns its radius; the button itself must not clip its corners. */
button {
  overflow: visible;
  border-radius: var(--button-radius, 36rpx) !important;
}

button[disabled] {
  filter: grayscale(40%);
}

/* Draw the native button outline at its actual size so custom rounded corners
   do not clip the default doubled-size, half-scaled pseudo-element. */
button::after {
  width: 100% !important;
  height: 100% !important;
  transform: none !important;
  border-width: 1rpx !important;
  border-radius: var(--button-radius, 36rpx) !important;

  pointer-events: none;
}

/* 图标继承控件字号，使用图标字体自身的字重和行高。 */
/* 全局工具类由其他页面和组件引用。 */
/*noinspection CssUnusedSymbol */
.iconfont {
  font-size: inherit;
  font-weight: 400;
  line-height: 1;
}

view,
text,
input,
scroll-view,
navigator {
  box-sizing: border-box;
}

/* 按钮、徽标等内容的水平和垂直居中；行内元素使用 inline-flex-center。 */
/*noinspection CssUnusedSymbol */
.flex-center {
  display: flex;
}

/*noinspection CssUnusedSymbol */
.inline-flex-center {
  display: inline-flex;
}

/*noinspection CssUnusedSymbol */
.flex-center,
.inline-flex-center {
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
