<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="cancel">
      <div class="modal-box">
        <div class="modal-box-header">
          <h3>{{ title }}</h3>
          <button class="modal-box-close" @click="cancel"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        </div>
        <div class="modal-box-body">
          <p v-if="message" class="modal-box-message">{{ message }}</p>
          <input v-if="mode==='input'" ref="inputRef" v-model="inputValue" :placeholder="placeholder" class="modal-box-input" @keydown.enter="confirm" />
        </div>
        <div class="modal-box-footer">
          <button class="btn btn-sm btn-secondary" @click="cancel">Cancel</button>
          <button class="btn btn-sm" :class="confirmClass" @click="confirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: Boolean,
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: '' },
  mode: { type: String, default: 'confirm' },
  placeholder: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirm' },
  confirmClass: { type: String, default: 'btn-primary' },
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

const inputValue = ref('')
const inputRef = ref(null)

watch(() => props.visible, v => {
  if (v) {
    inputValue.value = ''
    nextTick(() => inputRef.value?.focus())
  }
})

function cancel() {
  emit('cancel')
  emit('update:visible', false)
}

function confirm() {
  if (props.mode === 'input' && !inputValue.value.trim()) return
  emit('confirm', props.mode === 'input' ? inputValue.value.trim() : undefined)
  emit('update:visible', false)
}
</script>
