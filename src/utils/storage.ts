export function getStorage<T>(key: string): T | null {
  const data = window.localStorage.getItem(key)
  return data && JSON.parse(data)

}

export function setStorage<T>(key: string, data: T) {
  window.localStorage.setItem(key, JSON.stringify(data))
}