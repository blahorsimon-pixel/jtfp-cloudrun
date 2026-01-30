<template>
  <div class="properties-container">
    <el-card>
      <!-- 操作栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" :icon="Plus" @click="handleCreate">
            新增房源
          </el-button>
          <el-button :icon="Upload" @click="showImportDialog = true">
            批量导入
          </el-button>
          <el-button :icon="Download" @click="handleDownloadTemplate">
            下载模板
          </el-button>
          <el-button
            type="success"
            :icon="Download"
            :disabled="!selectedIds.length"
            @click="handleExport"
          >
            导出选中 ({{ selectedIds.length }})
          </el-button>
          <el-button
            type="danger"
            :icon="Delete"
            :disabled="!selectedIds.length"
            @click="handleBatchDelete"
          >
            批量删除
          </el-button>
        </div>
        
        <div class="toolbar-right">
          <el-input
            v-model="query.keyword"
            placeholder="搜索小区名称/地址/电话"
            style="width: 300px"
            :prefix-icon="Search"
            clearable
            @keyup.enter="fetchData"
            @clear="fetchData"
          />
          <el-select
            v-model="query.status"
            placeholder="上架状态"
            style="width: 120px; margin-left: 12px"
            clearable
            @change="fetchData"
          >
            <el-option label="已下架" :value="0" />
            <el-option label="已上架" :value="1" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="fetchData">
            查询
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        @selection-change="handleSelectionChange"
        max-height="calc(100vh - 320px)"
      >
        <el-table-column type="selection" width="50" fixed />
        <el-table-column prop="id" label="ID" width="70" fixed />
        <el-table-column prop="community_name" label="小区名称" width="180" fixed show-overflow-tooltip />
        <el-table-column prop="detail_address" label="详细地址" width="200" show-overflow-tooltip />
        <el-table-column prop="building_area" label="建筑面积" width="100" />
        <el-table-column prop="house_type" label="房屋户型" width="100" />
        <el-table-column prop="floor_info" label="楼层" width="100" />
        <el-table-column prop="starting_price" label="起拍价(万)" width="110" />
        <el-table-column prop="evaluation_total_price" label="评估价(万)" width="110" />
        <el-table-column prop="school_district" label="学区" width="120" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户姓名" width="100" />
        <el-table-column prop="customer_phone" label="客户电话" width="130" />
        <el-table-column prop="assigned_salesman" label="业务员" width="100" />
        <el-table-column label="上架状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '已上架' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推荐" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.is_featured === 1" type="danger" size="small">
              推荐
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="success" size="small" link @click="handleViewDetail(row)">
              查看
            </el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入" width="500px">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
      >
        <template #trigger>
          <el-button type="primary" :icon="Upload">选择Excel文件</el-button>
        </template>
        <template #tip>
          <div class="el-upload__tip">
            仅支持.xlsx或.xls格式文件，文件大小不超过10MB
          </div>
        </template>
      </el-upload>
      
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">
          确定导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Download, Delete, Search } from '@element-plus/icons-vue'
import {
  getProperties,
  deleteProperty,
  batchDeleteProperties,
  downloadTemplate,
  importExcel,
  exportProperties
} from '../api/property'
import type { Property } from '../api/property'

const router = useRouter()
const loading = ref(false)
const tableData = ref<Property[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])
const showImportDialog = ref(false)
const importing = ref(false)
const uploadFile = ref<File | null>(null)
const uploadRef = ref()

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: ''
})

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getProperties(query)
    const rows = res.list || res.properties || []
    tableData.value = rows
    total.value = res.total || 0
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (selection: Property[]) => {
  selectedIds.value = selection.map(item => item.id!).filter(id => id !== undefined)
}

const handleCreate = () => {
  router.push('/properties/create')
}

const handleEdit = (row: Property) => {
  router.push(`/properties/edit/${row.id}`)
}

const handleViewDetail = (row: Property) => {
  ElMessageBox.alert(
    `<div style="max-height: 500px; overflow-y: auto;">
      <p><b>小区名称：</b>${row.community_name}</p>
      <p><b>详细地址：</b>${row.detail_address || '-'}</p>
      <p><b>建筑面积：</b>${row.building_area || '-'}㎡</p>
      <p><b>房屋户型：</b>${row.house_type || '-'}</p>
      <p><b>楼层：</b>${row.floor_info || '-'}</p>
      <p><b>起拍价：</b>${row.starting_price || '-'}万</p>
      <p><b>评估价：</b>${row.evaluation_total_price || '-'}万</p>
      <p><b>学区：</b>${row.school_district || '-'}</p>
      <p><b>商圈：</b>${row.business_circle || '-'}</p>
      <p><b>客户姓名：</b>${row.customer_name || '-'}</p>
      <p><b>客户电话：</b>${row.customer_phone || '-'}</p>
    </div>`,
    '房源详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

const handleDelete = (row: Property) => {
  ElMessageBox.confirm(`确定要删除房源"${row.community_name}"吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteProperty(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  }).catch(() => {})
}

const handleBatchDelete = () => {
  ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条房源吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    await batchDeleteProperties(selectedIds.value)
    ElMessage.success('批量删除成功')
    selectedIds.value = []
    fetchData()
  }).catch(() => {})
}

const handleDownloadTemplate = () => {
  downloadTemplate()
  ElMessage.success('模板下载中...')
}

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
}

const handleImport = async () => {
  if (!uploadFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  importing.value = true
  try {
    const res: any = await importExcel(uploadFile.value)
    ElMessage.success(res.message || '导入成功')
    showImportDialog.value = false
    uploadFile.value = null
    uploadRef.value?.clearFiles()
    fetchData()
  } catch (error) {
    console.error('导入失败:', error)
  } finally {
    importing.value = false
  }
}

const handleExport = async () => {
  try {
    await exportProperties(selectedIds.value.length > 0 ? selectedIds.value : undefined)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.properties-container {
  height: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
