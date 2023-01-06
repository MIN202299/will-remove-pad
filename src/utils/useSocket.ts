import { io } from 'socket.io-client'
import { socketURL } from '@/request/request'
import { ElMessage } from 'element-plus'

export const socket = io(socketURL, {
  timeout: 5000
})

export enum ActionType {
  CHANGE_MATERIAL = 'change_material',
  PLAY_OR_PAUSE = 'play_or_pause',
  TO_NEXT = 'to_next', // 下一个
  TO_LAST = 'to_last'
}

export interface ChangeImageMsg {
  buttonIndex: number,
  imageIndex: number
}

export interface PlayOrPauseMsg {
  type: 'play' | 'pause'
}


export function useSocket() {
  socket.on('connect', () => {
    console.log('socket 连接成功')
  })

  socket.on("disconnect", () => {
    socket.connect()
    console.log('socket 断开连接'); // false
  });
}


export function socketPost<T, V>(data: T, cb: (res:V) => void) {
  if (!socket?.connected) {
    socket.connect()
    setTimeout(() => {
      if (!socket?.connected) return ElMessage.error('socket 未连接')
      socket.send('message', data, cb)
    }, 1000)    
  }
}
