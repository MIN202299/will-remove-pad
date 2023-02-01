<template>
  <div class="m-main">
    <div v-show="!showForm" class="m-control is-hidden">
      <el-scrollbar height="100%">
        <div 
          v-for="(item, index) in buttons"
          :key="item.id"
          :class="index === activeIndexButton ? 'm-active' : ''"
          @click="activeIndexButton = index"
          class="m-item"
        >{{ item.buttonName }}</div>

      </el-scrollbar>
    </div>
    <div v-show="!showForm && config.previewImg" class="m-pic-box">
      <div>
        <main 
          ref="imgWrapperRef"
          :style="{aspectRatio: equipInfo ? equipInfo.width / equipInfo.height : 16/9}"
          class="m-pic-wrapper" 
          @scroll="handleScroll"
          >
          <img class="m-img-head" v-if="imgList.length" :src="imgList[imgList.length - 1]" alt="">

          <img
            v-for="(img, index) in imgList" 
            :key="index" 
            :src="img"
            alt="">
          
          <img class="m-img-tail" v-if="imgList.length" :src="imgList[0]" alt="">
        </main>

        <ul class="m-footer">
          <li 
            v-for="item in imgList.length" 
            :key="item"
            :class="activeIndexImage === item - 1 ? 'm-active' : ''"
          ></li>
        </ul>
      </div>
      
      
    </div>
    <div class="m-bg">
      <img :src="bgImg || '/src/assets/logo.png'" :style="{filter: bgImg ? 'blur(5px)' : 'none'}" alt="">
    </div>
  </div>

  <el-form v-show="showForm" :model="config" label-width="100" label-position="left" class="m-form">
    <el-form-item label="设备号" prop="equipId">
      <el-input v-model="config.equipId" maxlength="10" show-word-limit></el-input>
    </el-form-item>
    
    <el-form-item label="预览图片" prop="previewImg">
      <el-switch v-model="config.previewImg"></el-switch>
    </el-form-item>

    <div class="m-form-footer">
      <span @click="onResetForm">重置</span>
      <span @click="onSaveForm" style="background: rgba(0,0,0, .1);">保存</span>
    </div>
  </el-form>

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch, nextTick} from 'vue'
import { get, baseURL, post } from '@/request/request'
import { getStorage, setStorage } from '@/utils/storage'
import { ElMessage } from 'element-plus'
import logo from '@/assets/logo.png'

interface EquipConfig {
  equipId: string;
  previewImg: boolean;
}

interface ButtonItem {
  id: number;
  buttonName: number;
  materials: string;
}

let LOOP_TIMER: NodeJS.Timer
const STORAGE_KEY = 'equipId'
const MIN_STEP_TIME = 3
const showForm = ref(true)
const bgImg = ref(logo)
const config = ref<EquipConfig>({
  equipId: '',
  previewImg: true,
})
const buttons = ref<ButtonItem[]>([])
const equipInfo = ref()


// 图片配置
const activeIndexImage = ref(0)
const activeIndexButton = ref(0)

const imgList = computed(() => {
  const activeButton = buttons.value[activeIndexButton.value]
  return activeButton ? activeButton.materials.split(',').map(item => baseURL + item) : []
})

const onSaveForm = async () => {
  // check equip
  if (!config.value.equipId) {
    return ElMessage.error('请输入设备号')
  }
  const equip = await checkEquip(config.value.equipId)
  if (!equip) return
  showForm.value = false
  setStorage<string>(STORAGE_KEY, config.value.equipId)
  getEquipDetail()
}

const onResetForm = () => {
  config.value = {
    equipId: '',
    previewImg: false,
  }
}

const checkEquip = async (equipId: string) => {
  const { code, data } = await get('guide/checkEquip/'+equipId)
  if (code) {
    showForm.value = true
    ElMessage.error('设备不存在')
    return false
  }
  return data
}

const getEquipDetail = async () => {
  const equip = await checkEquip(config.value.equipId)
  if(!equip) return

  const { code, data } = await get(`guide/getDetail/${config.value.equipId}`)
  // 设置背景图
  if (data.equip.bgImg) {
    bgImg.value = baseURL + data.equip.bgImg
  }

  equipInfo.value = data.equip
  buttons.value = data.buttons
}

let timer: NodeJS.Timeout

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const scrollLeft =  target.scrollLeft;
  const targetWidth =  target.offsetWidth;
  const index = Math.round(scrollLeft / targetWidth)
  activeIndexImage.value = index - 1
  if (activeIndexImage.value < 0) activeIndexImage.value = imgList.value.length -1
  if (activeIndexImage.value > imgList.value.length - 1) activeIndexImage.value = 0
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    console.log(activeIndexImage.value)
    if (index === imgList.value.length + 1) {
      target.scrollTo(targetWidth, 0)
      activeIndexImage.value = 0
    }
    if (index === 0) {
      target.scrollTo(imgList.value.length * targetWidth, 0)
      activeIndexImage.value = imgList.value.length - 1
    }
  }, 300);
  
  e.preventDefault()
  e.stopPropagation()
}

const imgWrapperRef = ref<HTMLElement>()

const initScroll = () => {
  const width = imgWrapperRef.value?.offsetWidth 
  imgWrapperRef.value?.scrollTo(width ?? 0, 0)
}

