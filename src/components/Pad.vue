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
    <div v-show="!showForm" class="m-pic-box">
      <main class="m-pic-wrapper">
        <img
          v-for="(img, index) in imgList" 
          :class="activeIndexImage === index ? 'm-fade-in' : 'm-fade-out'"
          :key="index" 
          :src="img"
          alt="">

          <ul class="m-footer">
            <li 
              v-for="item in imgList.length" 
              :key="item"
              :class="activeIndexImage === item - 1 ? 'm-active' : ''"
              @click="activeIndexImage = item - 1"
            ></li>
          </ul>
      </main>

      
      
    </div>
    <div class="m-bg">
      <img :src="bgImg || '/src/assets/logo.png'" :style="{filter: bgImg ? 'blur(5px)' : 'none'}" alt="">
    </div>
  </div>

  <el-form v-show="showForm" :model="config" label-width="100" label-position="left" class="m-form">
      <el-form-item label="设备号" prop="equipId">
        <el-input v-model="config.equipId"></el-input>
      </el-form-item>
      
      <el-form-item label="循环播放" prop="loop">
        <el-switch v-model="config.loop"></el-switch>
      </el-form-item>

      <el-form-item label="循环间隔" prop="loop">
        <el-input-number v-model="config.stepTime" :min="MIN_STEP_TIME" :disabled="!config.loop"></el-input-number>
      </el-form-item>

      <div class="m-form-footer">
        <span @click="onResetForm">重置</span>
        <span @click="onSaveForm" style="background: rgba(0,0,0, .1);">保存</span>
      </div>
    </el-form>

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { get, baseURL, post } from '@/request/request'
import { getStorage, setStorage } from '@/utils/storage'
import { ElMessage } from 'element-plus'

interface EquipConfig {
  equipId: string;
  loop: boolean;
  stepTime: number; // 切换间隔 （秒） 
}

interface ButtonItem {
  id: number;
  buttonName: number;
  materials: string;
}

let LOOP_TIMER: NodeJS.Timer
const STORAGE_KEY = 'equipConfig'
const MIN_STEP_TIME = 3
const showForm = ref(true)
const bgImg = ref('')
const config = ref<EquipConfig>({
  equipId: '',
  loop: true,
  stepTime: 5
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
  getEquipDetail()
}

const onResetForm = () => {
  config.value = {
    equipId: '',
    loop: false,
    stepTime: 5
  }
}

const getEquipDetail = async () => {
  if (!config.value.equipId) {
    showForm.value = true
    return ElMessage.error('请输入设备号')
  }
  try {
    const { code, data } = await get(`guide/getDetail/${config.value.equipId}`)
    console.log(code, data)
    if (code) {
      return ElMessage.error('设备不存在')
    }
    if (data.equip.bgImg) {
      bgImg.value = baseURL + data.equip.bgImg
    }
    // 判断是否设置配置
    if (
      Object.prototype.toString.call(data.equip.isLoop) === '[object Null]' ||
      Object.prototype.toString.call(data.equip.stepTime) === '[object Null]'
    ) {
      showForm.value = true
      return ElMessage.error('设备未配置')
    }

    equipInfo.value = data.equip
    buttons.value = data.buttons

    config.value.loop = data.equip.isLoop
    config.value.stepTime = data.equip.stepTime

    showForm.value = false
    setStorage<EquipConfig>(STORAGE_KEY, config.value)

    post('guide/updateConfig', { id: equipInfo.value.id, isLoop: config.value.loop, stepTime: config.value.stepTime })
  } catch (e: any) {
    ElMessage.error(e)
  }
}


// 读取配置
const equipConfig = getStorage<EquipConfig>(STORAGE_KEY)

if (equipConfig?.equipId) {
  config.value.equipId = equipConfig.equipId
  getEquipDetail()
}

// 循环
const useLoop = () => {
  if (LOOP_TIMER) clearInterval(LOOP_TIMER);
  if (!config.value.loop) return;
  LOOP_TIMER = setInterval(() => {
    activeIndexImage.value++
  }, config.value.stepTime * 1000)
}

watch(activeIndexButton, () => {
  activeIndexImage.value = 0
  post('guide/changeImage', { 
    imageIndex: activeIndexImage.value,
    buttonIndex: activeIndexButton.value
  })
})


watch(activeIndexImage, () => {
  if (activeIndexImage.value > imgList.value.length - 1) {
    activeIndexImage.value = 0
  }
  post('guide/changeImage', { 
    imageIndex: activeIndexImage.value,
    buttonIndex: activeIndexButton.value
  })
})



watch(showForm, useLoop)


onMounted(() => {
  getEquipDetail()
  // useLoop()
})

onBeforeUnmount(() => {
  if (LOOP_TIMER) clearInterval(LOOP_TIMER);
})


</script>

<style scoped lang="scss">
$controlWidth: 240px;
.m-main {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
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
        // display: flex;
        // align-items: center;
      }
      :deep(.el-scrollbar__view) {
        // width: 100%;
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
    .m-pic-wrapper {
      position: relative;
      width: 80%;
      max-height: 80vh;
      min-height: 80vh;
      overflow: hidden;
      border-radius: 6px;
      img {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        opacity: 0;
        border-radius: 6px;
        transition: opacity 1s linear;
      }
      .m-fade-in {
        opacity: 1;
      }
      .m-fade-out {
        opacity: 0;
      }
    }

    .m-footer {
      display: flex;
      position: absolute;
      bottom: 50px;
      left: 50%;
      min-width: 60%;
      padding: 20px;
      // background-color: rgba($color: #fff, $alpha: .2);
      transform: translateX(-50%);
      align-items: center;
      justify-content: space-around;
      // backdrop-filter: blur(10px);
      border-radius: 6px;

      li {
        margin: 5px;
        width: 100%;
        height: 6px;
        min-width: 6px;
        background-color: rgba(255,255,255,.5);
        border-radius: 3px;
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
        transform: scale(1.2);
        cursor: pointer;
      }
    }
  }
}

@media screen and (max-width: 400px) {
  .m-main {
    .m-control {
      margin-left: -$controlWidth;
      
    }

    .m-pic-box {
      .m-pic-wrapper {
        width: 90%;
      }
    }
  }
}
</style>