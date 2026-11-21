/** 后端数据类型（对应 registration_service.get_registration 返回） */

// P1-2：reg_id/file_id 为 BigInteger（超 JS 安全整数），后端序列化为字符串，前端按字符串透传，禁用 Number()。

export interface SkillRunVO {
  name: string
  status: string
  error: string | null
}

export interface RegFileVO {
  file_id: string
  name: string | null
  original_name: string | null
  sort_no: number
  ocr_status: string
  target_folder: string | null
  folder_id: string | null  // P1-2：BigInt→string
  preview_url: string | null
}

export interface FolderVO {
  id: string  // P1-2：BigInt→string
  name: string
  parent_id: string  // "0" = 卷根
  volume_type: string | null  // 正卷/副卷
  folder_path: string
  sort_no: number | null
}

export interface CatalogGroup {
  document_id: string
  file_ids: string[]
  material_name: string
  target_folder: string
  material_type: string
  unfiled?: boolean
}

export interface AuditVO {
  field: string
  llm_value: unknown
  registered_value: unknown
  confidence: number | null
  span: Record<string, unknown>
  source_doc_id: string | null
  resolved_to: unknown
  verification_status: string | null
  value_validity: string | null
  reconciliation_status: string | null
  aggregation_note: string | null
}

export interface ElementVO {
  status_note: string | null
  document_flags: unknown[]
  basic_info: Record<string, unknown>
  participants_natural: Record<string, unknown>[]
  participants_legal: Record<string, unknown>[]
  agents: Record<string, unknown>[]
  audit: AuditVO[]
}

export interface SkillStepVO {
  id: string  // P1-2：BigInt→string
  step_no: number
  name: string
  kind: string
  status: string  // running|success|failed
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  started_at: string | null
  finished_at: string | null
  error: string | null
}

export interface SkillStepsGroup {
  skill: string
  items: SkillStepVO[]
}

export interface RegistrationVO {
  id: string  // P1-2：BigInt→string
  status: string
  case_lx: string
  retry_count: number
  last_error: string | null
  skills: SkillRunVO[]
  steps: SkillStepsGroup[]  // §2026-09-21 子步骤 trace
  catalog: { catalog: CatalogGroup[] }
  element: ElementVO
  files: RegFileVO[]
  folders: FolderVO[]  // §2026-09-22 卷宗目录树全节点（含空目录）
  created_time: string | null
  finish_time: number | null
}

export interface RegistrationListItem {
  id: string  // P1-2：BigInt→string
  case_lx: string
  status: string
  retry_count: number
  created_time: string | null
}

/** 分页响应（对应后端 list_registrations 的 {total,page,size,records}） */
export interface PageResult<T> {
  total: number
  page: number
  size: number
  records: T[]
}
