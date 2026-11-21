import axios from 'axios'
import type { PageResult, RegistrationListItem } from '../types'

const http = axios.create({ baseURL: '/api/v1', timeout: 300000 })

export interface CaseConfig {
  case_list: { code: string; name: string }[]
  case_tree: Record<string, string[]>
  default_folders: Record<string, string[]>
}

/** 后端统一响应包装 ResponseData<T> → { code, message, data } */
type ApiResp<T> = { code: number; message: string; data: T }

export const api = {
  caseConfig: () =>
    http.get<ApiResp<CaseConfig>>('/case-config').then(r => r.data.data),
  createRegistration: (form: FormData) =>
    http.post<ApiResp<{ registration_id: string }>>(
      '/registration', form, { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data.data),
  // 后端返回分页对象 {total,page,size,records}
  listRegistrations: (page = 1, size = 50) =>
    http.get<ApiResp<PageResult<RegistrationListItem>>>(
      '/registration', { params: { page, size } }
    ).then(r => r.data.data),
  getRegistration: (id: string) =>
    http.get<ApiResp<any>>(`/registration/${id}`).then(r => r.data.data),  // P1-2：id 字符串透传
  retryRegistration: (id: string) =>
    http.post<ApiResp<{ registration_id: string; status: string }>>(
      `/registration/${id}/retry`
    ).then(r => r.data.data),
  controlSkill: (id: string, skill: string, action: 'pause' | 'resume' | 'retry') =>
    http.post<ApiResp<{ reg_id: string; skill: string; action: string; affected: string[] }>>(
      `/registration/${id}/skill/${skill}/${action}`
    ).then(r => r.data.data),
}
