<template>
  <div style="margin: 0 auto; width: 100%">

    <div class="m-pic-box">
        <img  v-for="(item, index) in imgList" :key="index" :class="activeIndex === index ? 'm-fade-in' : 'm-fade-out'" :src="item" alt="" />
    </div>
    <div class="m-footer">
      <span @click="onLastClick">上一页</span>
      
      <!-- <label for="infinite">是否循环：<input :checked="infinite" id="infinite" type="checkbox" @change="test"></label> -->
      <span>123456</span>

      <span @click="onNextClick">下一页</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { get, baseURL } from '@/request/request'

const imgList = ref<string[]>([])
const activeIndex = ref(0)
const infinite = ref(true)

const getImgList = async () => {
  const { code, data } = await get('/guide/btnList', { guideEquipId: 6 })
  if (!code) {
    console.log(data)
    imgList.value = data.list.shift().materials.split(',').map((item: string) => `${baseURL}/${item}`)
  }
}

getImgList()

const onLastClick = () => {
  if (activeIndex.value > 0) {
    activeIndex.value--
  }
  if (infinite.value && activeIndex.value === 0) {
    activeIndex.value = imgList.value.length - 1
  }
  console.log(activeIndex.value)
}
const onNextClick = () => {
  if (activeIndex.value < imgList.value.length) {
    activeIndex.value++
  }

  if (infinite.value && activeIndex.value >= imgList.value.length) {
    activeIndex.value = 0
  }
  console.log(activeIndex.value)
}

const test = (e: Event) => {
  infinite.value = (e.target as any).checked
  console.log(infinite.value)
}

</script>

<style scoped lang="scss">
.m-pic-box {
  position: absolute;
  top:0;
  left: 0;
  display: flex;
  width: 100vw;
  height: 100vh;
  place-items: center;
  background-color: #fff;
  overflow: hidden;
  margin: 0 auto;
  img {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translate(0, -50%);
    margin: auto;
    width: 100%;
    height: auto;
    opacity: 0;
    transition: opacity 1s ease-in-out;
    filter: blur(5px);
  }

  .m-fade-in {
    opacity: 1;
  }
  .m-fade-out {
    opacity: 0;
  }
}

.m-footer {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translate(-50%);
  padding: 20px 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  width: 20vw;
  // backdrop-filter: blur(10px);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  span {
    display: block;
    padding: 10px 20px;
    font-size: 20px;
    font-weight: bold;
    color: rgba(255, 255, 255, .6);
    cursor: pointer;
    user-select: none;
    transition: all 150ms;
  }

  span:hover {
    transform: scale(1.2);
    color: rgba(0, 0, 0, .6);
    background-color: rgba(255, 255, 255, 0.8);
  }
}

</style>