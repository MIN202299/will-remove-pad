<template>
  <div v-show="!showForm" class="m-main" ref="mainRef" @click="test">
    <TransitionGroup name="fade">
      <div v-for="(item1, index1) in resourceList" :key="index1" class="m-theme" v-show="index1 === activeThemeIndex">
        <Transition v-for="(item2, index2) in item1" name="fade" class="m-wrapper">
          <div v-if="index1===activeThemeIndex && index2 === activeResourceIndex">
            <video v-if="item2.type === 'video'" :src="baseURL+item2.position" autoplay muted class="m-item"></video>
            <img v-else :src="baseURL+item2.position" class="m-item" alt="">
          </div>
        </Transition>
      </div>
    </TransitionGroup>
    <div class="m-bg">
      <!-- <img src="../assets/logo.png" alt=""> -->
    </div>
  </div>
  <div style="position: absolute; top: 0; left:0; width: 100px; height: 100px; background: #fff;color: #000;z-index: 999999;">{{ testCount }}</div>

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

    <el-form-item label="设备序号">
      <el-input-number v-model="config.sortNum" :min="1"></el-input-number>
    </el-form-item>


    <div class="m-form-footer">
      <span @click="showForm = false">取消</span>
      <span @click="onSaveForm" style="background: rgba(0,0,0, .1);">保存</span>
    </div>
  </el-form>
</template>

<script setup lang="ts">
  import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue'
  import { getStorage, setStorage } from '@/utils/storage'
  import { get, baseURL, post } from '@/request/request'
  import { ElMessage } from 'element-plus';
  import { useSocket, socket } from "@/utils/useSocket";

  type FileType = 'image' | 'video' | 'audio' | 'other'

  interface FormType {
    equipId: string;
    sortNum: number;
    loop: boolean;
    stepTime: number;
  }

  interface Resource {
    id: number;
    name: string;
    position: string;
    mimeType: string;
    size: string;
    type: FileType;
  }

  // 
  const MIN_STEP_TIME = 0
  const STEP_Time = 5
  const ShOWROOM_EQUIP='showroomEquip'
  const showForm = ref(true)
  const resourceList = ref<Resource[][]>([])
  const activeThemeIndex = ref(0)
  const activeResourceIndex = ref(0)
  const mainRef = ref()
  let cacheEquip: any
  let cacheResource: any
  let timer: NodeJS.Timer

  const testCount = ref(0)
  const test = () => {
    testCount.value++
    showForm.value = true
  }

  const config = ref<FormType>({
    equipId: '',
    sortNum: 1, // 排序号
    loop: true,
    stepTime: STEP_Time
  })

  const activeResource = computed(() => {
    if (resourceList.value.length) {
      return resourceList.value[activeThemeIndex.value][activeResourceIndex.value]
    }
    return null
  })
  
  watch(showForm, (val) => {
    if (val) {
      removeTimer()
    } else {
      useTimer()
    }
  })

  onMounted(() => {
    getInitConfig()
    useTimer()
    useSocket()
  })
  
  onBeforeUnmount(() => {
    removeTimer()
  })


  function onResetForm() {
    config.value = {
      equipId: '',
      sortNum: 1, // 排序号
      loop: true,
      stepTime: STEP_Time
    }
  }

  async function onSaveForm() {
    if (!config.value.equipId) return ElMessage.error('请输入设备号')
    getEquip(config.value.equipId)
    setStorage(ShOWROOM_EQUIP, config.value)
    showForm.value = false
  }

  async function getEquip(id: string) {
    const { code, data } = await get(`/showroom/findEquipByEquipId/${id}`) 
    if (code) return ElMessage.error('设备不存在')
    cacheEquip = data
    showForm.value = false
    getResource(cacheEquip.id)
    addSocketListener()
  }

  async function getInitConfig() {
    const data = getStorage<FormType>(ShOWROOM_EQUIP)
    if (!data || !data.equipId) {
      return showForm.value = true
    }
    config.value = data
    getEquip(data.equipId)
  }

  async function getResource(id: number) {
    const { code, data } = await get(`/showroom/getAll/${id}`)
    if (!code) {
      cacheResource = data
    }
    console.log('data', data)
    const resource: any = []
    activeResourceIndex.value = 0
    activeThemeIndex.value = 0
    data.forEach((item: any) => {
      const raw = JSON.parse(item.raw)
      if (cacheEquip.equipType === '多机联控') {
        const materialList = raw.materialArr as Resource[]
        resource.push(materialList)
      } else {
        const materialList = raw.materialList as Resource[]
        resource.push(materialList)
      }
    })

    if (cacheEquip.equipType === '多机联控') {
      let index: number
      resourceList.value = resource.map((item: Resource[][]) => {
        index = config.value.sortNum - 1
        if (index < 0) {
          index = 0
        } else if (index > item.length - 1) {
          index = item.length -1
        }
        return item[index]
      })
    } else {
      resourceList.value = resource
    }
    console.log(code, resourceList.value)
  }

  function useTimer() {
    // 以第一个设备为准
    if (!config.value.loop || config.value.sortNum !== 1) return;
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      let resourceIndex = 0
      let themeIndex = 0
      resourceIndex = activeResourceIndex.value + 1
      if (resourceIndex >= resourceList.value[activeThemeIndex.value].length) {
        resourceIndex = 0
        themeIndex = activeThemeIndex.value + 1
        if (themeIndex >= resourceList.value.length) {
          themeIndex = 0
          resourceIndex = 0
        } 
      }
      post('/showroom/socket/'+config.value.equipId, {
        activeThemeIndex: themeIndex,
        activeResourceIndex: resourceIndex,
        stepTime: config.value.stepTime
      })
      console.log(config.value.stepTime)
    }, config.value.stepTime * 1000);
  }
  function removeTimer() {
    if (timer) clearInterval(timer)
  }

  function addSocketListener() {
    if (socket) {
      socket.removeAllListeners()
      socket.on(config.value.equipId, (data) => {
        activeResourceIndex.value = data.activeResourceIndex
        activeThemeIndex.value = data.activeThemeIndex
        console.log('socket', data)
      })
      socket.on('refresh', () => {
        getEquip(config.value.equipId)
      })
    }
  }
  function removeAllListeners() {
    if (socket) socket.removeAllListeners()
  }
</script>

<style scoped lang="scss">
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

  .m-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      // opacity: 0; 
      transition: opacity 1.5s;

      .m-item {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        vertical-align: middle;
      }
    
    }
    .m-fade-in {
      opacity: 1;
      z-index: 10000;
    }
    .m-fade-out {
      opacity: 0;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s linear;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>