<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import CrmExample from './CrmExample.vue'
import source from './CrmExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-crm" title="CRM" :source="source">
		<CrmExample />
	</ExamplesShell>
</template>
