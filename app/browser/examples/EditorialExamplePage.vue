<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import EditorialExample from './EditorialExample.vue'
import source from './EditorialExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-editorial" title="Editorial" :source="source">
		<EditorialExample />
	</ExamplesShell>
</template>
