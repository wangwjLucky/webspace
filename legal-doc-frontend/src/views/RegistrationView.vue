<template>
  <div class="page-pad">
    <el-card shadow="never">
      <template #header>
        <div class="card-head">
          <div class="head-left">
            <span class="brand-mark">§</span>
            <div>
              <h2 class="card-title">案件登记</h2>
              <span class="card-sub">上传扫描件 → OCR → 编目 → 要素提取</span>
            </div>
          </div>
        </div>
      </template>
    <el-form label-position="top" v-loading="loading">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="案件类型（case_lx）">
            <el-select v-model="form.case_lx" placeholder="选择案件类型">
              <el-option v-for="c in caseConfig.case_list" :key="c.code" :label="`${c.code} ${c.name}`" :value="c.code" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="当事人（可选；留空 = 无登记模式，要素直接采纳不复核）">
        <ParticipantEditor v-model="form.participants" />
      </el-form-item>

      <el-form-item label="上传材料（zip 或多文件，jpg/png/pdf）" required>
        <el-upload
          drag multiple :auto-upload="false" :on-change="onFilesChange" :file-list="fileList" accept=".zip,.jpg,.jpeg,.png,.pdf,.tiff,.bmp">
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">拖拽文件到此处 或 <em>点击选择</em></div>
        </el-upload>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="submit" size="large">提交登记</el-button>
        <el-text class="muted" style="margin-left:12px">{{ msg }}</el-text>
      </el-form-item>
    </el-form>
  </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { api, type CaseConfig } from '../api'
import ParticipantEditor from '../components/ParticipantEditor.vue'

const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const msg = ref('')
const caseConfig = ref<CaseConfig>({ case_list: [], case_tree: {}, default_folders: {} })
const fileList = ref<UploadFile[]>([])

const form = reactive({
  case_lx: '2702',
  participants: [] as { name: string; role: string; id_card: string }[],
})

onMounted(async () => {
  try {
    const c = await api.caseConfig()
    caseConfig.value = c
  } catch (e) { ElMessage.error('加载案件配置失败') }
  loading.value = false
})

const onFilesChange = (file: UploadFile, files: UploadFile[]) => { fileList.value = files }

const submit = async () => {
  if (!fileList.value.length) { ElMessage.warning('请选择上传文件'); return }
  const meta = {
    case_lx: form.case_lx,
    participants: form.participants.filter(p => p.name),
    element_scope: null,  // 留空走该案件类型默认目录
  }
  const fd = new FormData()
  fd.append('metadata', JSON.stringify(meta))
  for (const f of fileList.value) fd.append('files', f.raw as File)
  submitting.value = true
  msg.value = '提交中...'
  try {
    const r = await api.createRegistration(fd)
    msg.value = ''
    ElMessage.success('已提交，开始处理')
    router.push(`/result/${r.registration_id}`)
  } catch (e: any) {
    msg.value = '失败：' + (e?.response?.data?.message || e.message)
  } finally { submitting.value = false }
}
</script>

<style scoped>
.card-head { display: flex; justify-content: space-between; align-items: center; }
.head-left { display: flex; align-items: center; gap: 12px; }
.brand-mark { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--gold-400); line-height: 1; text-shadow: 0 0 18px rgba(224, 180, 92, 0.3); }
.card-title { margin: 0; font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--cream-100); letter-spacing: 0.03em; }
.card-sub { font-family: var(--font-mono); font-size: 11px; color: var(--cream-400); }
</style>
