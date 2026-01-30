<template>
  <div class="category-list-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>分类管理</span>
          <el-button type="primary" @click="handleAdd">新增分类</el-button>
        </div>
      </template>

      <el-table :data="categories" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="sort_order" label="排序权重" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '新增分类'"
      width="500px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="分类名称" required>
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/category'
import type { Category } from '../api/category'

const categories = ref<Category[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)

const form = reactive<Category>({
  name: '',
  sort_order: 0,
  status: 1
})

const fetchCategories = async () => {
  loading.value = true
  try {
    const res: any = await getCategories()
    categories.value = res.categories || []
  } catch (error: any) {
    ElMessage.error('获取分类失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  form.id = undefined
  form.name = ''
  form.sort_order = 0
  form.status = 1
  dialogVisible.value = true
}

const handleEdit = (row: Category) => {
  isEdit.value = true
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleDelete = (row: Category) => {
  ElMessageBox.confirm(`确定要删除分类 "${row.name}" 吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await deleteCategory(row.id!)
      ElMessage.success('删除成功')
      fetchCategories()
    } catch (error: any) {
      ElMessage.error(error.response?.data?.error || '删除失败')
    }
  })
}

const handleSubmit = async () => {
  if (!form.name) {
    ElMessage.warning('请输入分类名称')
    return
  }

  submitting.value = true
  try {
    if (isEdit.value) {
      await updateCategory(form.id!, form)
      ElMessage.success('更新成功')
    } else {
      await createCategory(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchCategories()
  } catch (error: any) {
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
