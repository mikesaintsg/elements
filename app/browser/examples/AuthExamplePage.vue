<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import AuthExample from './AuthExample.vue'
import source from './AuthExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-auth" title="Auth" :source="source">
		<AuthExample />
	</ExamplesShell>
</template>
