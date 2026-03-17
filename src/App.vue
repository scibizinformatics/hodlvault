<template>
  <router-view />
</template>

<script>
import { defineComponent } from 'vue'
import { Dark } from 'quasar'

export default defineComponent({
  name: 'App',
  mounted() {
    // Enable Dark Mode by default
    Dark.set(true)
  },
})
</script>
