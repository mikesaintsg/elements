<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import BoardExample from './BoardExample.vue'
import source from './BoardExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-board" title="Board" :source="source">
		<BoardExample />
	</ExamplesShell>
</template>
