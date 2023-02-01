<template>
  <div v-show="!showForm" class="m-main" ref="mainRef">
    <Transition name="fade">
      <div class="m-wrapper" v-if="activeResource">
        <video v-if="activeResource.type === 'video'" :src="baseURL+activeResource.position" autoplay class="m-item"></video>
        <img v-else :src="baseURL+activeResource.position" class="m-item" alt="">
      </div>
    </Transition>
    <div class="m-bg">
      <!-- <img src="../assets/logo.png" alt=""> -->
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

    <el-form-item label="设备序号">
      <el-input-number v-model="config.sortNum" :min="1"></el-input-number>
    </el-form-item>


    <div class="m-form-footer">
      <span @click="onResetForm">取消</span>
      <span @click="onSaveForm" style="background: rgba(0,0,0, .1);">保存</span>
    </div>
  </el-form>
</template>

<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue'
  import { getStorage, setStorage } from '@/utils/storage'
  import { get, baseURL } from '@/request/request'
  import { ElMessage } from 'element-plus';

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
  const showForm = ref(false)
  const resourceList = ref<Resource[][]>([])
  const activeThemeIndex = ref(0)
  const activeResourceIndex = ref(0)
  const mainRef = ref()
  
  let cacheEquip: any
  let cacheResource: any

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

  onMounted(() => {
    getInitConfig()
    // setInterval(() => {
    //   activeResourceIndex.value++
    //   if (activeResourceIndex.value >= resourceList.value[activeThemeIndex.value].length) {
    //     activeResourceIndex.value = 0
    //     activeThemeIndex.value++
    //     if (activeThemeIndex.value >= resourceList.value.length) {
    //       activeThemeIndex.value = 0
    //       activeResourceIndex.value = 0
    //     }
    //   }
    //   console.log(activeThemeIndex.value, activeResourceIndex.value)
    // }, 3000)
    window.addEventListener('keyup', () => {
      activeResourceIndex.value++
      if (activeResourceIndex.value >= resourceList.value[activeThemeIndex.value].length) {
        activeResourceIndex.value = 0
        activeThemeIndex.value++
        if (activeThemeIndex.value >= resourceList.value.length) {
          activeThemeIndex.value = 0
          activeResourceIndex.value = 0
        }
      }
      
      console.log(activeThemeIndex.value, activeResourceIndex.value)
    })
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
  }

  async function getInitConfig() {
    const config = getStorage<FormType>(ShOWROOM_EQUIP)
    if (!config || !config.equipId) {
      return showForm.value = true
    }
    getEquip(config.equipId)
  }

  async function getResource(id: number) {
    const { code, data } = await get(`/showroom/getAll/${id}`)
    if (!code) {
      cacheResource = data
    }
    const resource: Resource[][] = []
    data.forEach((item: any) => {
      const raw = JSON.parse(item.raw)
      const materialList = raw.materialList as Resource[]
      resource.push(materialList)
    })
    resourceList.value = resource
    console.log(code, resource)
  }

</script>

<style scoped lang="scss">
.m-main {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  background-color: #fff;
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
  transition: opacity 1.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>