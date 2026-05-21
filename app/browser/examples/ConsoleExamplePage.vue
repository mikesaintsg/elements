<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import ConsoleExample from './ConsoleExample.vue'
import source from './ConsoleExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-console" title="Console" :source="source">
		<ConsoleExample />
	</ExamplesShell>
</template>
