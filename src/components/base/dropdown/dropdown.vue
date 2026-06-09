<template>
  <div class="dd" ref="el">
    <button class="dd-trigger" @click="open = !open" :class="{ 'dd-open': open }">
      <slot name="label">{{ displayLabel }}</slot>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="dd-arrow" :class="{ open }"><path d="M4 5l3 3 3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <Teleport to="body">
      <div v-if="open" class="dd-backdrop" @click="open = false"></div>
      <div v-if="open" class="dd-popover" ref="pop" :style="popStyle">
        <div v-if="searchable" class="dd-search">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="dd-search-icon"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.3"/><path d="M9.5 9.5l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          <input ref="searchInput" type="text" v-model="query" placeholder="Search..." @keydown.escape="open=false" />
        </div>
        <div class="dd-list" :class="{ multi }">
          <div v-for="opt in filtered" :key="opt.value" class="dd-opt" :class="{ active: isActive(opt.value) }" @click="pick(opt.value)">
            <span v-if="multi" class="dd-cb" :class="{ checked: isActive(opt.value) }">
              <svg v-if="isActive(opt.value)" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <slot name="opt" :opt="opt">{{ opt.label }}</slot>
          </div>
          <div v-if="!filtered.length" class="dd-empty">No results</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: [String, Array],
  options: { type: Array, default: () => [] },
  searchable: Boolean,
  multi: Boolean,
  placeholder: { type: String, default: 'Select' },
})
const emit = defineEmits(['update:modelValue'])

const el = ref(null)
const pop = ref(null)
const searchInput = ref(null)
const open = ref(false)
const query = ref('')
const popStyle = ref({})

const displayLabel = computed(() => {
  if (props.multi) {
    const sel = Array.isArray(props.modelValue) ? props.modelValue : []
    if (!sel.length) return props.placeholder
    return sel.map(v => props.options.find(o => o.value === v)?.label || v).join(', ')
  }
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt ? opt.label : props.placeholder
})

const filtered = computed(() => {
  if (!query.value) return props.options
  const q = query.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

function isActive(val) {
  if (props.multi && Array.isArray(props.modelValue)) return props.modelValue.includes(val)
  return props.modelValue === val
}

function pick(val) {
  if (props.multi) {
    const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const idx = arr.indexOf(val)
    if (idx > -1) arr.splice(idx, 1); else arr.push(val)
    emit('update:modelValue', arr)
  } else {
    emit('update:modelValue', val)
    open.value = false
  }
}

function reposition() {
  if (!el.value || !pop.value) return
  const r = el.value.getBoundingClientRect()
  const popH = pop.value.scrollHeight
  const spaceBelow = window.innerHeight - r.bottom
  const spaceAbove = r.top
  if (spaceBelow < popH + 8 && spaceAbove > spaceBelow) {
    popStyle.value = {
      position: 'fixed',
      bottom: window.innerHeight - r.top + 4 + 'px',
      left: r.left + 'px',
      minWidth: Math.max(r.width, 200) + 'px',
    }
  } else {
    popStyle.value = {
      position: 'fixed',
      top: r.bottom + 4 + 'px',
      left: r.left + 'px',
      minWidth: Math.max(r.width, 200) + 'px',
      maxHeight: Math.min(280, spaceBelow - 8) + 'px',
    }
  }
}

watch(open, v => {
  if (v) {
    nextTick(() => { reposition(); searchInput.value?.focus(); query.value = '' })
  }
})
</script>