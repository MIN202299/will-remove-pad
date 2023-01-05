import axios from 'axios'

export const baseURL = 'http://localhost:3000/'

const request =  axios.create({
  baseURL: baseURL,
  timeout: 5000
})


request.interceptors.response.use(function(response) {
  return response.data
})

export async function get(url: string, params?: any): Promise<any> {
  return await request.get(url, { params })
}

export async function post(url: string, data?: any, params?: any): Promise<any> {
  return await request({
    url,
    data,
    params,
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    } 
  })
}


export async function delReq(url: string, params?: any): Promise<any> {
  return await request.delete(url, { params })
}