watch(activeIndexButton, () => {
  activeIndexImage.value = 0
  initScroll()
  post('guide/changeImage', { 
    imageIndex: activeIndexImage.value,
    buttonIndex: activeIndexButton.value
  })
})


watch(activeIndexImage, () => {
  post('guide/changeImage', { 
    imageIndex: activeIndexImage.value,
    buttonIndex: activeIndexButton.value
  })
})

window.addEventListener('load', () => {
  setTimeout(() => {
    initScroll()
  }, 300);
})

onMounted(() => {
  // 读取配置
  const equipId = getStorage<string>(STORAGE_KEY)
  if (equipId) {
    config.value.equipId =  equipId
    showForm.value = false
    getEquipDetail()
  }
})

onBeforeUnmount(() => {})


</script>

<style scoped lang="scss">
$controlWidth: 240px;
.m-main {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  &::-webkit-scrollbar {
    display: none;
  }
  .m-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      vertical-align: middle;
    }
  }

  .m-control {
    width: $controlWidth;
    height: 60%;
    max-height: 380px;
    padding: 20px 0;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), transparent);
    color: rgba($color: #fff, $alpha: .6);
    font-size: 20px;
    transition: all 500ms ease;
    flex-shrink: 0;
    // backdrop-filter: blur(5px);

    .m-item {
      position: relative;
      padding-left: 40px;
      height: 40px;
      line-height: 40px;
      cursor: pointer;
      transition: all 200ms;
      user-select: none;
      &:hover {
        background-color: rgba($color: #fff, $alpha: .3);
      }
    }

    .m-item + .m-item {
      margin-top: 8px;
    }

    .m-item.m-active {
      color: #fff;
      font-size: 21px;
      &::before {
        position: absolute;
        left: 0;
        top: 50%;
        content: '';
        width: 20px;
        height: 10px;
        background-color: #fff;
        transform: translateY(-50%);
      }
    }
  
    .el-scrollbar {
      :deep(.el-scrollbar__wrap) {
        display: flex;
        align-items: center;
      }
      :deep(.el-scrollbar__view) {
        width: 100%;
        max-height: 100%;
      }
    }
  }

  .m-control.is-hidden {
    // margin-left: -$controlWidth; // 隐藏控制面板
  }

  .m-pic-box {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    > div {
      width: 80%;
    }
    .m-pic-wrapper {
      display: flex;
      margin-bottom: 25px;
      width: 100%;      
      align-items: center;
      overflow-x: auto;
      overflow-y: hidden;
      border-radius: 6px;
      scroll-snap-type: x mandatory;

      &::-webkit-scrollbar {
        display: none;
      }
      img {
        width: 100%;
        height: 100%;
        flex-shrink: 0;
        flex-grow: 0;
        border-radius: 6px;
        scroll-snap-align: center;
        scroll-snap-stop: always;
      }
    }

    .m-footer {
      margin: 0 auto;
      width: 100%;
      border-radius: 6px;
      text-align: center;

      li {
        display: inline-block;
        margin: 5px;
        width: 100%;
        height: 4px;
        min-width: 6px;
        max-width: 50px;
        background-color: rgba(255,255,255,.3);
        border-radius: 2px;
        transition: all 300ms;
        cursor: pointer;
      
        &:hover {
          // transform: scale(1.05, 1.5);
        }
      }

      .m-active {
        background-color: #fff;
      }
    }
  }
}


.m-form {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 50%;
  min-width: 300px;
  max-width: 450px;
  padding: 25px;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  box-shadow: 0px 0px 2px rgba($color: #fff, $alpha: .8);


  .el-form-item {
    :deep(.el-form-item__label) {
      font-size: 18px;
      color: rgba($color: #fff, $alpha: .9)
    }

    :deep(.el-switch.is-checked .el-switch__core) {
      background-color: rgba($color: #fff, $alpha: .5);
    }

    :deep(.el-switch__core) {
      background: transparent;
      border-color: rgba($color: #fff, $alpha: .8);
    }

    :deep(.el-input__count-inner) {
      background: transparent;
    }

    // :deep(.el-input-number__increase),
    // :deep(.el-input-number__decrease) {
    //   background: rgba(0,0,0, .1);
    // }
    // :deep(.el-input__wrapper) {
    //   background-color: rgba($color: #fff, $alpha: .8);
    // }
  }
  
  .el-input {
    border: 1px solid rgba($color: #fff, $alpha: .8);
    background-color: rgba($color: #fff, $alpha: .8);
    :deep(.el-input__wrapper) {
      box-shadow: none;
      background-color: transparent;
    }
  }

  
  .m-form-footer  {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 20px;

    span {
      padding: 6px 24px;
      color: rgba($color: #fff, $alpha: .9);
      border-radius: 5px;
      border: 1px solid rgba($color: #fff, $alpha: .8);
      transition: all 200ms;
      user-select: none;
    
      &:hover {
        // transform: scale(1.2);
        cursor: pointer;
      }
    }
  }
}

@media screen and (max-width: 500px) {
  .m-main {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    .m-control {
      // margin-left: -$controlWidth;
      width: 100%;
      scroll-snap-align: center;
    }

    .m-pic-box {
      flex-shrink: 0;
      width: 100%;
      scroll-snap-align: center;
      .m-pic-wrapper {
        width: 100%;
      }
      
    }
    .m-bg {
      width: 200%;
    }
  }
}
</style>