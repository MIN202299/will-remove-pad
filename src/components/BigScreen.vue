<template>
  <div class="m-main">
    <div v-show="!showForm" class="m-pic-box" @click="showForm = true">
      <img
        v-for="(img, index) in imgList" 
        :class="activeIndexImage === index ? 'm-fade-in' : 'm-fade-out'"
        :key="index" 
        :src="img"
        alt="">
    </div>
    <div class="m-bg">
      <img src="/src/assets/logo.png" alt="">
    </div>
  </div>

  <el-form v-show="showForm" :model="config" label-width="100" label-position="left" class="m-form">
    <el-form-item label="设备号" prop="equipId">
      <el-input v-model="config.equipId"></el-input>
    </el-form-item>

    <div class="m-form-footer">
      <span @click="onResetForm">取消</span>
      <span @click="onSaveForm" style="background: rgba(0,0,0, .1);">保存</span>
    </div>
  </el-form>

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { get, baseURL } from '@/request/request'
import { getStorage, setStorage } from '@/utils/storage'
import { ElMessage } from 'element-plus'
import { useSocket, socket, socketPost, ActionType, ChangeImageMsg, PlayOrPauseMsg } from '@/utils/useSocket'

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
const showForm = ref(true)
const config = ref<EquipConfig>({
  equipId: '',
  loop: false,
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
  if (equipConfig?.equipId) {
    showForm.value = false
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
  } catch (e: any) {
    console.log(e)
  }
}

// 读取配置
const equipConfig = getStorage<EquipConfig>(STORAGE_KEY)

if (equipConfig?.equipId) {
  config.value.equipId = equipConfig.equipId
  getEquipDetail()
}

// 启用循环
const useLoop = () => {
  if (LOOP_TIMER) clearInterval(LOOP_TIMER);
  if (!config.value.loop) return;
  LOOP_TIMER = setInterval(() => {
    activeIndexImage.value++
  }, config.value.stepTime * 1000)
}

watch(activeIndexImage, () => {
  if (activeIndexImage.value > imgList.value.length - 1) {
    activeIndexImage.value = 0
  }

  if (activeIndexImage.value < 0) {
    activeIndexImage.value = imgList.value.length - 1
  }
  console.log(activeIndexImage.value)
})

watch(showForm, useLoop)


onMounted(() => {
  getEquipDetail()
  useLoop()
  useSocket()
  // 接受到改变图片指令
  socket.on(ActionType.CHANGE_MATERIAL, (data: ChangeImageMsg) => {
    console.log('changeImage', data)
    activeIndexButton.value = data.buttonIndex
    activeIndexImage.value = data.imageIndex
  })
  // 接收到播放/暂停指令
  socket.on(ActionType.PLAY_OR_PAUSE, (data: PlayOrPauseMsg) => {
    if (LOOP_TIMER) clearInterval(LOOP_TIMER)
    if (data.type === 'play') {
      LOOP_TIMER = setInterval(() => {
        activeIndexImage.value++
      }, config.value.stepTime * 1000)
    }
  })

  socket.on(ActionType.TO_NEXT, () => {
    activeIndexImage.value++
  })

  socket.on(ActionType.TO_LAST, () => {
    activeIndexImage.value--
  })

  socketPost<number, string>(123, (res) => {
    console.log(res)
  })
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

  .m-pic-box {
    position: relative;
    width: 100vw;
    height: 100vh;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    img {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      opacity: 0;
      border-radius: 6px;
      transition: opacity 1s linear;
      object-fit: cover;
    }
    .m-fade-in {
      opacity: 1;
    }
    .m-fade-out {
      opacity: 0;
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