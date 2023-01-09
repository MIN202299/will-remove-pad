<template>
  <div class="m-main">
    <Transition name="fade">
      <div v-show="!showForm" class="m-pic-box" @click="showForm = true">
        <img
          v-for="(img, index) in imgList"
          :class="activeIndexImage === index ? 'm-fade-in' : 'm-fade-out'"
          :key="index" 
          :src="img.src"
          alt="">
      </div>
    </Transition>
    <div class="m-bg">
      <img src="../assets/logo.png" alt="">
    </div>
  </div>

  <el-form v-show="showForm" :model="config" label-width="100" label-position="left" class="m-form">
    <el-form-item label="设备号" prop="equipId">
      <el-input v-model="config.equipId" maxlength="10" show-word-limit></el-input>
    </el-form-item>
    
    <el-form-item label="循环播放" prop="loop">
      <el-switch v-model="config.loop"></el-switch>
    </el-form-item>
    
    <el-form-item label="循环间隔" prop="stepTime">
      <el-input-number v-model="config.stepTime" :min="MIN_STEP_TIME" :disabled="!config.loop"></el-input-number>
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
const MIN_STEP_TIME = 3
const showForm = ref(true)
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
  const imgs: Array<{id: string, src: string}> = []
  buttons.value.forEach((item, index1) => {
    item.materials.split(',').forEach((img, index2) => {
      imgs.push({
        id: index1 + '-' + index2,
        src: baseURL + img
      })
    })
  })

  return imgs
})


const onSaveForm = async () => {
  if (!config.value.equipId) {
    return ElMessage.error('请输入设备号')
  }
  const equip = await checkEquip(config.value.equipId)
  if(!equip) return
  showForm.value = false
  setStorage<EquipConfig>(STORAGE_KEY, config.value)
  getEquipDetail()
}

const onResetForm = () => {
  if (config.value.equipId) {
    showForm.value = false
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
  if (!equip) return

  const { code, data } = await get(`guide/getDetail/${config.value.equipId}`)
  if (!code) {
    equipInfo.value = data.equip
    buttons.value = data.buttons
  } else {
    showForm.value = true
    console.log(code, data)
  }
}

// 启用循环
const useLoop = () => {
  if (LOOP_TIMER) clearInterval(LOOP_TIMER);
  if (!config.value.loop) return;
  LOOP_TIMER = setInterval(() => {
    activeIndexImage.value++
  }, config.value.stepTime * 1000)
}

const clearUseLoop = () => {
  if (LOOP_TIMER) clearInterval(LOOP_TIMER);
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
  // 读取配置
  const equipConfig = getStorage<EquipConfig>(STORAGE_KEY)

  if (equipConfig?.equipId) {
    config.value = equipConfig
    showForm.value = false
    getEquipDetail()
  }

  useLoop()
  useSocket()
  // 接受到改变图片指令
  socket.on(ActionType.CHANGE_MATERIAL, (data: ChangeImageMsg) => {
    const index = imgList.value.findIndex(item => item.id === `${data.buttonIndex}-${data.imageIndex}`)
    activeIndexImage.value = index === -1 ? 0 : index
    // 清除上个定时器
    useLoop()
  })
  // 接收到播放/暂停指令
  socket.on(ActionType.PLAY_OR_PAUSE, (data: PlayOrPauseMsg) => {
    if (LOOP_TIMER) clearInterval(LOOP_TIMER)
    if (data.type === 'play') {
      useLoop()
    }
  })

  socket.on(ActionType.TO_NEXT, () => {
    activeIndexImage.value++
    useLoop()
  })

  socket.on(ActionType.TO_LAST, () => {
    activeIndexImage.value--
    useLoop()
  })
})

onBeforeUnmount(() => {
  if (LOOP_TIMER) clearInterval(LOOP_TIMER);
  if(socket) socket.removeAllListeners()
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
      top:0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.5s linear;
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
        transform: scale(1.2);
        cursor: pointer;
      }
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s linear;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

</style>