<script setup lang="ts">
import {onLaunch} from '@dcloudio/uni-app'
import {ApplicationBootstrap} from '@/composition/ApplicationBootstrap'
import {useRequired} from '@/composables/useRequired'

const bootstrap = useRequired<ApplicationBootstrap>(ApplicationBootstrap.Token)
onLaunch(() => { bootstrap.initialize() })
</script>
<style>
@import "./static/iconfont/iconfont.css";

@font-face {
  font-family: "SourceHanSansSC";
  src: url("./static/SourceHanSansSC-Regular-2.otf") format("opentype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

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

/* 图标继承控件字号，使用图标字体自身的字重和行高。 */
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
.flex-center {
  display: flex;
}

.inline-flex-center {
  display: inline-flex;
}

.flex-center,
.inline-flex-center {
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
