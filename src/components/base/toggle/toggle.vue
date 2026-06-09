<template>
  <label class="toggle-root" :class="[sizeClass, { slim }]">
    <span class="toggle-track">
      <input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)" />
      <span class="toggle-knob"></span>
    </span>
    <span v-if="label" class="toggle-body">
      <span class="toggle-label">{{ label }}</span>
      <span v-if="hint" class="toggle-hint">{{ hint }}</span>
    </span>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  slim: Boolean,
  label: String,
  hint: String,
  size: { type: String, default: 'md' }
})

defineEmits(['update:modelValue'])

const sizeClass = computed(() => 'toggle-' + props.size)
</script>